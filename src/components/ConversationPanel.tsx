import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Phone, PhoneOff, MessageSquare, TrendingUp, Target, Clock, Zap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ConversationState } from '@/hooks/useRealtimeAIChat';
interface ConversationPanelProps {
  conversationState: ConversationState;
  selectedMoment: any;
  onStartConversation: () => void;
  onEndConversation: () => void;
  disabled?: boolean;
}
const ConversationPanel: React.FC<ConversationPanelProps> = ({
  conversationState,
  selectedMoment,
  onStartConversation,
  onEndConversation,
  disabled = false
}) => {
  const isMobile = useIsMobile();
  const {
    isActive,
    isConnecting,
    exchangeCount,
    currentScore
  } = conversationState;
  const getExchangeProgress = () => {
    const maxExchanges = 3;
    return Math.min(exchangeCount / maxExchanges * 100, 100);
  };
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-primary';
    return 'text-warning';
  };
  if (!selectedMoment) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI Conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a moment from Practice Moments to begin AI Replay mode</p>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          AI Conversation Practice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Moment Info */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <Badge variant="secondary" className="capitalize">
              {selectedMoment.type}
            </Badge>
            {selectedMoment.difficulty && <Badge variant="outline" className="capitalize">
                {selectedMoment.difficulty}
              </Badge>}
          </div>
          <h4 className="font-semibold mb-2">{selectedMoment.label}</h4>
          <p className="text-sm text-muted-foreground mb-3">{selectedMoment.summary}</p>
          
          {selectedMoment.coaching_tip && <div className="p-3 bg-primary/10 rounded-md">
              <p className="text-sm font-medium text-primary">Coaching Context:</p>
              <p className="text-sm text-primary/80">{selectedMoment.coaching_tip}</p>
            </div>}
        </div>

        {/* Instructions */}
        {!isActive && !isConnecting && <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary mb-1">Real-time AI Practice</p>
                <p className="text-primary/80 text-xs leading-relaxed">
                  Have a live conversation with our AI prospect. Get real-time coaching hints 
                  and handle multiple objections to improve your skills.
                </p>
              </div>
            </div>
          </div>}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isActive && !isConnecting ? <Button onClick={onStartConversation} disabled={disabled} className="w-full" size={isMobile ? "lg" : "default"}>
              <Phone className="h-4 w-4 mr-2" />
              Start AI Conversation
            </Button> : <div className="space-y-2">
              {isConnecting && <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="h-2 w-2 bg-current rounded-full animate-pulse" />
                  Connecting to AI prospect...
                </div>}
              
              {isActive && <>
                  <div className="flex items-center justify-center gap-2 text-success">
                    <div className="h-3 w-3 bg-current rounded-full animate-pulse" />
                    Live conversation with AI prospect
                  </div>
                  
                  <Button variant="destructive" onClick={onEndConversation} className="w-full" size={isMobile ? "lg" : "default"}>
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Conversation
                  </Button>
                </>}
            </div>}
        </div>

        {/* Conversation Status */}
        {(isActive || isConnecting) && <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conversation Progress</span>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isConnecting ? 'Connecting...' : isActive ? 'Active' : 'Ended'}
              </Badge>
            </div>
            
            <Progress value={getExchangeProgress()} className="w-full" />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Exchange {exchangeCount}/3
              </span>
              {currentScore !== null && <span className={`font-medium ${getScoreColor(currentScore)}`}>
                  Score: {currentScore}/100
                </span>}
            </div>
          </div>}

        {/* Final Score Display */}
        {currentScore !== null && !isActive && !isConnecting}
      </CardContent>
    </Card>;
};
export default ConversationPanel;