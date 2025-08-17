import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Target, User2, FileText } from 'lucide-react';

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
  customInstructions: string;
  setCustomInstructions: (value: string) => void;
}

const CallCustomization: React.FC<CallCustomizationProps> = ({
  businessType,
  setBusinessType,
  prospectRole,
  setProspectRole,
  callObjective,
  setCallObjective,
  customInstructions,
  setCustomInstructions,
}) => {
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [callObjectives, setCallObjectives] = useState<CallObjective[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedBusinessData, setSelectedBusinessData] = useState<BusinessType | null>(null);
  const [selectedObjectiveData, setSelectedObjectiveData] = useState<CallObjective | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBusinessTypes();
    fetchCallObjectives();
  }, []);

  useEffect(() => {
    if (businessType) {
      const businessData = businessTypes.find(bt => bt.name === businessType);
      setSelectedBusinessData(businessData || null);
      setAvailableRoles(businessData?.typical_roles || []);
      
      // Reset prospect role if it's not available for the new business type
      if (businessData && !businessData.typical_roles.includes(prospectRole)) {
        setProspectRole('');
      }
    }
  }, [businessType, businessTypes, prospectRole, setProspectRole]);

  useEffect(() => {
    if (callObjective) {
      const objectiveData = callObjectives.find(co => co.name === callObjective);
      setSelectedObjectiveData(objectiveData || null);
    }
  }, [callObjective, callObjectives]);

  const fetchBusinessTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('business_types')
        .select('*')
        .order('category, name');

      if (error) throw error;
      setBusinessTypes(data || []);
    } catch (error) {
      console.error('Error fetching business types:', error);
      toast({
        title: "Error",
        description: "Failed to load business types",
        variant: "destructive",
      });
    }
  };

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

  const groupedBusinessTypes = businessTypes.reduce((acc, bt) => {
    if (!acc[bt.category]) {
      acc[bt.category] = [];
    }
    acc[bt.category].push(bt);
    return acc;
  }, {} as Record<string, BusinessType[]>);

  return (
    <div className="space-y-6">
      {/* Business Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Business Type</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="business-type">What type of business is your prospect?</Label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger>
                <SelectValue placeholder="Select business type..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedBusinessTypes).map(([category, types]) => (
                  <div key={category}>
                    <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                      {category}
                    </div>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBusinessData && (
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Common Pain Points:</h4>
              <div className="flex flex-wrap gap-1">
                {selectedBusinessData.common_pain_points.map((point, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          )}
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
            <Select value={prospectRole} onValueChange={setProspectRole} disabled={!businessType}>
              <SelectTrigger>
                <SelectValue placeholder={businessType ? "Select role..." : "Select business type first"} />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              </SelectContent>
            </Select>
          </div>

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
    </div>
  );
};

export default CallCustomization;