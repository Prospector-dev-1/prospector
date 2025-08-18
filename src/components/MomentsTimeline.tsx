import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Moment = {
  id: string;
  type: string; // e.g., objection, pricing, opening, closing, discovery
  label: string;
  start_char: number;
  end_char: number;
  summary: string;
  full_text?: string;
  coaching_tip?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
};

interface MomentsTimelineProps {
  moments: Moment[];
  selectedMomentId?: string | null;
  onSelectMoment?: (id: string) => void;
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

const MomentsTimeline: React.FC<MomentsTimelineProps> = ({ moments, selectedMomentId, onSelectMoment }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!moments?.length) return null;

  const handleCardClick = (momentId: string) => {
    setExpandedId(expandedId === momentId ? null : momentId);
  };

  const handleSelectMoment = (momentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectMoment?.(momentId);
  };

  const handleCollapse = (momentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(null);
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {moments.map((m) => {
          const isExpanded = expandedId === m.id;
          const isSelected = selectedMomentId === m.id;
          
          return (
            <Collapsible key={m.id} open={isExpanded}>
              <Card
                className={cn(
                  'border transition-colors',
                  isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                )}
              >
                <CollapsibleTrigger 
                  className="w-full text-left"
                  onClick={() => handleCardClick(m.id)}
                >
                  <div className="px-4 py-3">
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
                      <div className="flex items-center gap-2">
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
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="animate-accordion-down">
                  <div className="px-4 pb-4 border-t bg-muted/20">
                    <div className="pt-4">
                      <h4 className="font-medium text-sm text-foreground mb-2">Full Conversation:</h4>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4 max-h-40 overflow-y-auto">
                        {m.full_text || m.summary}
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => handleCollapse(m.id, e)}
                        >
                          Collapse
                        </Button>
                        <Button 
                          size="sm"
                          onClick={(e) => handleSelectMoment(m.id, e)}
                          className={cn(
                            isSelected 
                              ? "bg-green-600 hover:bg-green-700 text-white" 
                              : "bg-primary hover:bg-primary/90"
                          )}
                        >
                          {isSelected ? "Moment Selected" : "Select This Moment"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default MomentsTimeline;
