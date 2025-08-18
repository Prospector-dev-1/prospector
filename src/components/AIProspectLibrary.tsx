import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Plus, Edit, Trash2, Star, Lock, Globe, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import CustomProspectBuilder from './CustomProspectBuilder';

interface AIProspectLibraryProps {
  onProspectSelect?: (prospect: any) => void;
  selectedProspectId?: string;
}

const AIProspectLibrary: React.FC<AIProspectLibraryProps> = ({
  onProspectSelect,
  selectedProspectId
}) => {
  const { toast } = useToast();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPersonality, setFilterPersonality] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [activeTab, setActiveTab] = useState('public');

  useEffect(() => {
    loadProspects();
  }, [activeTab]);

  const loadProspects = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('ai_prospect_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeTab === 'public') {
        query = query.eq('is_public', true);
      } else {
        query = query.eq('is_public', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProspects(data || []);
    } catch (error) {
      console.error('Error loading prospects:', error);
      toast({
        title: "Error",
        description: "Failed to load AI prospects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (prospectId: string) => {
    if (!confirm('Are you sure you want to delete this AI prospect?')) return;

    try {
      const { error } = await supabase
        .from('ai_prospect_profiles')
        .delete()
        .eq('id', prospectId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI prospect deleted successfully"
      });

      loadProspects();
    } catch (error) {
      console.error('Error deleting prospect:', error);
      toast({
        title: "Error",
        description: "Failed to delete AI prospect",
        variant: "destructive"
      });
    }
  };

  const filteredProspects = prospects.filter(prospect => {
    const matchesSearch = prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prospect.base_personality.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPersonality = filterPersonality === 'all' || prospect.base_personality === filterPersonality;
    const matchesDifficulty = filterDifficulty === 'all' || prospect.difficulty_level.toString() === filterDifficulty;
    
    return matchesSearch && matchesPersonality && matchesDifficulty;
  });

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'bg-success/10 text-success border-success/20';
    if (level <= 3) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  const getPersonalityColor = (personality: string) => {
    const colors = {
      skeptical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      enthusiastic: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      professional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      aggressive: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      analytical: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    return colors[personality] || colors.professional;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Prospect Library</h2>
        <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Custom Prospect
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <CustomProspectBuilder
              editingProspect={editingProspect}
              onProspectCreated={(prospect) => {
                setShowBuilder(false);
                setEditingProspect(null);
                loadProspects();
                onProspectSelect?.(prospect);
              }}
              onClose={() => {
                setShowBuilder(false);
                setEditingProspect(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="public" className="gap-2">
            <Globe className="h-4 w-4" />
            Public Library
          </TabsTrigger>
          <TabsTrigger value="private" className="gap-2">
            <Lock className="h-4 w-4" />
            My Prospects
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search prospects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-48">
              <Label>Personality</Label>
              <Select value={filterPersonality} onValueChange={setFilterPersonality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Personalities</SelectItem>
                  <SelectItem value="skeptical">Skeptical</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="analytical">Analytical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-32">
              <Label>Difficulty</Label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                  <SelectItem value="4">Level 4</SelectItem>
                  <SelectItem value="5">Level 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Prospects Grid */}
          {loading ? (
            <div className="text-center py-8">Loading prospects...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProspects.map((prospect) => (
                <Card 
                  key={prospect.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedProspectId === prospect.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onProspectSelect?.(prospect)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{prospect.name}</CardTitle>
                        <div className="flex gap-2">
                          <Badge className={getPersonalityColor(prospect.base_personality)}>
                            {prospect.base_personality}
                          </Badge>
                          <Badge className={getDifficultyColor(prospect.difficulty_level)}>
                            Level {prospect.difficulty_level}
                          </Badge>
                        </div>
                      </div>
                      
                      {activeTab === 'private' && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProspect(prospect);
                              setShowBuilder(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(prospect.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {prospect.industry_context && (
                      <div className="text-sm text-muted-foreground">
                        Industry: {prospect.industry_context}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <strong>Traits:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(prospect.personality_traits || {}).slice(0, 3).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <strong>Objections:</strong> {prospect.objection_patterns?.length || 0}
                      </div>
                      
                      <div className="text-sm">
                        <strong>Buying Signals:</strong> {prospect.buying_signals?.length || 0}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{prospect.is_public ? 'Public' : 'Private'}</span>
                      {selectedProspectId === prospect.id && (
                        <Badge variant="default" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredProspects.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No prospects found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterPersonality !== 'all' || filterDifficulty !== 'all'
                  ? 'Try adjusting your filters'
                  : activeTab === 'private'
                  ? 'Create your first custom AI prospect'
                  : 'No public prospects available'}
              </p>
              {activeTab === 'private' && (
                <Button onClick={() => setShowBuilder(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Custom Prospect
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIProspectLibrary;