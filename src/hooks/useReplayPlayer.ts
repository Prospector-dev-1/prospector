import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AudioSegment {
  speaker: 'prospect' | 'user';
  text: string;
  timestamp: number;
  duration: number;
  audioUrl?: string;
}

interface ReplayPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
  isLoading: boolean;
  audioSegments: AudioSegment[];
}

export const useReplayPlayer = (callId: string) => {
  const { toast } = useToast();
  const [state, setState] = useState<ReplayPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackSpeed: 1,
    isLoading: false,
    audioSegments: []
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSegmentRef = useRef<number>(-1);

  const initializeAudio = useCallback(async () => {
    if (!callId) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Get call replay data
      const { data: replay, error: replayError } = await supabase
        .from('call_replays')
        .select('*')
        .eq('call_id', callId)
        .maybeSingle();

      if (replayError) {
        throw new Error('Failed to load replay data');
      }

      let audioSegments: AudioSegment[] = [];

      if (replay?.per_utterance_timestamps) {
        audioSegments = (replay.per_utterance_timestamps as unknown) as AudioSegment[];
      } else {
        // Create replay if it doesn't exist
        const { data: replayData, error: createError } = await supabase.functions.invoke(
          'create-call-replay',
          { body: { callId, replayType: 'playback' } }
        );

        if (createError) {
          throw new Error('Failed to create replay');
        }

        audioSegments = replayData.timestampedTranscript || [];
      }

      const totalDuration = audioSegments.reduce((acc, segment) => 
        Math.max(acc, segment.timestamp + segment.duration), 0
      );

      setState(prev => ({
        ...prev,
        audioSegments,
        duration: totalDuration,
        isLoading: false
      }));

    } catch (error) {
      console.error('Error initializing replay player:', error);
      toast({
        title: "Error",
        description: "Failed to load replay data",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [callId, toast]);

  const getCurrentSegment = useCallback((time: number): AudioSegment | null => {
    return state.audioSegments.find(segment => 
      time >= segment.timestamp && time < segment.timestamp + segment.duration
    ) || null;
  }, [state.audioSegments]);

  const playAudioSegment = useCallback(async (segment: AudioSegment) => {
    if (!segment.audioUrl) {
      // Try to synthesize audio if it doesn't exist
      try {
        const { data, error } = await supabase.functions.invoke('synthesize-replay-audio', {
          body: {
            transcript: segment.text,
            speaker: segment.speaker,
            voiceId: segment.speaker === 'prospect' ? 'alloy' : 'nova'
          }
        });

        if (error) throw error;

        // Create blob URL from base64 audio data
        const audioBlob = new Blob([
          Uint8Array.from(atob(data.audioData), c => c.charCodeAt(0))
        ], { type: 'audio/mp3' });
        
        segment.audioUrl = URL.createObjectURL(audioBlob);
      } catch (error) {
        console.error('Error synthesizing audio:', error);
        return;
      }
    }

    if (audioRef.current && segment.audioUrl) {
      audioRef.current.src = segment.audioUrl;
      audioRef.current.playbackRate = state.playbackSpeed;
      audioRef.current.volume = state.volume;
      
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  }, [state.playbackSpeed, state.volume]);

  const updateCurrentTime = useCallback(() => {
    if (!state.isPlaying) return;

    const newTime = state.currentTime + 0.1;
    const currentSegment = getCurrentSegment(newTime);
    
    if (currentSegment) {
      const segmentIndex = state.audioSegments.indexOf(currentSegment);
      if (segmentIndex !== currentSegmentRef.current) {
        currentSegmentRef.current = segmentIndex;
        playAudioSegment(currentSegment);
      }
    }

    setState(prev => ({
      ...prev,
      currentTime: Math.min(newTime, prev.duration)
    }));

    if (newTime >= state.duration) {
      pause();
    }
  }, [state.isPlaying, state.currentTime, state.duration, getCurrentSegment, state.audioSegments, playAudioSegment]);

  const play = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
    
    if (!intervalRef.current) {
      intervalRef.current = setInterval(updateCurrentTime, 100);
    }
  }, [updateCurrentTime]);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    setState(prev => ({ ...prev, currentTime: Math.max(0, Math.min(time, prev.duration)) }));
    currentSegmentRef.current = -1; // Reset segment tracking
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, playbackSpeed: speed }));
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const skipBack = useCallback(() => {
    seek(Math.max(0, state.currentTime - 10));
  }, [state.currentTime, seek]);

  const skipForward = useCallback(() => {
    seek(Math.min(state.duration, state.currentTime + 10));
  }, [state.duration, state.currentTime, seek]);

  const jumpToTime = useCallback((time: number) => {
    seek(time);
    if (state.isPlaying) {
      currentSegmentRef.current = -1; // Force segment refresh
    }
  }, [seek, state.isPlaying]);

  useEffect(() => {
    initializeAudio();
  }, [initializeAudio]);

  useEffect(() => {
    // Create audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    play,
    pause,
    seek,
    setVolume,
    setPlaybackSpeed,
    skipBack,
    skipForward,
    jumpToTime,
    getCurrentSegment: () => getCurrentSegment(state.currentTime),
    initializeAudio
  };
};