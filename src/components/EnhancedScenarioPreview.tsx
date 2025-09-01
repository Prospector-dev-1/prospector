import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Target, User, Building2, Star, TrendingUp } from 'lucide-react';

interface ScenarioPreviewProps {
  businessType?: string;
  prospectRole?: string;
  callObjective?: string;
  customObjective?: string;
  difficultyLevel: number;
  estimatedDuration?: string;
}

const EnhancedScenarioPreview: React.FC<ScenarioPreviewProps> = ({
  businessType,
  prospectRole,
  callObjective,
  customObjective,
  difficultyLevel,
  estimatedDuration
}) => {
  const getDifficultyColor = (level: number) => {
    if (level <= 3) return 'bg-green-500';
    if (level <= 5) return 'bg-yellow-500';
    if (level <= 7) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 3) return 'Beginner';
    if (level <= 5) return 'Intermediate';
    if (level <= 7) return 'Advanced';
    return 'Expert';
  };

  const getProspectPersonality = (level: number) => {
    if (level <= 3) return { mood: '😊', attitude: 'Friendly and receptive' };
    if (level <= 5) return { mood: '🤔', attitude: 'Professional but busy' };
    if (level <= 7) return { mood: '😐', attitude: 'Skeptical and questioning' };
    return { mood: '😤', attitude: 'Hostile and resistant' };
  };

  const getEstimatedDuration = () => {
    if (estimatedDuration) return estimatedDuration;
    if (difficultyLevel <= 3) return '2-4 min';
    if (difficultyLevel <= 5) return '3-5 min';
    if (difficultyLevel <= 7) return '4-7 min';
    return '5-10 min';
  };

  const getSkillsPracticed = () => {
    const skills = ['Phone Presence', 'Opening Scripts'];
    
    if (difficultyLevel > 3) skills.push('Objection Handling');
    if (difficultyLevel > 5) skills.push('Persistence');
    if (difficultyLevel > 7) skills.push('De-escalation');
    
    if (callObjective) {
      if (callObjective.includes('Demo') || callObjective.includes('Meeting')) {
        skills.push('Scheduling');
      }
      if (callObjective.includes('Interest') || callObjective.includes('Qualify')) {
        skills.push('Qualifying');
      }
    }
    
    return skills.slice(0, 4); // Limit to 4 skills
  };

  const prospect = getProspectPersonality(difficultyLevel);
  const finalObjective = callObjective === 'Custom' ? customObjective : callObjective;

  // Show preview if any field is filled or difficulty is not default
  const shouldShowPreview = businessType || prospectRole || callObjective || difficultyLevel !== 5;

  if (!shouldShowPreview) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardContent className="p-8 text-center">
          <div className="space-y-2">
            <Target className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <h4 className="text-lg font-medium text-muted-foreground">Scenario Preview</h4>
            <p className="text-sm text-muted-foreground">
              Your practice session details will appear here as you customize your call
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent"></div>
      
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Star className="h-5 w-5" />
          Practice Session Preview
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6 relative">
        {/* AI Prospect Avatar */}
        <div className="flex items-center gap-4 p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-primary/20">
          <Avatar className="h-12 w-12 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {prospect.mood}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">Your AI Prospect</h4>
            <p className="text-sm text-muted-foreground">{prospect.attitude}</p>
            {(businessType || prospectRole) && (
              <div className="flex items-center gap-2 mt-1">
                {prospectRole && (
                  <Badge variant="outline" className="text-xs">
                    {prospectRole}
                  </Badge>
                )}
                {businessType && (
                  <Badge variant="outline" className="text-xs">
                    {businessType}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <Badge className={`${getDifficultyColor(difficultyLevel)} text-white border-0`}>
            {getDifficultyLabel(difficultyLevel)}
          </Badge>
        </div>

        {/* Call Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{getEstimatedDuration()}</span>
            </div>
            
            {finalObjective && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Goal:</span>
                <span className="font-medium text-primary">{finalObjective}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Level:</span>
            <span className="font-medium">{difficultyLevel}/10</span>
          </div>
        </div>

        {/* Skills Section */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-foreground">What You'll Practice</h5>
          <div className="flex flex-wrap gap-2">
            {getSkillsPracticed().map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Quick Tip */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <p className="text-sm text-primary font-medium mb-1">💡 Pro Tip</p>
          <p className="text-xs text-muted-foreground">
            {difficultyLevel <= 3 
              ? "Focus on building rapport and asking open-ended questions."
              : difficultyLevel <= 5
              ? "Practice active listening and address objections calmly."
              : difficultyLevel <= 7
              ? "Stay persistent but respectful. Don't take rejections personally."
              : "Master de-escalation techniques and find common ground quickly."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedScenarioPreview;