import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Vapi from '@vapi-ai/web';

export type ReplayMode = 'exact' | 'variation' | 'escalation' | 'chain';
export type ProspectPersonality = 'professional' | 'skeptical' | 'aggressive' | 'indecisive' | 'budget-conscious' | 'time-pressed';
export type GamificationMode = 'practice' | 'speed-challenge' | 'streak-builder' | 'perfect-score' | 'objection-master' | 'closing-champion';

interface CoachingHint {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  timestamp: number;
}

export interface ConversationState {
  isActive: boolean;
  isConnecting: boolean;
  exchangeCount: number;
  currentScore: number | null;
  hints: CoachingHint[];
  transcript: string;
}

interface FinalAnalysis {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

export const useRealtimeAIChat = () => {
  const [conversationState, setConversationState] = useState<ConversationState>({
    isActive: false,
    isConnecting: false,
    exchangeCount: 0,
    currentScore: null,
    hints: [],
    transcript: ''
  });

  const [finalAnalysis, setFinalAnalysis] = useState<FinalAnalysis | null>(null);

  const vapiRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const currentExchangeRef = useRef<number>(0);
  const sessionConfigRef = useRef<{
    replayMode: ReplayMode;
    prospectPersonality: ProspectPersonality;
    gamificationMode: GamificationMode;
    originalMoment: any;
  } | null>(null);

  const addCoachingHint = useCallback((message: string, type: CoachingHint['type'] = 'info') => {
    const hint: CoachingHint = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now()
    };
    
    setConversationState(prev => ({
      ...prev,
      hints: [...prev.hints.slice(-2), hint] // Keep only last 3 hints
    }));

    // Auto-remove hint after 8 seconds
    setTimeout(() => {
      setConversationState(prev => ({
        ...prev,
        hints: prev.hints.filter(h => h.id !== hint.id)
      }));
    }, 8000);
  }, []);

  const initializeVapi = useCallback(async () => {
    try {
      const { data: keyData, error: keyError } = await supabase.functions.invoke('get-vapi-key');
      
      if (keyError || !keyData?.publicKey) {
        throw new Error('Failed to get Vapi public key');
      }

      vapiRef.current = new Vapi(keyData.publicKey);

      // Set up event listeners
      vapiRef.current.on('call-start', () => {
        setConversationState(prev => ({
          ...prev,
          isActive: true,
          isConnecting: false
        }));
        addCoachingHint("Conversation started! Remember to listen actively and respond naturally.", 'success');
      });

      vapiRef.current.on('call-end', () => {
        handleConversationEnd();
      });

      vapiRef.current.on('speech-start', () => {
        // User started speaking
        if (currentExchangeRef.current === 0) {
          addCoachingHint("Good start! Take your time to give a thoughtful response.", 'info');
        }
      });

      vapiRef.current.on('speech-end', () => {
        // User stopped speaking - provide immediate feedback
        analyzeUserResponse();
      });

      vapiRef.current.on('message', (message: any) => {
        // Capture transcript and analyze AI responses
        if (message.transcript) {
          transcriptRef.current += message.transcript + ' ';
          setConversationState(prev => ({
            ...prev,
            transcript: transcriptRef.current
          }));
        }

        // Detect AI objections and provide coaching hints
        if (message.role === 'assistant' && message.transcript) {
          analyzeAIResponse(message.transcript);
        }
      });

      vapiRef.current.on('error', (error: any) => {
        console.error('Vapi error:', error);
        handleConversationEnd();
      });

    } catch (error) {
      console.error('Error initializing Vapi:', error);
      throw error;
    }
  }, [addCoachingHint]);

  const analyzeUserResponse = useCallback(() => {
    // Real-time analysis of user's response
    const exchangeCount = currentExchangeRef.current;
    
    if (exchangeCount === 0) {
      addCoachingHint("Nice! Now listen carefully for their follow-up objection.", 'info');
    } else if (exchangeCount === 1) {
      addCoachingHint("Great progress! Try to tie your response back to their specific business needs.", 'info');
    } else if (exchangeCount === 2) {
      addCoachingHint("Excellent! Now would be a good time to ask a follow-up question.", 'success');
    }
    
    currentExchangeRef.current++;
    setConversationState(prev => ({
      ...prev,
      exchangeCount: currentExchangeRef.current
    }));
  }, [addCoachingHint]);

  const analyzeAIResponse = useCallback((aiResponse: string) => {
    const lowerResponse = aiResponse.toLowerCase();
    
    // Detect different types of AI responses and provide contextual coaching
    if (lowerResponse.includes('expensive') || lowerResponse.includes('cost') || lowerResponse.includes('budget')) {
      addCoachingHint("They mentioned cost - acknowledge their concern and focus on ROI.", 'warning');
    } else if (lowerResponse.includes('think about it') || lowerResponse.includes('consider')) {
      addCoachingHint("They're hesitating - try asking what specific concerns they have.", 'info');
    } else if (lowerResponse.includes('not interested') || lowerResponse.includes('no thanks')) {
      addCoachingHint("Direct objection - ask permission to share one quick insight.", 'warning');
    } else if (lowerResponse.includes('tell me more') || lowerResponse.includes('how does')) {
      addCoachingHint("Great! They're engaged. Focus on benefits specific to their situation.", 'success');
    }
  }, [addCoachingHint]);

  const startConversation = useCallback(async (
    replayMode: ReplayMode,
    prospectPersonality: ProspectPersonality,
    gamificationMode: GamificationMode,
    originalMoment: any
  ) => {
    if (!vapiRef.current) {
      await initializeVapi();
    }

    sessionConfigRef.current = { replayMode, prospectPersonality, gamificationMode, originalMoment };
    
    setConversationState(prev => ({
      ...prev,
      isConnecting: true,
      exchangeCount: 0,
      hints: [],
      transcript: ''
    }));

    currentExchangeRef.current = 0;
    transcriptRef.current = '';

    try {
      // Create AI assistant with enhanced configuration
      const { data, error } = await supabase.functions.invoke('start-replay-conversation', {
        body: {
          replayMode,
          prospectPersonality,
          gamificationMode,
          originalMoment: {
            type: originalMoment.type,
            summary: originalMoment.summary,
            label: originalMoment.label,
            coaching_tip: originalMoment.coaching_tip
          }
        }
      });

      if (error) throw error;

      // Start the VAPI call with enhanced assistant
      await vapiRef.current.start(data.assistantId);
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      setConversationState(prev => ({
        ...prev,
        isConnecting: false
      }));
      throw error;
    }
  }, [initializeVapi, addCoachingHint]);

  const endConversation = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
  }, []);

  const handleConversationEnd = useCallback(async () => {
    setConversationState(prev => ({
      ...prev,
      isActive: false,
      isConnecting: false
    }));

    // Analyze the complete conversation and provide final score
    if (sessionConfigRef.current && transcriptRef.current) {
      try {
        const { data } = await supabase.functions.invoke('analyze-replay-conversation', {
          body: {
            transcript: transcriptRef.current,
            exchangeCount: currentExchangeRef.current,
            sessionConfig: sessionConfigRef.current
          }
        });

        if (data?.score) {
          setConversationState(prev => ({
            ...prev,
            currentScore: data.score
          }));

          setFinalAnalysis({
            score: data.score,
            feedback: data.feedback || '',
            strengths: data.strengths || [],
            improvements: data.improvements || [],
            recommendations: data.recommendations || []
          });
          
          addCoachingHint(
            `Session complete! Your score: ${data.score}/100. ${data.feedback}`, 
            data.score >= 80 ? 'success' : data.score >= 60 ? 'info' : 'warning'
          );
        }
      } catch (error) {
        console.error('Error analyzing conversation:', error);
      }
    }
  }, [addCoachingHint]);

  const clearHints = useCallback(() => {
    setConversationState(prev => ({
      ...prev,
      hints: []
    }));
  }, []);

  return {
    conversationState,
    startConversation,
    endConversation,
    addCoachingHint,
    clearHints,
    finalAnalysis
  };
};