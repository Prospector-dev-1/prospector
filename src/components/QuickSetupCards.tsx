import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, Target, Users, FileText, Calendar } from 'lucide-react';

interface PresetScenario {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  difficulty: number;
  duration: string;
  businessType: string;
  prospectRole: string;
  callObjective: string;
  tags: string[];
  color: string;
}

interface QuickSetupCardsProps {
  onSelectPreset: (preset: PresetScenario) => void;
  selectedPreset?: string;
}

const presetScenarios: PresetScenario[] = [
  {
    id: 'cold-outreach',
    title: 'Cold Outreach',
    description: 'First contact with a potential prospect',
    icon: Phone,
    difficulty: 4,
    duration: '3-5 min',
    businessType: 'Local Service Business',
    prospectRole: 'Business Owner',
    callObjective: 'Introduction and Interest',
    tags: ['Beginner Friendly', 'Common'],
    color: 'from-blue-500/20 to-blue-600/20'
  },
  {
    id: 'objection-handling',
    title: 'Objection Handling',
    description: 'Practice overcoming common objections',
    icon: Users,
    difficulty: 7,
    duration: '5-8 min',
    businessType: 'Professional Services',
    prospectRole: 'CEO',
    callObjective: 'Overcome Objections',
    tags: ['Advanced', 'Challenging'],
    color: 'from-red-500/20 to-red-600/20'
  },
  {
    id: 'follow-up',
    title: 'Follow-up Call',
    description: 'Re-engage a previous lead or contact',
    icon: Calendar,
    difficulty: 3,
    duration: '2-4 min',
    businessType: 'Small Business',
    prospectRole: 'Manager',
    callObjective: 'Schedule Meeting',
    tags: ['Easy', 'Warm Lead'],
    color: 'from-green-500/20 to-green-600/20'
  },
  {
    id: 'demo-scheduling',
    title: 'Demo Scheduling',
    description: 'Schedule a product demonstration',
    icon: Target,
    difficulty: 5,
    duration: '4-6 min',
    businessType: 'Tech Company',
    prospectRole: 'Director',
    callObjective: 'Schedule Demo',
    tags: ['Intermediate', 'B2B'],
    color: 'from-purple-500/20 to-purple-600/20'
  }
];

const QuickSetupCards: React.FC<QuickSetupCardsProps> = ({
  onSelectPreset,
  selectedPreset
}) => {
  const getDifficultyColor = (level: number) => {
    if (level <= 3) return 'bg-green-500';
    if (level <= 5) return 'bg-yellow-500';
    if (level <= 7) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 3) return 'Easy';
    if (level <= 5) return 'Medium';
    if (level <= 7) return 'Hard';
    return 'Expert';
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Quick Start Scenarios</h3>
        <p className="text-sm text-muted-foreground">Choose a preset scenario to get started quickly</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {presetScenarios.map((preset) => {
          const Icon = preset.icon;
          const isSelected = selectedPreset === preset.id;
          
          return (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-elevated hover:scale-[1.02] border-2 ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-glow' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onSelectPreset(preset)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${preset.color}`}>
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="text-right">
                      <Badge 
                        className={`${getDifficultyColor(preset.difficulty)} text-white border-0 text-xs`}
                      >
                        {getDifficultyLabel(preset.difficulty)}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{preset.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{preset.description}</p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {preset.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Level {preset.difficulty}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex gap-1 flex-wrap">
                      {preset.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export { QuickSetupCards, type PresetScenario };