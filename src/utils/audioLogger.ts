/**
 * Structured logging for audio processing phases
 */

import { AudioPhase, AUDIO_PHASES } from '@/config/audioConfig';

interface AudioLogEntry {
  phase: AudioPhase;
  event: string;
  timestamp: number;
  data?: any;
  level: 'info' | 'warn' | 'error';
}

class AudioLogger {
  private logs: AudioLogEntry[] = [];
  private maxLogs = 100;

  log(phase: AudioPhase, event: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') {
    const entry: AudioLogEntry = {
      phase,
      event,
      timestamp: Date.now(),
      data,
      level,
    };

    this.logs.unshift(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Also log to console with structured format
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logMethod(`[AUDIO:${phase.toUpperCase()}] ${event}`, data || '');
  }

  info(phase: AudioPhase, event: string, data?: any) {
    this.log(phase, event, data, 'info');
  }

  warn(phase: AudioPhase, event: string, data?: any) {
    this.log(phase, event, data, 'warn');
  }

  error(phase: AudioPhase, event: string, data?: any) {
    this.log(phase, event, data, 'error');
  }

  getLogs(phase?: AudioPhase): AudioLogEntry[] {
    if (phase) {
      return this.logs.filter(log => log.phase === phase);
    }
    return [...this.logs];
  }

  getLogsByLevel(level: 'info' | 'warn' | 'error'): AudioLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  clear() {
    this.logs = [];
  }

  // Get formatted log summary for debugging
  getSummary(): string {
    const summary = {
      [AUDIO_PHASES.INIT]: this.logs.filter(l => l.phase === AUDIO_PHASES.INIT).length,
      [AUDIO_PHASES.LIVE]: this.logs.filter(l => l.phase === AUDIO_PHASES.LIVE).length,
      [AUDIO_PHASES.TEARDOWN]: this.logs.filter(l => l.phase === AUDIO_PHASES.TEARDOWN).length,
      [AUDIO_PHASES.REPLAY]: this.logs.filter(l => l.phase === AUDIO_PHASES.REPLAY).length,
      errors: this.logs.filter(l => l.level === 'error').length,
      warnings: this.logs.filter(l => l.level === 'warn').length,
    };

    return `Audio Logs Summary: ${JSON.stringify(summary)}`;
  }
}

// Singleton instance
export const audioLogger = new AudioLogger();

// Export phases for easy access
export { AUDIO_PHASES };
