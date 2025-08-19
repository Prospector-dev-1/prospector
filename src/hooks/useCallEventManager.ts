import { useRef, useCallback, useEffect } from 'react';
import VapiService from '@/utils/vapiService';

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

interface CallEventHandlers {
  onCallStart?: () => void;
  onCallEnd?: () => void;
  onTranscriptPartial?: (text: string, role: 'user' | 'assistant', source: string) => void;
  onTranscriptFinal?: (text: string, role: 'user' | 'assistant', source: string) => void;
  onMessage?: (message: VapiMessage) => void;
}

export const useCallEventManager = () => {
  const vapiService = useRef<VapiService | null>(null);
  const eventHandlersRef = useRef<CallEventHandlers>({});
  const isInitializedRef = useRef(false);
  const listenersAttachedRef = useRef(false);

  // Stable event handler functions
  const handleCallStart = useCallback(() => {
    console.log('VAPI call started');
    eventHandlersRef.current.onCallStart?.();
  }, []);

  const handleCallEnd = useCallback(() => {
    console.log('VAPI call ended');
    eventHandlersRef.current.onCallEnd?.();
  }, []);

  const extractTranscriptFromMessage = useCallback((message: VapiMessage) => {
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

    // Determine role
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

    return { transcriptText, transcriptType, role };
  }, []);

  const handleMessage = useCallback((message: VapiMessage) => {
    console.log('VAPI message received:', message.type, message);
    
    // Forward to general message handler
    eventHandlersRef.current.onMessage?.(message);

    // Handle transcript messages
    if (message.type === 'transcript') {
      const { transcriptText, transcriptType, role } = extractTranscriptFromMessage(message);
      
      if (transcriptText?.trim()) {
        const source = message.source || 'vapi';
        
        if (transcriptType === 'partial') {
          eventHandlersRef.current.onTranscriptPartial?.(transcriptText, role, source);
        } else {
          eventHandlersRef.current.onTranscriptFinal?.(transcriptText, role, source);
        }
      }
    }

    // Handle conversation updates
    if (message.type === 'conversation-update' && message.conversation) {
      message.conversation.forEach((entry: any) => {
        if (entry.role === 'assistant' && entry.content) {
          eventHandlersRef.current.onTranscriptFinal?.(entry.content, 'assistant', 'vapi-conversation');
        }
      });
    }

    // Handle speech updates
    if (message.type === 'speech-update' && message.speech?.text) {
      const role = message.role === 'assistant' ? 'assistant' : 'user';
      eventHandlersRef.current.onTranscriptFinal?.(message.speech.text, role, 'vapi-speech');
    }
  }, [extractTranscriptFromMessage]);

  const initializeVapi = useCallback(async () => {
    if (isInitializedRef.current) {
      console.log('VAPI already initialized');
      return vapiService.current!;
    }

    try {
      console.log('Initializing VAPI service...');
      vapiService.current = VapiService.getInstance();
      await vapiService.current.initialize();
      isInitializedRef.current = true;
      console.log('VAPI service initialized successfully');
      return vapiService.current;
    } catch (error) {
      console.error('Failed to initialize VAPI service:', error);
      throw error;
    }
  }, []);

  const attachEventListeners = useCallback(() => {
    if (!vapiService.current || listenersAttachedRef.current) {
      console.log('Cannot attach listeners: VAPI not initialized or listeners already attached');
      return;
    }

    console.log('Attaching VAPI event listeners...');
    
    vapiService.current.on('call-start', handleCallStart);
    vapiService.current.on('call-end', handleCallEnd);
    vapiService.current.on('message', handleMessage);
    
    listenersAttachedRef.current = true;
    console.log('VAPI event listeners attached');
  }, [handleCallStart, handleCallEnd, handleMessage]);

  const detachEventListeners = useCallback(() => {
    if (!vapiService.current || !listenersAttachedRef.current) {
      console.log('Cannot detach listeners: VAPI not initialized or listeners not attached');
      return;
    }

    console.log('Detaching VAPI event listeners...');
    
    try {
      vapiService.current.off('call-start', handleCallStart);
      vapiService.current.off('call-end', handleCallEnd);
      vapiService.current.off('message', handleMessage);
      
      listenersAttachedRef.current = false;
      console.log('VAPI event listeners detached');
    } catch (error) {
      console.error('Error detaching VAPI listeners:', error);
    }
  }, [handleCallStart, handleCallEnd, handleMessage]);

  const startCall = useCallback(async (assistantId: string) => {
    if (!vapiService.current) {
      throw new Error('VAPI service not initialized');
    }
    
    console.log('Starting VAPI call with assistant:', assistantId);
    return await vapiService.current.startCall(assistantId);
  }, []);

  const stopCall = useCallback(async () => {
    if (!vapiService.current) {
      console.log('VAPI service not available for stop');
      return;
    }
    
    console.log('Stopping VAPI call...');
    await vapiService.current.stopCall();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    if (!vapiService.current) {
      console.log('VAPI service not available for mute');
      return;
    }
    
    vapiService.current.setMuted(muted);
  }, []);

  const updateEventHandlers = useCallback((handlers: Partial<CallEventHandlers>) => {
    eventHandlersRef.current = { ...eventHandlersRef.current, ...handlers };
  }, []);

  const cleanup = useCallback(() => {
    console.log('Cleaning up call event manager...');
    detachEventListeners();
    eventHandlersRef.current = {};
    isInitializedRef.current = false;
  }, [detachEventListeners]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    initializeVapi,
    attachEventListeners,
    detachEventListeners,
    startCall,
    stopCall,
    setMuted,
    updateEventHandlers,
    cleanup,
    isInitialized: isInitializedRef.current,
    hasListeners: listenersAttachedRef.current
  };
};