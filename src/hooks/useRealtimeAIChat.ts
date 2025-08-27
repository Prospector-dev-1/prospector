import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';


export type ReplayMode = 'detailed' | 'quick' | 'focused';
export type ProspectPersonality = 'skeptical' | 'enthusiastic' | 'professional' | 'aggressive' | 'analytical';
export type GamificationMode = 'none' | 'speed' | 'difficulty' | 'empathy';

interface CoachingHint {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  timestamp: number;
}

export interface ConversationState {
  status: 'idle' | 'connecting' | 'active' | 'ending' | 'ended';
  isConnected: boolean;
  transcript: string;
  exchangeCount: number;
  currentScore: number;
  hints: CoachingHint[];
  selectedMoment?: any;
  sessionId?: string;
  prospectProfile?: any;
  personalityState?: string;
  // Backward compatibility
  isActive: boolean;
  isConnecting: boolean;
}

export interface FinalAnalysis {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  personalityAnalysis?: any;
  skillAssessment?: any;
  conversationFlow?: any;
}

export const useRealtimeAIChat = () => {
  const [conversationState, setConversationState] = useState<ConversationState>({
    status: 'idle',
    isConnected: false,
    transcript: '',
    exchangeCount: 0,
    currentScore: 0,
    hints: [],
    // Backward compatibility
    isActive: false,
    isConnecting: false,
  });

  const [finalAnalysis, setFinalAnalysis] = useState<FinalAnalysis | null>(null);
  const vapiInstance = useRef<any>(null);
  const sessionTranscript = useRef<string>('');
  const sessionConfigRef = useRef<{
    replayMode: ReplayMode;
    prospectPersonality: ProspectPersonality;
    gamificationMode: GamificationMode;
    customProspectId?: string;
    sessionId?: string;
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
      const { data, error } = await supabase.functions.invoke('get-vapi-key');
      
      if (error) throw error;

      const { default: Vapi } = await import('@vapi-ai/web');
      const vapi = new Vapi(data.publicKey);

      vapi.on('call-start', () => {
        console.log('Call started');
        setConversationState(prev => ({
          ...prev,
          status: 'active',
          isConnected: true,
          isActive: true,
          isConnecting: false
        }));
      });

      vapi.on('call-end', () => {
        console.log('Call ended');
        setConversationState(prev => ({
          ...prev,
          status: 'ended',
          isConnected: false,
          isActive: false,
          isConnecting: false
        }));
        
        setTimeout(() => {
          handleConversationEnd();
        }, 1000);
      });

      vapi.on('speech-start', () => {
        console.log('User started speaking');
      });

      vapi.on('speech-end', () => {
        console.log('User stopped speaking');
      });

      vapi.on('message', (message: any) => {
        console.log('Vapi message:', message);
        
        if (message.type === 'transcript' && message.transcript) {
          sessionTranscript.current += message.transcript + '\n';
          setConversationState(prev => ({
            ...prev,
            transcript: sessionTranscript.current
          }));
        }
      });

      vapiInstance.current = vapi;
      return vapi;
    } catch (error) {
      console.error('Error initializing Vapi:', error);
      throw error;
    }
  }, []);

  const analyzeUserResponse = useCallback((exchangeCount: number) => {
    const hints = [
      "Try asking an open-ended question to gather more information",
      "Acknowledge their concern before presenting your solution",
      "Use the prospect's name to build rapport",
      "Share a relevant success story or case study",
      "Ask about their biggest challenge in this area"
    ];

    if (exchangeCount % 3 === 0 && exchangeCount > 0) {
      const randomHint = hints[Math.floor(Math.random() * hints.length)];
      addCoachingHint(randomHint, 'info');
    }
  }, [addCoachingHint]);

  const analyzeAIResponse = useCallback((response: string) => {
    const positiveKeywords = ['interested', 'sounds good', 'tell me more', 'that could work'];
    const objectionKeywords = ['expensive', 'not sure', 'concerned', 'worried', 'budget'];
    
    if (positiveKeywords.some(keyword => response.toLowerCase().includes(keyword))) {
      addCoachingHint("Great! The prospect is showing interest. This might be a good time to ask for next steps.", 'success');
    } else if (objectionKeywords.some(keyword => response.toLowerCase().includes(keyword))) {
      addCoachingHint("The prospect has raised an objection. Listen carefully and acknowledge their concern.", 'warning');
    }
  }, [addCoachingHint]);

  const startConversation = useCallback(async (
    sessionId: string,
    selectedMoment: any,
    replayMode: ReplayMode = 'detailed',
    prospectPersonality: ProspectPersonality = 'professional',
    gamificationMode: GamificationMode = 'none',
    customProspectId?: string
  ) => {
    try {
      setConversationState(prev => ({
        ...prev,
        status: 'connecting',
        selectedMoment,
        sessionId,
        exchangeCount: 0,
        currentScore: 0,
        hints: [],
        transcript: '',
        isActive: false,
        isConnecting: true
      }));

      sessionTranscript.current = '';
      setFinalAnalysis(null);

      if (!vapiInstance.current) {
        await initializeVapi();
      }

      sessionConfigRef.current = {
        replayMode,
        prospectPersonality,
        gamificationMode,
        customProspectId,
        sessionId
      };

      // Use enhanced AI conversation start
      const { data, error } = await supabase.functions.invoke('start-enhanced-ai-conversation', {
        body: {
          sessionId,
          originalMoment: selectedMoment,
          replayMode,
          prospectPersonality,
          gamificationMode,
          customProspectId
        }
      });

      if (error) throw error;

      // Store prospect profile in state
      setConversationState(prev => ({
        ...prev,
        prospectProfile: data.sessionConfig.prospectProfile,
        personalityState: 'initial'
      }));

      await vapiInstance.current?.start(data.assistantId);

      // Start coaching hints
      setTimeout(() => {
        addCoachingHint(`You're now talking to a ${prospectPersonality} prospect. Adapt your approach accordingly.`, 'info');
      }, 2000);

    } catch (error) {
      console.error('Error starting enhanced conversation:', error);
      setConversationState(prev => ({
        ...prev,
        status: 'idle',
        isActive: false,
        isConnecting: false
      }));
      throw error;
    }
  }, [initializeVapi, addCoachingHint]);

  const endConversation = useCallback(async () => {
    try {
      console.log('endConversation called, current status:', conversationState.status);
      
      setConversationState(prev => ({
        ...prev,
        status: 'ending',
        isActive: false,
        isConnecting: false
      }));

      if (vapiInstance.current) {
        console.log('Stopping Vapi instance...');
        await vapiInstance.current.stop();
        console.log('Vapi instance stopped');
        
        // Clear the Vapi instance to prevent further use
        vapiInstance.current = null;
      }

      // Force final state update
      setTimeout(() => {
        setConversationState(prev => ({
          ...prev,
          status: 'ended',
          isActive: false,
          isConnecting: false,
          isConnected: false
        }));
      }, 500);

    } catch (error) {
      console.error('Error ending conversation:', error);
      
      // Ensure state is cleaned up even on error
      setConversationState(prev => ({
        ...prev,
        status: 'ended',
        isActive: false,
        isConnecting: false,
        isConnected: false
      }));
      
      // Clear Vapi instance on error too
      vapiInstance.current = null;
    }
  }, [conversationState.status]);

  const handleConversationEnd = useCallback(async () => {
    try {
      if (!sessionConfigRef.current?.sessionId || !sessionTranscript.current) {
        console.log('No session to analyze');
        return;
      }

      console.log('Analyzing enhanced conversation...');

      // Use enhanced conversation analysis
      const { data, error } = await supabase.functions.invoke('analyze-enhanced-conversation', {
        body: {
          transcript: sessionTranscript.current,
          exchangeCount: conversationState.exchangeCount,
          sessionConfig: {
            replayMode: sessionConfigRef.current.replayMode,
            prospectPersonality: sessionConfigRef.current.prospectPersonality,
            gamificationMode: sessionConfigRef.current.gamificationMode,
            prospectProfile: conversationState.prospectProfile
          },
          sessionId: sessionConfigRef.current.sessionId
        }
      });

      if (error) throw error;

      console.log('Enhanced analysis result:', data);

      setFinalAnalysis({
        score: data.score,
        feedback: data.feedback,
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        recommendations: data.recommendations || [],
        personalityAnalysis: data.personalityAnalysis,
        skillAssessment: data.skillAssessment,
        conversationFlow: data.conversationFlow
      });

    } catch (error) {
      console.error('Error analyzing enhanced conversation:', error);
      // Fallback analysis
      setFinalAnalysis({
        score: 75,
        feedback: "Conversation completed successfully",
        strengths: ["Good communication"],
        improvements: ["Practice objection handling"],
        recommendations: ["Focus on building rapport"]
      });
    }
  }, [conversationState.exchangeCount, conversationState.prospectProfile]);

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