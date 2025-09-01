import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export type AudioOutputMode = 'speaker' | 'earpiece';

export const useAudioRouting = () => {
  const [outputMode, setOutputMode] = useState<AudioOutputMode>('speaker');
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    // Set initial audio to speaker mode for call apps
    setAudioRoute('speaker');
    
    return () => {
      // Cleanup - reset to earpiece mode when component unmounts
      setAudioRoute('earpiece');
    };
  }, []);

  const setAudioRoute = async (mode: AudioOutputMode) => {
    try {
      setIsChanging(true);
      
      if (mode === 'speaker') {
        // Enable speakerphone mode
        console.log('Setting audio to speaker mode');
      } else {
        // Set to earpiece/receiver mode
        console.log('Setting audio to earpiece mode');
      }
      
      setOutputMode(mode);
    } catch (error) {
      console.error('Failed to set audio route:', error);
      toast.error('Failed to change audio output');
    } finally {
      setIsChanging(false);
    }
  };

  const toggleAudioRoute = useCallback(() => {
    if (isChanging) return;
    
    const newMode: AudioOutputMode = outputMode === 'speaker' ? 'earpiece' : 'speaker';
    setAudioRoute(newMode);
  }, [outputMode, isChanging]);

  return {
    outputMode,
    isChanging,
    toggleAudioRoute,
    setAudioRoute
  };
};