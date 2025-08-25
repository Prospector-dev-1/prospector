/**
 * Audio configuration for the application
 * Controls audio processing features based on environment and use case
 */

// Audio feature flags (frontend safe - no secrets)
export const AUDIO_CONFIG = {
  // Enable Krisp noise suppression for live calls
  ENABLE_KRISP_FOR_LIVE: true,
  
  // Disable Krisp for replay to avoid WASM conflicts
  ENABLE_KRISP_FOR_REPLAY: false,
  
  // Audio processing settings
  SAMPLE_RATE: 16000,
  CHANNEL_COUNT: 1,
  ECHO_CANCELLATION: true,
  NOISE_SUPPRESSION: true,
  AUTO_GAIN_CONTROL: true,
  
  // Teardown timeouts
  KRISP_INIT_TIMEOUT: 1000,
  KRISP_READY_CHECK_INTERVAL: 50,
  TEARDOWN_TIMEOUT: 5000,
} as const;

/**
 * Get audio config for specific use case
 */
export function getAudioConfig(useCase: 'live' | 'replay') {
  return {
    ...AUDIO_CONFIG,
    enableKrisp: useCase === 'live' ? AUDIO_CONFIG.ENABLE_KRISP_FOR_LIVE : AUDIO_CONFIG.ENABLE_KRISP_FOR_REPLAY,
  };
}

/**
 * Audio processing phases for structured logging
 */
export const AUDIO_PHASES = {
  INIT: 'init',
  LIVE: 'live', 
  TEARDOWN: 'teardown',
  REPLAY: 'replay',
} as const;

export type AudioPhase = (typeof AUDIO_PHASES)[keyof typeof AUDIO_PHASES];