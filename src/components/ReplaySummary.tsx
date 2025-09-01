import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { 
  ChevronDown, 
  ChevronUp, 
  Target, 
  User, 
  Lightbulb,
  RefreshCw
} from 'lucide-react';

interface ReplaySummaryProps {
  originalMoment: any;
  replayMode: string;
  prospectPersonality: string;
  gamificationMode: string;
}

const ReplaySummary: React.FC<ReplaySummaryProps> = ({
  originalMoment,
  replayMode,
  prospectPersonality,
  gamificationMode
}) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('replay-summary-expanded');
    return saved ? JSON.parse(saved) : true;
  });

  const { buttonFeedback } = useHapticFeedback();

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('replay-summary-expanded', JSON.stringify(newState));
    buttonFeedback();
  };

  const getModeColor = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'practice': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'challenge': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'mastery': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPersonalityColor = (personality: string) => {
    switch (personality.toLowerCase()) {
      case 'professional': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'aggressive': return 'bg-red-500/10 text-red-600 border-red-200';
      case 'friendly': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'skeptical': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="px-4 pb-2">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="glass-card border">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              onClick={toggleExpanded}
              className="w-full p-4 h-auto justify-between hover:bg-transparent"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 shrink-0">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Replaying
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate text-left">
                    {originalMoment?.moment_label || 'Practice Moment'}
                  </h3>
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="pb-4 px-4">
            <div className="space-y-4">
              {/* Mode and Personality Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={getModeColor(replayMode)} variant="outline">
                  <Target className="h-3 w-3 mr-1" />
                  {replayMode}
                </Badge>
                <Badge className={getPersonalityColor(prospectPersonality)} variant="outline">
                  <User className="h-3 w-3 mr-1" />
                  {prospectPersonality}
                </Badge>
              </div>

              {/* Scenario Description */}
              {originalMoment?.scenario && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Scenario</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                    {originalMoment.scenario}
                  </p>
                </div>
              )}

              {/* Coaching Tip */}
              {originalMoment?.coaching_tip && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Focus</span>
                  </div>
                  <div className="pl-6">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <p className="text-sm text-foreground leading-relaxed">
                        {originalMoment.coaching_tip}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default ReplaySummary;