import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Target, User2, FileText, Timer, ChevronDown } from 'lucide-react';

interface BusinessType {
  id: string;
  name: string;
  category: string;
  typical_roles: string[];
  common_pain_points: string[];
}

interface CallObjective {
  id: string;
  name: string;
  description: string;
  scoring_categories: any;
}

interface CallCustomizationProps {
  businessType: string;
  setBusinessType: (value: string) => void;
  prospectRole: string;
  setProspectRole: (value: string) => void;
  callObjective: string;
  setCallObjective: (value: string) => void;
  customObjective: string;
  setCustomObjective: (value: string) => void;
  customInstructions: string;
  setCustomInstructions: (value: string) => void;
  difficultyLevel: number[];
  setDifficultyLevel: (value: number[]) => void;
  preferredVoice: string;
  setPreferredVoice: (value: string) => void;
}

const CallCustomization: React.FC<CallCustomizationProps> = ({
  businessType,
  setBusinessType,
  prospectRole,
  setProspectRole,
  callObjective,
  setCallObjective,
  customObjective,
  setCustomObjective,
  customInstructions,
  setCustomInstructions,
  difficultyLevel,
  setDifficultyLevel,
  preferredVoice,
  setPreferredVoice,
}) => {
  const [callObjectives, setCallObjectives] = useState<CallObjective[]>([]);
  const [selectedObjectiveData, setSelectedObjectiveData] = useState<CallObjective | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCallObjectives();
  }, []);

  useEffect(() => {
    if (callObjective === 'Custom') {
      setSelectedObjectiveData(null);
    } else if (callObjective) {
      const objectiveData = callObjectives.find(co => co.name === callObjective);
      setSelectedObjectiveData(objectiveData || null);
    }
  }, [callObjective, callObjectives]);


  const fetchCallObjectives = async () => {
    try {
      const { data, error } = await supabase
        .from('call_objectives')
        .select('*')
        .order('name');

      if (error) throw error;
      setCallObjectives(data || []);
    } catch (error) {
      console.error('Error fetching call objectives:', error);
      toast({
        title: "Error",
        description: "Failed to load call objectives",
        variant: "destructive",
      });
    }
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return "Very Easy";
    if (level <= 4) return "Easy";
    if (level <= 6) return "Medium";
    if (level <= 8) return "Hard";
    return "Expert";
  };

  const getDifficultyColor = (level: number) => {
    if (level <= 2) return "bg-green-500";
    if (level <= 4) return "bg-yellow-500";
    if (level <= 6) return "bg-orange-500";
    if (level <= 8) return "bg-red-500";
    return "bg-purple-500";
  };

  return (
    <div className="space-y-6">
      {/* Advanced Customization - Collapsible */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium">Advanced Customization</div>
                  <Badge variant="outline" className="text-xs">
                    Optional
                  </Badge>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Customize business type, prospect role, call objective, and scenario details
              </p>
            </CardContent>
          </Card>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 mt-4">
          {/* Business Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Business Type</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="business-type">What type of business is your prospect?</Label>
                <Input
                  id="business-type"
                  placeholder="e.g., Plumber, Restaurant Owner, Tech Startup, Healthcare Clinic..."
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Be specific about the industry or business type to get realistic scenarios.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Prospect Role Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User2 className="h-5 w-5" />
                <span>Prospect Role</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="prospect-role">Who will you be speaking with?</Label>
                <Input
                  id="prospect-role"
                  placeholder="e.g., Owner, Manager, Director, CEO, Operations Manager..."
                  value={prospectRole}
                  onChange={(e) => setProspectRole(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Specify the decision-maker's role or title you'll be calling.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Call Objective Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Call Objective</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="call-objective">What's your goal for this call?</Label>
                <Select value={callObjective} onValueChange={setCallObjective}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select objective..." />
                  </SelectTrigger>
                  <SelectContent>
                    {callObjectives.map((objective) => (
                      <SelectItem key={objective.id} value={objective.name}>
                        <div>
                          <div className="font-medium">{objective.name}</div>
                          <div className="text-xs text-muted-foreground">{objective.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="Custom">
                      <div>
                        <div className="font-medium">Custom</div>
                        <div className="text-xs text-muted-foreground">Define your own call objective</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {callObjective === 'Custom' && (
                <div>
                  <Label htmlFor="custom-objective">Custom Objective</Label>
                  <Input
                    id="custom-objective"
                    placeholder="e.g., Schedule a product demo, Get budget information, Qualify lead..."
                    value={customObjective}
                    onChange={(e) => setCustomObjective(e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}

              {selectedObjectiveData && (
                <div className="bg-muted p-3 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">You'll be graded on:</h4>
                  <div className="space-y-1">
                    {selectedObjectiveData.scoring_categories && Object.entries(selectedObjectiveData.scoring_categories as Record<string, any>).map(([key, category]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span>{category.description}</span>
                        <span className="text-muted-foreground">{category.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Voice Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Voice Selection</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="preferred-voice">AI Prospect Voice</Label>
                <Select value={preferredVoice} onValueChange={setPreferredVoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-select based on difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto-select</SelectItem>
                    <SelectItem value="alloy">Alloy (Neutral, versatile)</SelectItem>
                    <SelectItem value="echo">Echo (Male, confident)</SelectItem>
                    <SelectItem value="fable">Fable (British, warm)</SelectItem>
                    <SelectItem value="nova">Nova (Female, energetic)</SelectItem>
                    <SelectItem value="onyx">Onyx (Male, deep)</SelectItem>
                    <SelectItem value="shimmer">Shimmer (Female, soft)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Leave as auto-select to let the system choose the best voice for the difficulty level.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Custom Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Custom Instructions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="custom-instructions">Additional scenario customization (optional)</Label>
                <Textarea
                  id="custom-instructions"
                  placeholder="e.g., 'Make them skeptical of new contractors', 'They just had a bad experience with a similar service', 'They're comparing multiple vendors'..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Customize the prospect's attitude, recent experiences, or specific challenges to make the scenario more realistic.
                </p>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Difficulty Level - Now Below Advanced Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Difficulty Level</span>
          </CardTitle>
          <p className="text-muted-foreground">
            Select how challenging you want your prospect to be
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Difficulty: {difficultyLevel[0]}/10</span>
              <Badge className={getDifficultyColor(difficultyLevel[0])}>
                {getDifficultyLabel(difficultyLevel[0])}
              </Badge>
            </div>
            <Slider
              value={difficultyLevel}
              onValueChange={setDifficultyLevel}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-muted-foreground">
              <div>
                <p className="font-medium">Level 1-3: Beginner</p>
                <p>Friendly prospects, minimal objections</p>
              </div>
              <div>
                <p className="font-medium">Level 4-6: Intermediate</p>
                <p>Standard objections, moderate resistance</p>
              </div>
              <div>
                <p className="font-medium">Level 7-8: Advanced</p>
                <p>Skeptical prospects, strong objections</p>
              </div>
              <div>
                <p className="font-medium">Level 9-10: Expert</p>
                <p>Hostile prospects, maximum difficulty</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallCustomization;