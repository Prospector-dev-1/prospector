/**
 * Replay Player - Simple audio playback without Krisp/microphone processing
 * Decoupled from live call audio chain to avoid WASM conflicts
 */

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { audioLogger, AUDIO_PHASES } from '@/utils/audioLogger';

interface ReplayPlayerProps {
  src: string;
  onError?: (error: Error) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  className?: string;
}

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  src,
  onError,
  onEnded,
  autoPlay = false,
  className = '',
}) => {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audioLogger.info(AUDIO_PHASES.REPLAY, 'Initializing replay player', { src });

    // Event handlers
    const handleLoadStart = () => {
      audioLogger.info(AUDIO_PHASES.REPLAY, 'Load started');
      setIsLoading(true);
      setError(null);
    };

    const handleCanPlayThrough = () => {
      audioLogger.info(AUDIO_PHASES.REPLAY, 'Can play through', { duration: audio.duration });
      setIsLoading(false);
      setDuration(audio.duration);
      
      // Try autoplay if enabled
      if (autoPlay) {
        audio.play().catch((err) => {
          audioLogger.warn(AUDIO_PHASES.REPLAY, 'Autoplay blocked', { error: err.message });
          toast({
            title: 'Tap Play to Start',
            description: 'Your browser blocked autoplay. Click the play button to begin.',
          });
        });
      }
    };

    const handlePlay = () => {
      audioLogger.info(AUDIO_PHASES.REPLAY, 'Playback started');
      setIsPlaying(true);
    };

    const handlePause = () => {
      audioLogger.info(AUDIO_PHASES.REPLAY, 'Playback paused');
      setIsPlaying(false);
    };

    const handleEnded = () => {
      audioLogger.info(AUDIO_PHASES.REPLAY, 'Playback ended');
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleError = (e: Event) => {
      const errorMsg = 'Failed to load audio file';
      audioLogger.error(AUDIO_PHASES.REPLAY, 'Audio error', { error: errorMsg });
      setError(errorMsg);
      setIsLoading(false);
      
      const error = new Error(errorMsg);
      onError?.(error);
      
      toast({
        title: 'Playback Error',
        description: 'Failed to load the audio file. Please try again.',
        variant: 'destructive',
      });
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);

    // Set volume
    audio.volume = volume;

    // Cleanup
    return () => {
      audioLogger.info(AUDIO_PHASES.REPLAY, 'Cleaning up replay player');
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
    };
  }, [src, autoPlay, volume, onError, onEnded, toast]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (err) {
      audioLogger.error(AUDIO_PHASES.REPLAY, 'Play/pause failed', { error: (err as Error).message });
      toast({
        title: 'Playback Error',
        description: 'Failed to control playback. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audioLogger.info(AUDIO_PHASES.REPLAY, 'Restarting playback');
    audio.currentTime = 0;
    if (isPlaying) {
      audio.play().catch((err) => {
        audioLogger.error(AUDIO_PHASES.REPLAY, 'Restart play failed', { error: (err as Error).message });
      });
    }
  };

  const handleSeek = (progress: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const newTime = (progress / 100) * duration;
    audioLogger.info(AUDIO_PHASES.REPLAY, 'Seeking', { from: currentTime, to: newTime });
    audio.currentTime = newTime;
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Failed to load audio file</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {/* Hidden audio element - no Krisp processing */}
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          style={{ display: 'none' }}
        />

        {/* Loading state */}
        {isLoading && (
          <div className="text-center text-muted-foreground">
            <Volume2 className="h-12 w-12 mx-auto mb-4 animate-pulse" />
            <p>Loading audio...</p>
          </div>
        )}

        {/* Player controls */}
        {!isLoading && (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <Progress value={progressPercentage} className="w-full" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={handleRestart}
                variant="outline"
                size="sm"
                disabled={!duration}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={handlePlayPause}
                variant="default"
                size="lg"
                disabled={!duration}
                className="px-8"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReplayPlayer;