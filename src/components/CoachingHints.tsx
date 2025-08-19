import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Info, X, Shield, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoachingHint {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'objection' | 'technique';
  timestamp: number;
  objectionType?: string;
  technique?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface CoachingHintsProps {
  hints: CoachingHint[];
  onClearHints?: () => void;
}

const CoachingHints: React.FC<CoachingHintsProps> = ({ hints, onClearHints }) => {
  if (hints.length === 0) return null;

  const getHintIcon = (type: CoachingHint['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'objection':
        return <Shield className="h-4 w-4" />;
      case 'technique':
        return <Target className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  const getHintStyles = (type: CoachingHint['type'], priority?: string) => {
    const baseClasses = priority === 'high' ? 'ring-2 ring-primary/50' : '';
    
    switch (type) {
      case 'success':
        return `bg-success/10 text-success border-success/20 ${baseClasses}`;
      case 'warning':
        return `bg-warning/10 text-warning border-warning/20 ${baseClasses}`;
      case 'objection':
        return `bg-destructive/10 text-destructive border-destructive/20 ${baseClasses}`;
      case 'technique':
        return `bg-primary/10 text-primary border-primary/20 ${baseClasses}`;
      case 'info':
        return `bg-info/10 text-info border-info/20 ${baseClasses}`;
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] space-y-2">
      {hints.map((hint, index) => (
        <Card
          key={hint.id}
          className={cn(
            'p-3 border shadow-lg animate-in slide-in-from-right-full duration-300',
            getHintStyles(hint.type, hint.priority)
          )}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <div className="flex items-start gap-2">
            {getHintIcon(hint.type)}
            <div className="flex-1 min-w-0">
              {hint.objectionType && (
                <Badge variant="outline" className="text-xs mb-1 capitalize">
                  {hint.objectionType} objection
                </Badge>
              )}
              {hint.technique && !hint.objectionType && (
                <Badge variant="outline" className="text-xs mb-1">
                  {hint.technique}
                </Badge>
              )}
              <p className="text-sm font-medium leading-relaxed">
                {hint.message}
              </p>
            </div>
          </div>
        </Card>
      ))}

      {hints.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearHints}
            className="text-xs opacity-70 hover:opacity-100"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};

export default CoachingHints;