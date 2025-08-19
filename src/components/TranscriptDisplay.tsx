import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface TranscriptBuffer {
  text: string;
  isFinal: boolean;
  speaker: 'user' | 'prospect';
  source: string;
  hash: string;
}

interface FinalChunk {
  id: string;
  text: string;
  speaker: 'user' | 'prospect';
  timestamp: number;
  source: string;
  hash: string;
}

interface TranscriptDisplayProps {
  finalChunks: FinalChunk[];
  liveBuffer: TranscriptBuffer[];
  finalTranscript?: string;
  showLive?: boolean;
  className?: string;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  finalChunks,
  liveBuffer,
  finalTranscript,
  showLive = true,
  className = ""
}) => {
  // If we have a final transcript, show only that (post-call view)
  if (finalTranscript && finalTranscript.trim()) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Call Transcript</CardTitle>
          <CardDescription>
            Complete conversation from your practice session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {finalTranscript}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Live view during call - show final chunks + latest interim
  const allEntries: Array<{ text: string; speaker: 'user' | 'prospect'; timestamp: number; isInterim?: boolean }> = [];
  
  // Add final chunks
  finalChunks.forEach(chunk => {
    allEntries.push({
      text: chunk.text,
      speaker: chunk.speaker,
      timestamp: chunk.timestamp,
      isInterim: false
    });
  });

  // Add latest interim for each speaker (if showLive)
  if (showLive) {
    const latestInterims = new Map<string, TranscriptBuffer>();
    liveBuffer.forEach(buffer => {
      if (!buffer.isFinal) {
        const key = `${buffer.speaker}-${buffer.source}`;
        latestInterims.set(key, buffer);
      }
    });

    latestInterims.forEach(buffer => {
      allEntries.push({
        text: buffer.text,
        speaker: buffer.speaker,
        timestamp: Date.now(),
        isInterim: true
      });
    });
  }

  // Sort by timestamp
  allEntries.sort((a, b) => a.timestamp - b.timestamp);

  if (allEntries.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Live Transcript</CardTitle>
          <CardDescription>
            Conversation will appear here as you speak
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-6 rounded-lg text-center">
            <p className="text-muted-foreground">
              Waiting for conversation to begin...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Live Transcript</CardTitle>
        <CardDescription>
          Real-time conversation transcript
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto space-y-3">
          {allEntries.map((entry, index) => (
            <div
              key={`${entry.timestamp}-${index}`}
              className={`p-3 rounded-lg ${
                entry.speaker === 'prospect' 
                  ? 'bg-green-50 border-l-4 border-green-500 dark:bg-green-900/20 dark:border-green-400' 
                  : 'bg-blue-50 border-l-4 border-blue-500 dark:bg-blue-900/20 dark:border-blue-400'
              } ${entry.isInterim ? 'opacity-75' : ''}`}
            >
              <div className="flex items-start gap-2">
                <span className={`font-bold text-sm ${
                  entry.speaker === 'prospect' 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {entry.speaker === 'prospect' ? 'Prospect said:' : 'You said:'}
                </span>
                {entry.isInterim && (
                  <span className="text-xs text-muted-foreground italic">
                    (interim)
                  </span>
                )}
              </div>
              <p className={`text-sm mt-1 leading-relaxed ${
                entry.isInterim ? 'italic' : ''
              }`}>
                {entry.text}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};