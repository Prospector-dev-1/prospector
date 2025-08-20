import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReplayControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onSpeedChange: (speed: number) => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
  disabled?: boolean;
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackSpeed,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onSpeedChange,
  onSkipBack,
  onSkipForward,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeekChange = (value: number[]) => {
    const newTime = value[0];
    setDragTime(newTime);
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleSeekCommit = (value: number[]) => {
    onSeek(value[0]);
    setIsDragging(false);
  };

  const displayTime = isDragging ? dragTime : currentTime;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      {/* Timeline Scrubber */}
      <div className="space-y-2">
        <Slider
          value={[displayTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSeekChange}
          onValueCommit={handleSeekCommit}
          disabled={disabled || duration === 0}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatTime(displayTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onSkipBack}
          disabled={disabled}
          className="h-10 w-10"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          onClick={isPlaying ? onPause : onPlay}
          disabled={disabled}
          className="h-12 w-12"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onSkipForward}
          disabled={disabled}
          className="h-10 w-10"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Speed and Volume Controls */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Speed:</span>
          <Select
            value={playbackSpeed.toString()}
            onValueChange={(value) => onSpeedChange(parseFloat(value))}
            disabled={disabled}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5x</SelectItem>
              <SelectItem value="0.75">0.75x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="1.25">1.25x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={(value) => onVolumeChange(value[0] / 100)}
            disabled={disabled}
            className="w-20"
          />
        </div>
      </div>
    </div>
  );
};