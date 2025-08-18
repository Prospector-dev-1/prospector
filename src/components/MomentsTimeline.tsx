import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type Moment = {
  id: string;
  type: string; // e.g., objection, pricing, opening, closing, discovery
  label: string;
  start_char: number;
  end_char: number;
  summary: string;
  coaching_tip?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
};

interface MomentsTimelineProps {
  moments: Moment[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const difficultyColors: Record<NonNullable<Moment['difficulty']>, string> = {
  easy: 'bg-green-500',
  medium: 'bg-yellow-500',
  hard: 'bg-red-500',
};

const typeColors: Record<string, string> = {
  objection: 'bg-primary/10 text-primary',
  pricing: 'bg-secondary/10 text-secondary-foreground',
  opening: 'bg-muted text-muted-foreground',
  closing: 'bg-accent/10 text-accent-foreground',
  discovery: 'bg-muted text-muted-foreground',
  other: 'bg-muted text-muted-foreground',
};

const MomentsTimeline: React.FC<MomentsTimelineProps> = ({ moments, selectedId, onSelect }) => {
  if (!moments?.length) return null;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {moments.map((m) => (
          <Card
            key={m.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(m.id)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect?.(m.id)}
            className={cn(
              'px-4 py-3 border transition-colors cursor-pointer',
              selectedId === m.id ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={cn('capitalize', typeColors[m.type] || 'bg-muted')}>
                    {m.type}
                  </Badge>
                  {m.difficulty && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <span className={cn('inline-block h-2 w-2 rounded-full', difficultyColors[m.difficulty])} />
                      {m.difficulty}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Chars {m.start_char}–{m.end_char}
                  </span>
                </div>
                <div className="mt-1 font-medium truncate">{m.label}</div>
                <div className="text-sm text-muted-foreground truncate">{m.summary}</div>
              </div>
              {m.coaching_tip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="whitespace-nowrap">
                      Tip
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs leading-snug">
                    {m.coaching_tip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default MomentsTimeline;
