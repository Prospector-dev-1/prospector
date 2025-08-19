import { useState, useRef, useCallback, useEffect } from 'react';

interface TranscriptChunk {
  id: string;
  text: string;
  timestamp: number;
  role: 'user' | 'assistant' | 'system';
  type: 'partial' | 'final';
  source: string; // 'vapi' | 'realtime' | 'manual'
}

interface TranscriptState {
  fullTranscript: string;
  chunks: TranscriptChunk[];
  isProcessing: boolean;
  lastUpdate: number;
}

export const useTranscriptManager = () => {
  const [transcriptState, setTranscriptState] = useState<TranscriptState>({
    fullTranscript: '',
    chunks: [],
    isProcessing: false,
    lastUpdate: 0
  });

  // Refs for deduplication and buffering
  const pendingChunksRef = useRef<Map<string, TranscriptChunk>>(new Map());
  const processedTextsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedRef = useRef<string>('');

  // Deduplication function - removes repeated words/phrases
  const deduplicateText = useCallback((text: string): string => {
    if (!text || text.trim().length === 0) return '';
    
    // Normalize the text
    const normalized = text.trim().toLowerCase();
    
    // Check if this exact text was just processed
    if (normalized === lastProcessedRef.current) {
      console.log('Duplicate text detected, skipping:', text);
      return '';
    }
    
    // Split into words and remove consecutive duplicates
    const words = text.trim().split(/\s+/);
    const dedupedWords: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i].toLowerCase();
      const prevWord = i > 0 ? words[i - 1].toLowerCase() : '';
      
      // Skip if same as previous word (but allow some common words)
      const allowedRepeats = ['the', 'a', 'an', 'and', 'or', 'but', 'yes', 'no'];
      if (currentWord !== prevWord || allowedRepeats.includes(currentWord)) {
        dedupedWords.push(words[i]);
      }
    }
    
    const result = dedupedWords.join(' ');
    lastProcessedRef.current = result.toLowerCase();
    
    return result;
  }, []);

  // Process and commit pending chunks
  const commitPendingChunks = useCallback(() => {
    const chunks = Array.from(pendingChunksRef.current.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (chunks.length === 0) return;

    console.log('Committing transcript chunks:', chunks.length);
    
    // Build final transcript from chunks
    const finalTexts = chunks
      .filter(chunk => chunk.type === 'final' && chunk.text.trim().length > 0)
      .map(chunk => deduplicateText(chunk.text))
      .filter(text => text.length > 0);
    
    if (finalTexts.length > 0) {
      const newTranscript = finalTexts.join(' ').trim();
      
      setTranscriptState(prev => {
        const updatedTranscript = prev.fullTranscript 
          ? `${prev.fullTranscript} ${newTranscript}`.trim()
          : newTranscript;
        
        return {
          ...prev,
          fullTranscript: updatedTranscript,
          chunks: [...prev.chunks, ...chunks],
          lastUpdate: Date.now(),
          isProcessing: false
        };
      });
    }
    
    // Clear processed chunks
    pendingChunksRef.current.clear();
  }, [deduplicateText]);

  // Add transcript chunk with deduplication
  const addTranscriptChunk = useCallback((
    text: string,
    role: 'user' | 'assistant' | 'system' = 'user',
    type: 'partial' | 'final' = 'final',
    source: string = 'vapi'
  ) => {
    if (!text || text.trim().length === 0) return;

    const chunkId = `${source}-${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const normalizedText = text.trim();
    
    // Skip if we've seen this exact text recently
    const textKey = `${normalizedText.toLowerCase()}-${role}`;
    if (processedTextsRef.current.has(textKey)) {
      console.log('Skipping duplicate text:', normalizedText);
      return;
    }
    
    processedTextsRef.current.add(textKey);
    
    // Clean up old processed texts (keep last 100)
    if (processedTextsRef.current.size > 100) {
      const texts = Array.from(processedTextsRef.current);
      processedTextsRef.current.clear();
      texts.slice(-50).forEach(t => processedTextsRef.current.add(t));
    }

    const chunk: TranscriptChunk = {
      id: chunkId,
      text: normalizedText,
      timestamp: Date.now(),
      role,
      type,
      source
    };

    console.log('Adding transcript chunk:', chunk);
    
    // Add to pending chunks
    pendingChunksRef.current.set(chunkId, chunk);
    
    setTranscriptState(prev => ({ ...prev, isProcessing: true }));

    // Debounced commit for final chunks
    if (type === 'final') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        commitPendingChunks();
      }, 500); // 500ms debounce
    }
  }, [commitPendingChunks]);

  // Handle VAPI message with proper transcript extraction
  const handleVapiMessage = useCallback((message: any) => {
    if (!message) return;

    console.log('Processing VAPI message for transcript:', message.type);

    // Handle various transcript message types
    if (message.type === 'transcript') {
      let transcriptText = '';
      let transcriptType: 'partial' | 'final' = 'final';
      let role: 'user' | 'assistant' = 'user';

      // Extract transcript based on message structure
      if (typeof message.transcript === 'string') {
        transcriptText = message.transcript;
      } else if (message.transcript && message.transcript.text) {
        transcriptText = message.transcript.text;
      } else if (message.transcript && typeof message.transcript === 'object') {
        transcriptText = message.transcript.transcript || message.transcript.content || '';
      }

      // Determine role from message
      if (message.role) {
        role = message.role === 'assistant' ? 'assistant' : 'user';
      }

      // Determine if partial or final
      if (message.transcriptType) {
        transcriptType = message.transcriptType;
      } else if (message.isFinal !== undefined) {
        transcriptType = message.isFinal ? 'final' : 'partial';
      }

      if (transcriptText && transcriptText.trim().length > 0) {
        addTranscriptChunk(transcriptText, role, transcriptType, 'vapi');
      }
    }

    // Handle conversation updates
    if (message.type === 'conversation-update' && message.conversation) {
      message.conversation.forEach((entry: any) => {
        if (entry.role === 'assistant' && entry.content) {
          addTranscriptChunk(entry.content, 'assistant', 'final', 'vapi-conversation');
        }
      });
    }

    // Handle speech updates
    if (message.type === 'speech-update' && message.speech?.text) {
      const role = message.role === 'assistant' ? 'assistant' : 'user';
      addTranscriptChunk(message.speech.text, role, 'final', 'vapi-speech');
    }
  }, [addTranscriptChunk]);

  // Clear all transcript data
  const clearTranscript = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    pendingChunksRef.current.clear();
    processedTextsRef.current.clear();
    lastProcessedRef.current = '';
    
    setTranscriptState({
      fullTranscript: '',
      chunks: [],
      isProcessing: false,
      lastUpdate: 0
    });
    
    console.log('Transcript cleared');
  }, []);

  // Force commit any pending chunks
  const flushPendingChunks = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    commitPendingChunks();
  }, [commitPendingChunks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    transcript: transcriptState.fullTranscript,
    chunks: transcriptState.chunks,
    isProcessing: transcriptState.isProcessing,
    lastUpdate: transcriptState.lastUpdate,
    addTranscriptChunk,
    handleVapiMessage,
    clearTranscript,
    flushPendingChunks
  };
};
