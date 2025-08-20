import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TranscriptEntry {
  index: number;
  speaker: 'prospect' | 'user';
  text: string;
  timestamp: number;
  duration: number;
  improved?: {
    text: string;
    rationale: string;
    score: number;
    techniques: string[];
  };
}

interface EnhancedTranscriptDisplayProps {
  transcript: TranscriptEntry[];
  currentTime: number;
  showDoOver: boolean;
  onJumpToTime: (time: number) => void;
  onPlayImprovement?: (text: string, speaker: string) => void;
  className?: string;
}

export const EnhancedTranscriptDisplay: React.FC<EnhancedTranscriptDisplayProps> = ({
  transcript,
  currentTime,
  showDoOver,
  onJumpToTime,
  onPlayImprovement,
  className = ''
}) => {
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEntries(newExpanded);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentEntry = (entry: TranscriptEntry) => {
    return currentTime >= entry.timestamp && currentTime < entry.timestamp + entry.duration;
  };

  return (
    <TooltipProvider>
      <div className={`space-y-3 ${className}`}>
        {transcript.map((entry) => {
          const isActive = isCurrentEntry(entry);
          const isExpanded = expandedEntries.has(entry.index);
          const hasImprovement = entry.improved && showDoOver;

          return (
            <Card 
              key={entry.index} 
              className={`p-4 transition-all duration-200 ${
                isActive ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
            >
              <div className="space-y-3">
                {/* Original Content */}
                <div className="flex items-start space-x-3">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <Badge 
                      variant={entry.speaker === 'prospect' ? 'secondary' : 'default'}
                      className="shrink-0"
                    >
                      {entry.speaker === 'prospect' ? 'Prospect said' : 'You said'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onJumpToTime(entry.timestamp)}
                      className="shrink-0 h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    >
                      {formatTime(entry.timestamp)}
                    </Button>
                    {hasImprovement && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        Score: {entry.improved!.score}/10
                      </Badge>
                    )}
                  </div>
                  
                  {hasImprovement && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(entry.index)}
                      className="shrink-0 h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>

                <div className={showDoOver && hasImprovement ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}>
                  {/* Original Text */}
                  <div className="space-y-2">
                    {showDoOver && hasImprovement && (
                      <div className="text-xs font-medium text-muted-foreground">Original</div>
                    )}
                    <p className="text-sm leading-relaxed">{entry.text}</p>
                  </div>

                  {/* Improved Version */}
                  {showDoOver && hasImprovement && entry.speaker === 'user' && (
                    <div className="space-y-2 border-l border-border pl-4 lg:pl-4 lg:border-l-0 lg:border-t lg:border-l-primary/20 lg:pt-0">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-primary">AI Would Say</div>
                        <div className="flex items-center space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <Info className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="max-w-xs">
                                <p className="font-medium">Why this is better:</p>
                                <p className="text-sm">{entry.improved!.rationale}</p>
                                {entry.improved!.techniques.length > 0 && (
                                  <div className="mt-2">
                                    <p className="font-medium">Techniques used:</p>
                                    <ul className="text-sm list-disc list-inside">
                                      {entry.improved!.techniques.map((technique, i) => (
                                        <li key={i}>{technique}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          
                          {onPlayImprovement && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPlayImprovement(entry.improved!.text, 'user')}
                              className="h-6 w-6 p-0"
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-primary/90">
                        {entry.improved!.text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && hasImprovement && entry.speaker === 'user' && (
                  <div className="pt-3 border-t border-border space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">Improvement Details</div>
                    <p className="text-sm text-muted-foreground">{entry.improved!.rationale}</p>
                    {entry.improved!.techniques.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.improved!.techniques.map((technique, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {technique}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
};