import { useCallback } from 'react';
import { useTranscriptProcessor } from './useTranscriptProcessor';

// Legacy interface for backward compatibility  
interface VapiMessage {
  type: string;
  transcript?: any;
  role?: string;
  transcriptType?: string;
  isFinal?: boolean;
  source?: string;
  conversation?: any[];
  speech?: { text: string };
}

export const useTranscriptManager = () => {
  const {
    transcript,
    chunks,
    isProcessing,
    lastUpdate,
    processPartialTranscript,
    processFinalTranscript,
    flushAllPendingTranscripts,
    clearAllTranscripts
  } = useTranscriptProcessor({
    debounceMs: 500,
    maxPartialBufferAge: 5000,
    maxChunksToKeep: 100
  });

  // Handle VAPI message with proper transcript extraction
  const handleVapiMessage = useCallback((message: VapiMessage) => {
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
      } else if (message.transcript?.text) {
        transcriptText = message.transcript.text;
      } else if (message.transcript?.transcript) {
        transcriptText = message.transcript.transcript;
      } else if (message.transcript?.content) {
        transcriptText = message.transcript.content;
      }

      // Determine role from message
      if (message.role === 'assistant') {
        role = 'assistant';
      } else if (message.role === 'user') {
        role = 'user';
      }

      // Determine if partial or final
      if (message.transcriptType) {
        transcriptType = message.transcriptType as 'partial' | 'final';
      } else if (message.isFinal !== undefined) {
        transcriptType = message.isFinal ? 'final' : 'partial';
      }

      if (transcriptText?.trim()) {
        const source = message.source || 'vapi';
        
        if (transcriptType === 'partial') {
          processPartialTranscript(transcriptText, role, source);
        } else {
          processFinalTranscript(transcriptText, role, source);
        }
      }
    }

    // Handle conversation updates
    if (message.type === 'conversation-update' && message.conversation) {
      message.conversation.forEach((entry: any) => {
        if (entry.role === 'assistant' && entry.content) {
          processFinalTranscript(entry.content, 'assistant', 'vapi-conversation');
        }
      });
    }

    // Handle speech updates
    if (message.type === 'speech-update' && message.speech?.text) {
      const role = message.role === 'assistant' ? 'assistant' : 'user';
      processFinalTranscript(message.speech.text, role, 'vapi-speech');
    }
  }, [processPartialTranscript, processFinalTranscript]);

  return {
    transcript,
    chunks,
    isProcessing,
    lastUpdate,
    // Legacy methods for backward compatibility
    addTranscriptChunk: processFinalTranscript,
    handleVapiMessage,
    clearTranscript: clearAllTranscripts,
    flushPendingChunks: flushAllPendingTranscripts
  };
};
