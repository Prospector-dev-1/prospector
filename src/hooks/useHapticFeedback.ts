import { useCallback } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((type: HapticType = 'light') => {
    // Check if we're in a mobile environment that supports haptics
    if (typeof window === 'undefined') return;

    try {
      // Try iOS haptic feedback first
      if ('navigator' in window && 'vibrate' in navigator) {
        switch (type) {
          case 'light':
            navigator.vibrate(10);
            break;
          case 'medium':
            navigator.vibrate(20);
            break;
          case 'heavy':
            navigator.vibrate(30);
            break;
          case 'success':
            navigator.vibrate([10, 50, 10]);
            break;
          case 'warning':
            navigator.vibrate([20, 100, 20]);
            break;
          case 'error':
            navigator.vibrate([50, 100, 50]);
            break;
        }
      }

      // If available, use iOS haptic feedback API (more sophisticated)
      if ('DeviceMotionEvent' in window && 'requestPermission' in DeviceMotionEvent) {
        // This would be enhanced with Capacitor's haptic plugin
        // For now, we'll use the vibration API as fallback
      }
    } catch (error) {
      // Silently fail if haptics aren't supported
      console.debug('Haptic feedback not supported:', error);
    }
  }, []);

  const buttonFeedback = useCallback(() => triggerHaptic('light'), [triggerHaptic]);
  const successFeedback = useCallback(() => triggerHaptic('success'), [triggerHaptic]);
  const errorFeedback = useCallback(() => triggerHaptic('error'), [triggerHaptic]);
  const warningFeedback = useCallback(() => triggerHaptic('warning'), [triggerHaptic]);

  return {
    triggerHaptic,
    buttonFeedback,
    successFeedback,
    errorFeedback,
    warningFeedback,
  };
};