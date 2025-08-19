import { useState, useRef, useCallback, useEffect } from 'react';

interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: number;
  role: 'user' | 'assistant' | 'system';
  type: 'partial' | 'final';
  source: string;
}

interface TranscriptState {
  fullTranscript: string;
  chunks: TranscriptChunk[];
  isProcessing: boolean;
  lastUpdate: number;
}

interface ProcessorConfig {
  debounceMs: number;
  maxPartialBufferAge: number;
  maxChunksToKeep: number;
}

export class TranscriptProcessor {
  private partialBuffers = new Map<string, { text: string; role: 'user' | 'assistant'; timestamp: number; source: string }>();
  private processedTexts = new Set<string>();
  private lastProcessedText = '';
  private config: ProcessorConfig;

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = {
      debounceMs: 500,
      maxPartialBufferAge: 5000,
      maxChunksToKeep: 100,
      ...config
    };
  }

  deduplicateText(text: string): string {
    if (!text?.trim()) return '';
    
    // Normalize text: lowercase, trim, remove extra spaces and punctuation
    const normalized = text.trim().toLowerCase()
      .replace(/[.,!?;:]+/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize spaces
    
    // Skip if identical to last processed (more lenient comparison)
    if (normalized === this.lastProcessedText) {
      console.log('Skipping duplicate normalized text:', text);
      return '';
    }
    
    // Remove consecutive duplicate words but preserve original case
    const words = text.trim().split(/\s+/);
    const dedupedWords: string[] = [];
    const allowedRepeats = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'yes', 'no', 'I', 'you', 'we', 'they']);
    
    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i].toLowerCase();
      const prevWord = i > 0 ? words[i - 1].toLowerCase() : '';
      
      // Allow repeats for allowed words or if words are different
      if (currentWord !== prevWord || allowedRepeats.has(currentWord)) {
        dedupedWords.push(words[i]);
      }
    }
    
    const result = dedupedWords.join(' ');
    
    // Only update lastProcessedText if we're returning a valid result
    if (result.trim()) {
      this.lastProcessedText = result.toLowerCase()
        .replace(/[.,!?;:]+/g, '')
        .replace(/\s+/g, ' ');
    }
    
    return result;
  }

  processPartialTranscript(
    text: string,
    role: 'user' | 'assistant',
    source: string
  ): void {
    const bufferKey = `${role}-${source}`;
    const cleanText = this.deduplicateText(text);
    
    if (!cleanText) return;
    
    this.partialBuffers.set(bufferKey, {
      text: cleanText,
      role,
      timestamp: Date.now(),
      source
    });
    
    console.log('Buffering partial transcript:', bufferKey, cleanText);
  }

  processFinalTranscript(
    text: string,
    role: 'user' | 'assistant',
    source: string
  ): TranscriptChunk | null {
    const bufferKey = `${role}-${source}`;
    const cleanText = this.deduplicateText(text);
    
    // Check if we have a buffered partial for this key
    const buffered = this.partialBuffers.get(bufferKey);
    
    let finalText = cleanText;
    if (buffered && (!cleanText || buffered.text.length > cleanText.length)) {
      finalText = buffered.text;
    }
    
    // Clear the buffer
    this.partialBuffers.delete(bufferKey);
    
    if (!finalText) return null;
    
    // Create a more sophisticated duplicate key using normalized text + context
    const normalizedKey = finalText.toLowerCase()
      .replace(/[.,!?;:]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const textKey = `${normalizedKey}-${role}-${source}`;
    
    if (this.processedTexts.has(textKey)) {
      console.log('Skipping duplicate final transcript:', finalText);
      return null;
    }
    
    this.processedTexts.add(textKey);
    
    // Cleanup old processed texts
    if (this.processedTexts.size > this.config.maxChunksToKeep) {
      const textsArray = Array.from(this.processedTexts);
      this.processedTexts.clear();
      textsArray.slice(-50).forEach(t => this.processedTexts.add(t));
    }
    
    const chunk: TranscriptChunk = {
      id: `${source}-${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: finalText,
      timestamp: Date.now(),
      role,
      type: 'final',
      source
    };
    
    console.log('Created final transcript chunk:', chunk);
    return chunk;
  }

  flushAllPartialBuffers(): TranscriptChunk[] {
    const chunks: TranscriptChunk[] = [];
    
    for (const [key, buffer] of this.partialBuffers.entries()) {
      console.log('Flushing partial buffer as final:', key, buffer.text);
      
      // Apply the same deduplication logic as processFinalTranscript
      const cleanText = this.deduplicateText(buffer.text);
      if (!cleanText) continue;
      
      const normalizedKey = cleanText.toLowerCase()
        .replace(/[.,!?;:]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const textKey = `${normalizedKey}-${buffer.role}-${buffer.source}`;
      
      if (this.processedTexts.has(textKey)) {
        console.log('Skipping duplicate flushed buffer:', cleanText);
        continue;
      }
      
      this.processedTexts.add(textKey);
      
      const chunk: TranscriptChunk = {
        id: `flush-${buffer.source}-${buffer.role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: cleanText,
        timestamp: buffer.timestamp,
        role: buffer.role,
        type: 'final',
        source: buffer.source
      };
      
      chunks.push(chunk);
    }
    
    this.partialBuffers.clear();
    return chunks;
  }

  cleanupExpiredBuffers(): void {
    const now = Date.now();
    for (const [key, buffer] of this.partialBuffers.entries()) {
      if (now - buffer.timestamp > this.config.maxPartialBufferAge) {
        console.log('Removing expired partial buffer:', key);
        this.partialBuffers.delete(key);
      }
    }
  }

  clear(): void {
    this.partialBuffers.clear();
    this.processedTexts.clear();
    this.lastProcessedText = '';
  }
}

export const useTranscriptProcessor = (config?: Partial<ProcessorConfig>) => {
  const [transcriptState, setTranscriptState] = useState<TranscriptState>({
    fullTranscript: '',
    chunks: [],
    isProcessing: false,
    lastUpdate: 0
  });

  const processorRef = useRef<TranscriptProcessor | null>(null);
  const pendingChunksRef = useRef<TranscriptChunk[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize processor
  useEffect(() => {
    processorRef.current = new TranscriptProcessor(config);
    
    // Start cleanup timer
    cleanupTimerRef.current = setInterval(() => {
      processorRef.current?.cleanupExpiredBuffers();
    }, 5000);
    
    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const commitPendingChunks = useCallback(() => {
    if (pendingChunksRef.current.length === 0) return;
    
    const chunks = [...pendingChunksRef.current].sort((a, b) => a.timestamp - b.timestamp);
    console.log('Committing transcript chunks:', chunks.length);
    
    // Apply final deduplication pass before assembly
    const deduplicatedTexts: string[] = [];
    const seenTexts = new Set<string>();
    
    for (const chunk of chunks) {
      const normalizedText = chunk.text.toLowerCase()
        .replace(/[.,!?;:]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!seenTexts.has(normalizedText) && chunk.text.trim().length > 0) {
        seenTexts.add(normalizedText);
        deduplicatedTexts.push(chunk.text);
      }
    }
    
    if (deduplicatedTexts.length > 0) {
      const newTranscript = deduplicatedTexts.join(' ').trim();
      
      console.log(`💾 COMMITTING TRANSCRIPT: "${newTranscript}"`);
      console.log(`📊 Transcript stats: ${deduplicatedTexts.length} unique chunks, ${newTranscript.length} total chars`);
      
      setTranscriptState(prev => {
        const updatedTranscript = prev.fullTranscript 
          ? `${prev.fullTranscript} ${newTranscript}`.trim()
          : newTranscript;
        
        console.log(`📝 Updated transcript length: ${updatedTranscript.length} chars`);
        
        return {
          ...prev,
          fullTranscript: updatedTranscript,
          chunks: [...prev.chunks, ...chunks],
          lastUpdate: Date.now(),
          isProcessing: false
        };
      });
      
      console.log('Transcript state updated with:', deduplicatedTexts.length, 'unique texts');
    } else {
      console.log('⚠️ No valid transcript chunks to commit');
    }
    
    // Clear pending chunks after successful commit
    pendingChunksRef.current = [];
  }, []);

  const debouncedCommit = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    setTranscriptState(prev => ({ ...prev, isProcessing: true }));
    
    debounceTimerRef.current = setTimeout(() => {
      commitPendingChunks();
    }, config?.debounceMs || 500);
  }, [commitPendingChunks, config?.debounceMs]);

  const processPartialTranscript = useCallback((
    text: string,
    role: 'user' | 'assistant' = 'user',
    source: string = 'vapi'
  ) => {
    if (!processorRef.current || !text?.trim()) return;
    
    processorRef.current.processPartialTranscript(text.trim(), role, source);
  }, []);

  const processFinalTranscript = useCallback((
    text: string,
    role: 'user' | 'assistant' = 'user',
    source: string = 'vapi'
  ) => {
    if (!processorRef.current || !text?.trim()) return;
    
    console.log(`🔄 Processing final transcript: role=${role}, source=${source}, text="${text.trim()}"`);
    
    const chunk = processorRef.current.processFinalTranscript(text.trim(), role, source);
    if (chunk) {
      pendingChunksRef.current.push(chunk);
      console.log(`✅ Final transcript chunk added to pending queue. Queue size: ${pendingChunksRef.current.length}`);
      debouncedCommit();
    } else {
      console.log(`❌ Final transcript chunk was rejected (duplicate or empty)`);
    }
  }, [debouncedCommit]);

  const flushAllPendingTranscripts = useCallback(() => {
    if (!processorRef.current) return;
    
    // Flush any remaining partial buffers
    const flushedChunks = processorRef.current.flushAllPartialBuffers();
    if (flushedChunks.length > 0) {
      pendingChunksRef.current.push(...flushedChunks);
    }
    
    // Force immediate commit
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    commitPendingChunks();
  }, [commitPendingChunks]);

  const clearAllTranscripts = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    processorRef.current?.clear();
    pendingChunksRef.current = [];
    
    setTranscriptState({
      fullTranscript: '',
      chunks: [],
      isProcessing: false,
      lastUpdate: 0
    });
    
    console.log('All transcripts cleared');
  }, []);

  return {
    transcript: transcriptState.fullTranscript,
    chunks: transcriptState.chunks,
    isProcessing: transcriptState.isProcessing,
    lastUpdate: transcriptState.lastUpdate,
    processPartialTranscript,
    processFinalTranscript,
    flushAllPendingTranscripts,
    clearAllTranscripts
  };
};