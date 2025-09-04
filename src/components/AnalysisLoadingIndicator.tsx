import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Brain, MessageSquare, Target } from 'lucide-react';

interface AnalysisLoadingIndicatorProps {
  status: 'analyzing' | 'parsing' | 'finalizing';
  progress?: number;
  duration?: number;
  exchangeCount?: number;
}

const AnalysisLoadingIndicator: React.FC<AnalysisLoadingIndicatorProps> = ({
  status,
  progress = 0,
  duration = 0,
  exchangeCount = 0
}) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'analyzing':
        return {
          icon: Brain,
          title: 'Analyzing Conversation',
          description: 'AI is reviewing your sales performance...',
          color: 'text-primary'
        };
      case 'parsing':
        return {
          icon: MessageSquare,
          title: 'Processing Feedback',
          description: 'Generating detailed insights and recommendations...',
          color: 'text-warning'
        };
      case 'finalizing':
        return {
          icon: Target,
          title: 'Finalizing Report',
          description: 'Preparing your personalized analysis...',
          color: 'text-success'
        };
      default:
        return {
          icon: RefreshCw,
          title: 'Processing',
          description: 'Please wait...',
          color: 'text-muted-foreground'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardContent className="p-6">
        <div className="text-center space-y-6">
          {/* Status Icon */}
          <div className="relative">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <StatusIcon className={`h-8 w-8 ${statusInfo.color} ${status === 'analyzing' ? 'animate-pulse' : ''}`} />
            </div>
            {status === 'analyzing' && (
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            )}
          </div>

          {/* Status Text */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{statusInfo.title}</h3>
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          </div>

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{progress}% complete</p>
            </div>
          )}

          {/* Session Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm font-medium">{formatDuration(duration)}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">{exchangeCount}</div>
              <div className="text-xs text-muted-foreground">Exchanges</div>
            </div>
          </div>

          {/* Quality Indicators */}
          <div className="flex justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              AI Analysis
            </Badge>
            <Badge variant="outline" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Voice Processing
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisLoadingIndicator;