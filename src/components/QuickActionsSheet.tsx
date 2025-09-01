import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Phone, Upload, FileText, Sparkles, History, Trophy, TrendingUp, RotateCcw } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  variant: 'primary' | 'secondary' | 'upload' | 'progress' | 'challenges';
}

const quickActions: QuickAction[] = [
  {
    id: 'new-call',
    title: 'Start Practice Call',
    description: 'Begin a new AI training session',
    icon: Phone,
    path: '/call-simulation',
    variant: 'primary',
  },
  {
    id: 'upload-call',
    title: 'Upload Recording',
    description: 'Analyze your real calls',
    icon: Upload,
    path: '/call-upload',
    variant: 'upload',
  },
  {
    id: 'script-analysis',
    title: 'Script Analysis',
    description: 'Get AI feedback on scripts',
    icon: FileText,
    path: '/script-analysis',
    variant: 'progress',
  },
  {
    id: 'custom-script',
    title: 'Generate Script',
    description: 'Create personalized scripts',
    icon: Sparkles,
    path: '/custom-script',
    variant: 'challenges',
  },
  {
    id: 'call-history',
    title: 'Call History',
    description: 'Review past sessions',
    icon: History,
    path: '/progress',
    variant: 'secondary',
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    description: 'View rankings',
    icon: Trophy,
    path: '/leaderboard',
    variant: 'secondary',
  },
];

interface QuickActionsSheetProps {
  children: React.ReactNode;
  lastCallId?: string;
}

const QuickActionsSheet: React.FC<QuickActionsSheetProps> = ({ 
  children, 
  lastCallId 
}) => {
  const navigate = useNavigate();
  const { buttonFeedback } = useHapticFeedback();

  const handleAction = (path: string) => {
    buttonFeedback();
    navigate(path);
  };

  const handleRetryLastCall = () => {
    if (lastCallId) {
      buttonFeedback();
      navigate(`/call-results/${lastCallId}`);
    }
  };

  const getVariantClasses = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'gradient-primary text-primary-foreground';
      case 'upload':
        return 'gradient-upload text-white';
      case 'progress':
        return 'gradient-progress text-white';
      case 'challenges':
        return 'gradient-challenges text-white';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="max-h-[80vh] rounded-t-2xl border-0 glass-card"
      >
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-xl">Quick Actions</SheetTitle>
          <SheetDescription>
            Choose what you'd like to do next
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Retry Last Call (if available) */}
          {lastCallId && (
            <div className="pb-2 border-b border-border/50">
              <Button
                onClick={handleRetryLastCall}
                variant="outline"
                className="w-full justify-start h-12 gap-3"
              >
                <RotateCcw className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Retry Last Call</p>
                  <p className="text-xs text-muted-foreground">Review your previous session</p>
                </div>
              </Button>
            </div>
          )}

          {/* Main Actions Grid */}
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  onClick={() => handleAction(action.path)}
                  variant="outline"
                  className={cn(
                    "h-20 flex-col gap-2 border-2 hover:scale-105 transition-all duration-200",
                    "hover:border-primary/50 group"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    getVariantClasses(action.variant),
                    "group-hover:scale-110 transition-transform duration-200"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium leading-tight">{action.title}</p>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Secondary Actions */}
          <div className="pt-2 space-y-2">
            <Button
              onClick={() => handleAction('/progress')}
              variant="ghost"
              className="w-full justify-start gap-3 h-10"
            >
              <TrendingUp className="h-4 w-4" />
              View Detailed Progress
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickActionsSheet;