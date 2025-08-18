import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, User, Brain, Target, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ObjectionPattern {
  type: string;
  intensity: 'low' | 'medium' | 'high';
  triggers: string[];
}

interface BuyingSignal {
  signal: string;
  probability: number;
}

interface CustomProspectBuilderProps {
  onProspectCreated?: (prospect: any) => void;
  editingProspect?: any;
  onClose?: () => void;
}

const CustomProspectBuilder: React.FC<CustomProspectBuilderProps> = ({
  onProspectCreated,
  editingProspect,
  onClose
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [basePersonality, setBasePersonality] = useState('professional');
  const [industryContext, setIndustryContext] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState([3]);
  const [isPublic, setIsPublic] = useState(false);
  
  // Personality traits
  const [trustLevel, setTrustLevel] = useState('medium');
  const [decisionSpeed, setDecisionSpeed] = useState('medium');
  const [priceSensitivity, setPriceSensitivity] = useState('medium');
  const [formality, setFormality] = useState('medium');
  const [directness, setDirectness] = useState('medium');
  const [technicalDepth, setTechnicalDepth] = useState('medium');
  
  // Objection patterns
  const [objectionPatterns, setObjectionPatterns] = useState<ObjectionPattern[]>([
    { type: 'budget', intensity: 'medium', triggers: ['price', 'cost'] }
  ]);
  
  // Buying signals
  const [buyingSignals, setBuyingSignals] = useState<BuyingSignal[]>([
    { signal: 'asking_detailed_questions', probability: 0.7 }
  ]);

  useEffect(() => {
    if (editingProspect) {
      setName(editingProspect.name);
      setBasePersonality(editingProspect.base_personality);
      setIndustryContext(editingProspect.industry_context || '');
      setDifficultyLevel([editingProspect.difficulty_level]);
      setIsPublic(editingProspect.is_public);
      
      const traits = editingProspect.personality_traits || {};
      setTrustLevel(traits.trust_level || 'medium');
      setDecisionSpeed(traits.decision_speed || 'medium');
      setPriceSensitivity(traits.price_sensitivity || 'medium');
      setFormality(traits.formality || 'medium');
      setDirectness(traits.directness || 'medium');
      setTechnicalDepth(traits.technical_depth || 'medium');
      
      setObjectionPatterns(editingProspect.objection_patterns || []);
      setBuyingSignals(editingProspect.buying_signals || []);
    }
  }, [editingProspect]);

  const addObjectionPattern = () => {
    setObjectionPatterns([
      ...objectionPatterns,
      { type: '', intensity: 'medium', triggers: [] }
    ]);
  };

  const updateObjectionPattern = (index: number, field: string, value: any) => {
    const updated = [...objectionPatterns];
    if (field === 'triggers') {
      updated[index][field] = value.split(',').map((t: string) => t.trim()).filter(Boolean);
    } else {
      updated[index][field] = value;
    }
    setObjectionPatterns(updated);
  };

  const removeObjectionPattern = (index: number) => {
    setObjectionPatterns(objectionPatterns.filter((_, i) => i !== index));
  };

  const addBuyingSignal = () => {
    setBuyingSignals([
      ...buyingSignals,
      { signal: '', probability: 0.5 }
    ]);
  };

  const updateBuyingSignal = (index: number, field: string, value: any) => {
    const updated = [...buyingSignals];
    updated[index][field] = value;
    setBuyingSignals(updated);
  };

  const removeBuyingSignal = (index: number) => {
    setBuyingSignals(buyingSignals.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the prospect",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const prospectData = {
        name: name.trim(),
        base_personality: basePersonality,
        personality_traits: {
          trust_level: trustLevel,
          decision_speed: decisionSpeed,
          price_sensitivity: priceSensitivity,
          formality,
          directness,
          technical_depth: technicalDepth
        },
        objection_patterns: objectionPatterns.filter(p => p.type) as any,
        buying_signals: buyingSignals.filter(s => s.signal) as any,
        conversation_style: {
          formality,
          directness,
          technical_depth: technicalDepth
        },
        difficulty_level: difficultyLevel[0],
        industry_context: industryContext.trim() || null,
        is_public: isPublic
      };

      let result;
      if (editingProspect) {
        result = await supabase
          .from('ai_prospect_profiles')
          .update(prospectData)
          .eq('id', editingProspect.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('ai_prospect_profiles')
          .insert(prospectData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `AI prospect ${editingProspect ? 'updated' : 'created'} successfully`
      });

      onProspectCreated?.(result.data);
      onClose?.();
    } catch (error) {
      console.error('Error saving prospect:', error);
      toast({
        title: "Error",
        description: "Failed to save AI prospect",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>
              {editingProspect ? 'Edit AI Prospect' : 'Create Custom AI Prospect'}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Prospect'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="gap-2">
              <User className="h-4 w-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="personality" className="gap-2">
              <Brain className="h-4 w-4" />
              Personality
            </TabsTrigger>
            <TabsTrigger value="objections" className="gap-2">
              <Target className="h-4 w-4" />
              Objections
            </TabsTrigger>
            <TabsTrigger value="signals" className="gap-2">
              <Settings className="h-4 w-4" />
              Buying Signals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Prospect Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., The Skeptical CFO"
                />
              </div>

              <div className="space-y-2">
                <Label>Base Personality</Label>
                <Select value={basePersonality} onValueChange={setBasePersonality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skeptical">Skeptical</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                    <SelectItem value="analytical">Analytical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry Context</Label>
                <Input
                  id="industry"
                  value={industryContext}
                  onChange={(e) => setIndustryContext(e.target.value)}
                  placeholder="e.g., finance, technology, healthcare"
                />
              </div>

              <div className="space-y-2">
                <Label>Difficulty Level: {difficultyLevel[0]}/5</Label>
                <Slider
                  value={difficultyLevel}
                  onValueChange={setDifficultyLevel}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="public">Make this prospect public (others can use it)</Label>
            </div>
          </TabsContent>

          <TabsContent value="personality" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Trust Level</Label>
                <Select value={trustLevel} onValueChange={setTrustLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Very suspicious</SelectItem>
                    <SelectItem value="medium">Medium - Cautiously optimistic</SelectItem>
                    <SelectItem value="high">High - Generally trusting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Decision Speed</Label>
                <Select value={decisionSpeed} onValueChange={setDecisionSpeed}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow - Deliberates extensively</SelectItem>
                    <SelectItem value="medium">Medium - Takes reasonable time</SelectItem>
                    <SelectItem value="fast">Fast - Decides quickly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Price Sensitivity</Label>
                <Select value={priceSensitivity} onValueChange={setPriceSensitivity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Budget is flexible</SelectItem>
                    <SelectItem value="medium">Medium - Price conscious</SelectItem>
                    <SelectItem value="high">High - Very budget-focused</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Communication Formality</Label>
                <Select value={formality} onValueChange={setFormality}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Casual and friendly</SelectItem>
                    <SelectItem value="medium">Medium - Professional</SelectItem>
                    <SelectItem value="high">High - Very formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Directness</Label>
                <Select value={directness} onValueChange={setDirectness}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Diplomatic and indirect</SelectItem>
                    <SelectItem value="medium">Medium - Balanced approach</SelectItem>
                    <SelectItem value="high">High - Very direct and blunt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Technical Depth</Label>
                <Select value={technicalDepth} onValueChange={setTechnicalDepth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Prefers simple explanations</SelectItem>
                    <SelectItem value="medium">Medium - Some technical detail</SelectItem>
                    <SelectItem value="high">High - Wants deep technical info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="objections" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium">Objection Patterns</h4>
              <Button onClick={addObjectionPattern} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Objection
              </Button>
            </div>

            {objectionPatterns.map((pattern, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-3">
                    <Label>Objection Type</Label>
                    <Input
                      value={pattern.type}
                      onChange={(e) => updateObjectionPattern(index, 'type', e.target.value)}
                      placeholder="e.g., budget, timing, authority"
                    />
                  </div>
                  
                  <div className="col-span-3">
                    <Label>Intensity</Label>
                    <Select
                      value={pattern.intensity}
                      onValueChange={(value) => updateObjectionPattern(index, 'intensity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-5">
                    <Label>Trigger Words (comma separated)</Label>
                    <Input
                      value={pattern.triggers.join(', ')}
                      onChange={(e) => updateObjectionPattern(index, 'triggers', e.target.value)}
                      placeholder="e.g., price, cost, expensive"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeObjectionPattern(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="signals" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium">Buying Signals</h4>
              <Button onClick={addBuyingSignal} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Signal
              </Button>
            </div>

            {buyingSignals.map((signal, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-7">
                    <Label>Buying Signal</Label>
                    <Input
                      value={signal.signal}
                      onChange={(e) => updateBuyingSignal(index, 'signal', e.target.value)}
                      placeholder="e.g., asking_for_references, timeline_questions"
                    />
                  </div>
                  
                  <div className="col-span-4">
                    <Label>Probability: {(signal.probability * 100).toFixed(0)}%</Label>
                    <Slider
                      value={[signal.probability]}
                      onValueChange={(value) => updateBuyingSignal(index, 'probability', value[0])}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeBuyingSignal(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CustomProspectBuilder;