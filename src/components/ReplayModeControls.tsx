import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  RotateCcw, 
  TrendingUp, 
  Zap, 
  Target, 
  Brain, 
  Shield,
  Users,
  Clock,
  DollarSign,
  MessageSquare,
  Trophy,
  Timer,
  Star,
  Crosshair
} from 'lucide-react';
import type { ReplayMode, ProspectPersonality, GamificationMode } from '@/hooks/useRealtimeAIChat';

interface ReplayModeControlsProps {
  replayMode: ReplayMode;
  setReplayMode: (mode: ReplayMode) => void;
  prospectPersonality: ProspectPersonality;
  setProspectPersonality: (personality: ProspectPersonality) => void;
  gamificationMode: GamificationMode;
  setGamificationMode: (mode: GamificationMode) => void;
  disabled?: boolean;
}

const replayModeOptions = [
  { 
    value: 'detailed' as ReplayMode, 
    label: 'Detailed Analysis', 
    description: 'Deep dive into conversation dynamics',
    icon: RotateCcw,
    color: 'text-muted-foreground'
  },
  { 
    value: 'quick' as ReplayMode, 
    label: 'Quick Practice', 
    description: 'Fast-paced conversation practice',
    icon: TrendingUp,
    color: 'text-primary'
  },
  { 
    value: 'focused' as ReplayMode, 
    label: 'Focused Training', 
    description: 'Target specific skill areas',
    icon: Target,
    color: 'text-success'
  }
];

const personalityOptions = [
  { 
    value: 'professional' as ProspectPersonality, 
    label: 'Professional', 
    description: 'Courteous, business-focused',
    icon: Users,
    color: 'text-primary'
  },
  { 
    value: 'skeptical' as ProspectPersonality, 
    label: 'Skeptical', 
    description: 'Resistant, needs convincing',
    icon: Shield,
    color: 'text-muted-foreground'
  },
  { 
    value: 'aggressive' as ProspectPersonality, 
    label: 'Aggressive', 
    description: 'Challenges everything',
    icon: Brain,
    color: 'text-destructive'
  },
  { 
    value: 'enthusiastic' as ProspectPersonality, 
    label: 'Enthusiastic', 
    description: 'Excited but easily distracted',
    icon: MessageSquare,
    color: 'text-warning'
  },
  { 
    value: 'analytical' as ProspectPersonality, 
    label: 'Analytical', 
    description: 'Data-driven, detail-oriented',
    icon: DollarSign,
    color: 'text-info'
  }
];

const gamificationOptions = [
  { 
    value: 'none' as GamificationMode, 
    label: 'Standard Mode', 
    description: 'Normal practice, no special rules',
    icon: Target,
    color: 'text-muted-foreground'
  },
  { 
    value: 'speed' as GamificationMode, 
    label: 'Speed Challenge', 
    description: 'Fast responses required',
    icon: Timer,
    color: 'text-warning'
  },
  { 
    value: 'difficulty' as GamificationMode, 
    label: 'Difficulty Mode', 
    description: 'Extra challenging objections',
    icon: Star,
    color: 'text-success'
  },
  { 
    value: 'empathy' as GamificationMode, 
    label: 'Empathy Focus', 
    description: 'Emotional intelligence testing',
    icon: Shield,
    color: 'text-info'
  }
];

const ReplayModeControls: React.FC<ReplayModeControlsProps> = ({
  replayMode,
  setReplayMode,
  prospectPersonality,
  setProspectPersonality,
  gamificationMode,
  setGamificationMode,
  disabled = false
}) => {
  const isMobile = useIsMobile();

  const getSelectedOption = (value: string, options: any[]) => 
    options.find(option => option.value === value);

  const renderSelect = (
    label: string,
    value: string,
    options: any[],
    onChange: (value: any) => void,
    placeholder: string
  ) => {
    const selectedOption = getSelectedOption(value, options);
    
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className={`w-full ${isMobile ? 'h-12' : 'h-10'}`}>
            <SelectValue placeholder={placeholder}>
              {selectedOption && (
                <div className="flex items-center gap-2">
                  <selectedOption.icon className={`h-4 w-4 ${selectedOption.color}`} />
                  <span className="truncate">{selectedOption.label}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-start gap-3 py-1">
                  <option.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${option.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {option.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const getModeCombinationInfo = () => {
    const isExpertMode = replayMode === 'focused' && 
                        (prospectPersonality === 'aggressive' || prospectPersonality === 'skeptical') &&
                        (gamificationMode === 'difficulty' || gamificationMode === 'empathy');

    const isChallengingMode = replayMode !== 'detailed' && 
                             prospectPersonality !== 'professional' && 
                             gamificationMode !== 'none';

    if (isExpertMode) {
      return {
        level: 'Expert',
        color: 'bg-destructive/10 text-destructive border-destructive/20',
        description: 'Maximum difficulty - prepare for intense practice!'
      };
    } else if (isChallengingMode) {
      return {
        level: 'Advanced',
        color: 'bg-warning/10 text-warning border-warning/20',
        description: 'Challenging combination - stay focused!'
      };
    } else {
      return {
        level: 'Standard',
        color: 'bg-muted/50 text-muted-foreground border-border',
        description: 'Good practice level for skill building'
      };
    }
  };

  const combinationInfo = getModeCombinationInfo();

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">AI Replay Configuration</h3>
          <Badge className={combinationInfo.color}>
            {combinationInfo.level} Mode
          </Badge>
        </div>

        {/* Mobile: Stacked layout, Desktop: Grid layout */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {renderSelect(
            'Replay Mode',
            replayMode,
            replayModeOptions,
            setReplayMode,
            'Select replay mode'
          )}
          
          {renderSelect(
            'AI Personality',
            prospectPersonality,
            personalityOptions,
            setProspectPersonality,
            'Select AI personality'
          )}
          
          {renderSelect(
            'Challenge Mode',
            gamificationMode,
            gamificationOptions,
            setGamificationMode,
            'Select challenge mode'
          )}
        </div>

        {/* Mode Combination Info */}
        <div className={`p-3 rounded-lg border ${combinationInfo.color}`}>
          <p className="text-sm">{combinationInfo.description}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReplayModeControls;