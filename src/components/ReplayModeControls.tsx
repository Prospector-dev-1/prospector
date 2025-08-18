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
    value: 'exact' as ReplayMode, 
    label: 'Exact Replay', 
    description: 'AI uses same objection as original call',
    icon: RotateCcw,
    color: 'text-muted-foreground'
  },
  { 
    value: 'variation' as ReplayMode, 
    label: 'Variation Practice', 
    description: 'Similar objections with different wording',
    icon: TrendingUp,
    color: 'text-primary'
  },
  { 
    value: 'escalation' as ReplayMode, 
    label: 'Escalation Mode', 
    description: 'AI becomes more challenging and pushes back',
    icon: Zap,
    color: 'text-warning'
  },
  { 
    value: 'chain' as ReplayMode, 
    label: 'Chain Practice', 
    description: 'Extended conversation beyond original moment',
    icon: Target,
    color: 'text-success'
  }
];

const personalityOptions = [
  { 
    value: 'professional' as ProspectPersonality, 
    label: 'Professional & Polite', 
    description: 'Courteous, business-focused',
    icon: Users,
    color: 'text-primary'
  },
  { 
    value: 'skeptical' as ProspectPersonality, 
    label: 'Skeptical & Cautious', 
    description: 'Resistant, needs convincing',
    icon: Shield,
    color: 'text-muted-foreground'
  },
  { 
    value: 'aggressive' as ProspectPersonality, 
    label: 'Aggressive & Pushy', 
    description: 'Interrupts, challenges everything',
    icon: Brain,
    color: 'text-destructive'
  },
  { 
    value: 'indecisive' as ProspectPersonality, 
    label: 'Indecisive & Confused', 
    description: 'Many questions, seems overwhelmed',
    icon: MessageSquare,
    color: 'text-warning'
  },
  { 
    value: 'budget-conscious' as ProspectPersonality, 
    label: 'Budget-Conscious', 
    description: 'Price-focused, cost concerns',
    icon: DollarSign,
    color: 'text-info'
  },
  { 
    value: 'time-pressed' as ProspectPersonality, 
    label: 'Time-Pressed', 
    description: 'Wants quick decisions, impatient',
    icon: Clock,
    color: 'text-secondary-foreground'
  }
];

const gamificationOptions = [
  { 
    value: 'practice' as GamificationMode, 
    label: 'Practice Mode', 
    description: 'Standard practice, no pressure',
    icon: Target,
    color: 'text-muted-foreground'
  },
  { 
    value: 'speed-challenge' as GamificationMode, 
    label: 'Speed Challenge', 
    description: 'Handle objection within time limit',
    icon: Timer,
    color: 'text-warning'
  },
  { 
    value: 'streak-builder' as GamificationMode, 
    label: 'Streak Builder', 
    description: 'Build consecutive successful responses',
    icon: Star,
    color: 'text-success'
  },
  { 
    value: 'perfect-score' as GamificationMode, 
    label: 'Perfect Score Hunt', 
    description: 'Must achieve 90+ score',
    icon: Trophy,
    color: 'text-primary'
  },
  { 
    value: 'objection-master' as GamificationMode, 
    label: 'Objection Master', 
    description: 'Handle 3 objection variations',
    icon: Shield,
    color: 'text-info'
  },
  { 
    value: 'closing-champion' as GamificationMode, 
    label: 'Closing Champion', 
    description: 'Focus on closing with bonus points',
    icon: Crosshair,
    color: 'text-success'
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
    const isExpertMode = replayMode === 'escalation' && 
                        (prospectPersonality === 'aggressive' || prospectPersonality === 'skeptical') &&
                        (gamificationMode === 'perfect-score' || gamificationMode === 'closing-champion');

    const isChallengingMode = replayMode !== 'exact' && 
                             prospectPersonality !== 'professional' && 
                             gamificationMode !== 'practice';

    if (isExpertMode) {
      return {
        level: 'Expert',
        color: 'bg-destructive/10 text-destructive border-destructive/20',
        description: 'Maximum difficulty - prepare for intense pushback!'
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