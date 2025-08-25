# Audio Teardown & Replay System

## Overview

This document describes the audio processing system that handles both live calls and replay functionality with proper teardown management to avoid WASM/Krisp conflicts.

## State Machine

The audio system uses a teardown state machine to ensure safe cleanup:

```
idle → initializing → ready → tearing_down → done
```

### States:
- **idle**: No audio processing active
- **initializing**: Krisp/audio processors starting up
- **ready**: All audio components ready for use
- **tearing_down**: Cleanup in progress
- **done**: Cleanup completed, safe to restart

## Configuration Flags

Located in `src/config/audioConfig.ts`:

```typescript
export const AUDIO_CONFIG = {
  // Enable Krisp noise suppression for live calls
  ENABLE_KRISP_FOR_LIVE: true,
  
  // Disable Krisp for replay to avoid WASM conflicts
  ENABLE_KRISP_FOR_REPLAY: false,
  
  // Timeouts and intervals
  KRISP_INIT_TIMEOUT: 1000,
  KRISP_READY_CHECK_INTERVAL: 50,
  TEARDOWN_TIMEOUT: 5000,
}
```

### Setting Flags in Lovable

These are frontend-safe constants (no secrets). To modify:

1. Edit `src/config/audioConfig.ts`
2. Change the boolean values as needed
3. The app will use the new settings on next reload

## Key Components

### 1. useRealtimeAIChat Hook (`src/hooks/useRealtimeAIChat.ts`)

**Enhanced with:**
- Teardown state machine for Krisp processor
- Idempotent `stop()` function
- Safe cleanup that handles WASM race conditions
- Structured logging with `audioLogger`

**Key Functions:**
- `safeUnloadKrisp()`: Handles Krisp cleanup with proper state checking
- `stop(reason)`: Idempotent teardown of entire audio chain
- `endConversation()`: User-facing conversation end with proper cleanup

### 2. ReplayPlayer Component (`src/components/ReplayPlayer.tsx`)

**Features:**
- Simple HTML5 audio player (no Krisp/microphone processing)
- Completely decoupled from live audio chain
- Built-in error handling and user feedback
- Autoplay support with fallback messaging

**Usage:**
```tsx
<ReplayPlayer 
  src={signedAudioUrl}
  autoPlay={true}
  onError={(err) => console.error(err)}
  onEnded={() => console.log('Playback finished')}
/>
```

### 3. Audio Logger (`src/utils/audioLogger.ts`)

**Structured logging by phases:**
- `INIT`: Component initialization
- `LIVE`: Active call processing  
- `TEARDOWN`: Cleanup operations
- `REPLAY`: Replay playback

**Usage:**
```typescript
import { audioLogger, AUDIO_PHASES } from '@/utils/audioLogger';

audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Starting cleanup', { reason: 'user-ended' });
audioLogger.error(AUDIO_PHASES.LIVE, 'Krisp failed', { error: err.message });
```

### 4. Async Utilities (`src/utils/async.ts`)

**Helper functions:**
- `waitUntil(predicate, options)`: Wait for condition with timeout
- `waitForKrispReady(processor, timeout)`: Wait for Krisp initialization
- `safePromise(promise)`: Promise that never rejects (useful for cleanup)
- `retry(fn, options)`: Retry with exponential backoff

## Teardown Sequence

When ending a call, the system follows this sequence:

1. **Stop VAPI session** - End real-time communication first
2. **Stop media tracks** - Release microphone and audio devices
3. **Disconnect audio graph** - Clean up Web Audio nodes
4. **Close AudioContext** - Release audio processing context
5. **Unload Krisp processor** - Safe cleanup with state checking

Each step uses `safePromise()` to prevent exceptions from breaking the cleanup chain.

## Error Handling

### Common WASM Errors:
- `WASM_OR_WORKER_NOT_READY`: Krisp processor not initialized
- `Cannot read properties of null`: Audio node already disconnected

### Resolution Strategy:
1. **Log the error** using structured logger
2. **Continue cleanup** - don't let one step block others
3. **Set safe final state** - ensure UI remains usable
4. **Show user-friendly toasts** - inform user of status

## Live vs Replay Architecture

### Live Calls:
- Full audio processing chain with Krisp
- Microphone access and real-time processing
- Complex teardown with state management

### Replay:
- Simple HTML5 audio element
- No microphone or processing chain
- Minimal teardown (just pause/stop audio)

## Testing Scenarios

### Test Cases:
1. **Normal flow**: Start live call → End call → Start replay
2. **Rapid switching**: Multiple start/stop cycles
3. **Error conditions**: Network failures during calls
4. **Browser constraints**: Autoplay blocked, no microphone access

### Validation:
- No WASM_OR_WORKER_NOT_READY errors in console
- Replay works after ending live calls
- `stop()` can be called multiple times safely
- UI remains responsive during all operations

## Troubleshooting

### Symptoms & Solutions:

**"WASM_OR_WORKER_NOT_READY" errors:**
- Check that `ENABLE_KRISP_FOR_REPLAY: false`
- Verify proper teardown sequence
- Look for overlapping audio contexts

**Replay won't play after live call:**
- Ensure `endConversation()` completed fully
- Check browser autoplay policies
- Verify audio URL is accessible

**Audio processing stuck:**
- Check teardown state machine logs
- Verify all media tracks are stopped
- Look for unclosed AudioContext instances

## Development Tips

1. **Use structured logging** - Makes debugging much easier
2. **Test rapid switching** - Most bugs appear in edge cases  
3. **Monitor browser console** - Look for audio/WASM warnings
4. **Test on mobile** - Different constraints than desktop
5. **Handle autoplay blocking** - Provide clear user guidance

## Future Enhancements

- Add audio visualization during replay
- Implement pause/resume for live calls
- Add audio quality indicators
- Support multiple audio formats for replay