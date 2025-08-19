import { useState, useRef, useCallback, useEffect } from 'react';

// Data model for the single source of truth
interface TranscriptBuffer {
  text: string;
  isFinal: boolean;
  t0?: number;
  t1?: number;
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
  confidence?: number;
}

interface TranscriptSessionState {
  callSessionId: string;
  status: 'idle' | 'connecting' | 'active' | 'ended' | 'failed';
  liveBuffer: TranscriptBuffer[];
  finalChunks: FinalChunk[];
  finalTranscript: string;
  timeline?: Array<{ time: number; event: string }>;
}

interface VapiTranscriptMessage {
  type: string;
  transcript?: any;
  role?: string;
  transcriptType?: string;
  isFinal?: boolean;
  source?: string;
  timestamp?: number;
}

class TranscriptSessionManager {
  private state: TranscriptSessionState;
  private chunkHashes = new Set<string>();
  private eventListeners = new Set<(state: TranscriptSessionState) => void>();
  
  constructor(callSessionId: string) {
    this.state = {
      callSessionId,
      status: 'idle',
      liveBuffer: [],
      finalChunks: [],
      finalTranscript: '',
      timeline: []
    };
  }

  private generateHash(text: string, speaker: string, timestamp: number): string {
    const normalizedText = text.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    const input = `${normalizedText}-${speaker}-${Math.floor(timestamp / 1000)}`;
    
    // Simple hash function for browser environments
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([.!?])+/g, '$1') // Remove duplicate punctuation
      .replace(/^[.!?]+\s*/, '') // Remove leading punctuation
      .replace(/\s*[.!?]+$/, '.'); // Normalize ending punctuation
  }

  private deduplicateTokens(text: string): string {
    const words = text.split(/\s+/);
    const result: string[] = [];
    const allowedRepeats = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'yes', 'no', 'I', 'you']);
    
    for (let i = 0; i < words.length; i++) {
      const current = words[i].toLowerCase();
      const prev = i > 0 ? words[i - 1].toLowerCase() : '';
      const next = i < words.length - 1 ? words[i + 1].toLowerCase() : '';
      
      // Skip if same as previous word (unless allowed)
      if (current === prev && !allowedRepeats.has(current)) {
        continue;
      }
      
      // Skip n-gram repetitions (5-8 tokens)
      if (i >= 5) {
        const ngramSize = Math.min(6, Math.floor(words.length / 4));
        const currentNgram = words.slice(i - ngramSize, i).join(' ').toLowerCase();
        const prevNgram = words.slice(i - ngramSize * 2, i - ngramSize).join(' ').toLowerCase();
        
        if (currentNgram === prevNgram && currentNgram.length > 10) {
          continue;
        }
      }
      
      result.push(words[i]);
    }
    
    return result.join(' ');
  }

  private notifyListeners() {
    this.eventListeners.forEach(listener => listener({ ...this.state }));
  }

  public subscribe(listener: (state: TranscriptSessionState) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  public setStatus(status: TranscriptSessionState['status']) {
    console.log(`📱 Transcript session status: ${this.state.status} → ${status}`);
    this.state.status = status;
    this.notifyListeners();
  }

  public processVapiMessage(message: VapiTranscriptMessage) {
    if (!message || message.type !== 'transcript') return;

    let text = '';
    if (typeof message.transcript === 'string') {
      text = message.transcript;
    } else if (message.transcript?.text) {
      text = message.transcript.text;
    } else if (message.transcript?.content) {
      text = message.transcript.content;
    }

    if (!text?.trim()) return;

    const speaker = message.role === 'assistant' ? 'prospect' : 'user';
    const isFinal = message.isFinal ?? (message.transcriptType === 'final');
    const timestamp = message.timestamp || Date.now();
    const source = message.source || 'vapi';

    if (isFinal) {
      this.addFinalTranscript(text, speaker, timestamp, source);
    } else {
      this.addInterimTranscript(text, speaker, timestamp, source);
    }
  }

  private addInterimTranscript(text: string, speaker: 'user' | 'prospect', timestamp: number, source: string) {
    // Never persist interim - only for UI preview
    const normalizedText = this.normalizeText(text);
    const hash = this.generateHash(normalizedText, speaker, timestamp);
    
    const buffer: TranscriptBuffer = {
      text: normalizedText,
      isFinal: false,
      speaker,
      source,
      hash,
      t0: timestamp
    };

    // Replace any existing interim from same source/speaker
    this.state.liveBuffer = this.state.liveBuffer.filter(
      b => !(b.speaker === speaker && b.source === source && !b.isFinal)
    );
    
    this.state.liveBuffer.push(buffer);
    
    console.log(`💬 Interim: ${speaker} said "${normalizedText.substring(0, 50)}..."`);
    this.notifyListeners();
  }

  private addFinalTranscript(text: string, speaker: 'user' | 'prospect', timestamp: number, source: string) {
    const normalizedText = this.normalizeText(text);
    const deduplicatedText = this.deduplicateTokens(normalizedText);
    
    if (!deduplicatedText.trim()) return;

    const hash = this.generateHash(deduplicatedText, speaker, timestamp);
    
    // Idempotent append - skip if already processed
    if (this.chunkHashes.has(hash)) {
      console.log(`⚠️ Skipping duplicate final chunk: ${hash}`);
      return;
    }

    this.chunkHashes.add(hash);

    const finalChunk: FinalChunk = {
      id: `${this.state.callSessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: deduplicatedText,
      speaker,
      timestamp,
      source,
      hash
    };

    this.state.finalChunks.push(finalChunk);
    
    // Clear related interim from live buffer
    this.state.liveBuffer = this.state.liveBuffer.filter(
      b => !(b.speaker === speaker && b.source === source && !b.isFinal)
    );

    console.log(`✅ Final: ${speaker} said "${deduplicatedText.substring(0, 50)}..."`);
    this.notifyListeners();
  }

  public async finalize(): Promise<string> {
    console.log(`🔄 Finalizing transcript for session ${this.state.callSessionId}`);
    
    // Flush any remaining interim buffers as final
    const remainingInterims = this.state.liveBuffer.filter(b => !b.isFinal && b.text.trim());
    for (const interim of remainingInterims) {
      this.addFinalTranscript(interim.text, interim.speaker, interim.t0 || Date.now(), interim.source);
    }

    // Clear live buffer
    this.state.liveBuffer = [];

    // Sort final chunks by timestamp
    const sortedChunks = [...this.state.finalChunks].sort((a, b) => a.timestamp - b.timestamp);
    
    // Apply final deduplication pass
    const finalTexts: string[] = [];
    const seenHashes = new Set<string>();
    
    for (const chunk of sortedChunks) {
      if (!seenHashes.has(chunk.hash) && chunk.text.trim()) {
        seenHashes.add(chunk.hash);
        finalTexts.push(chunk.text);
      }
    }

    // Create paragraphs based on speaker changes and long pauses
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];
    let lastSpeaker: string | null = null;
    
    for (let i = 0; i < sortedChunks.length; i++) {
      const chunk = sortedChunks[i];
      if (!seenHashes.has(chunk.hash)) continue;
      
      const speakerChanged = lastSpeaker && lastSpeaker !== chunk.speaker;
      const longPause = i > 0 && (chunk.timestamp - sortedChunks[i - 1].timestamp) > 3000;
      
      if ((speakerChanged || longPause) && currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
      
      currentParagraph.push(chunk.text);
      lastSpeaker = chunk.speaker;
    }
    
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(' '));
    }

    // Assemble final transcript
    this.state.finalTranscript = paragraphs.join('\n\n').trim();
    this.state.status = 'ended';
    
    console.log(`📝 Finalized transcript: ${this.state.finalTranscript.length} characters, ${paragraphs.length} paragraphs`);
    this.notifyListeners();
    
    return this.state.finalTranscript;
  }

  public getState(): TranscriptSessionState {
    return { ...this.state };
  }

  public clear() {
    this.state = {
      callSessionId: this.state.callSessionId,
      status: 'idle',
      liveBuffer: [],
      finalChunks: [],
      finalTranscript: '',
      timeline: []
    };
    this.chunkHashes.clear();
    this.notifyListeners();
  }
}

export const useTranscriptSession = (callSessionId: string) => {
  const managerRef = useRef<TranscriptSessionManager | null>(null);
  const [state, setState] = useState<TranscriptSessionState>({
    callSessionId,
    status: 'idle',
    liveBuffer: [],
    finalChunks: [],
    finalTranscript: '',
    timeline: []
  });

  // Initialize manager
  useEffect(() => {
    managerRef.current = new TranscriptSessionManager(callSessionId);
    
    const unsubscribe = managerRef.current.subscribe(setState);
    
    return () => {
      unsubscribe();
      managerRef.current = null;
    };
  }, [callSessionId]);

  const processVapiMessage = useCallback((message: VapiTranscriptMessage) => {
    managerRef.current?.processVapiMessage(message);
  }, []);

  const setStatus = useCallback((status: TranscriptSessionState['status']) => {
    managerRef.current?.setStatus(status);
  }, []);

  const finalize = useCallback(async (): Promise<string> => {
    if (!managerRef.current) return '';
    return await managerRef.current.finalize();
  }, []);

  const clear = useCallback(() => {
    managerRef.current?.clear();
  }, []);

  return {
    state,
    processVapiMessage,
    setStatus,
    finalize,
    clear
  };
};