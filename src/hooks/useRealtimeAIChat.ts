import { useState, useRef, useCallback, useEffect } from 'react';
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
  status: 'idle' | 'connecting' | 'active' | 'ending' | 'ended' | 'error';
  isConnected: boolean;
  transcript: string;
  exchangeCount: number;
  currentScore: number;
  hints: CoachingHint[];
  selectedMoment?: any;
  sessionId?: string;
  prospectProfile?: any;
  personalityState?: string;
  error?: string;
  retryAvailable?: boolean;
  // Computed properties for backward compatibility
  get isActive(): boolean;
  get isConnecting(): boolean;
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
  const [conversationState, setConversationState] = useState<ConversationState>(() => {
    const baseState = {
      status: 'idle' as const,
      isConnected: false,
      transcript: '',
      exchangeCount: 0,
      currentScore: 0,
      hints: [],
    };
    
    // Add computed properties
    Object.defineProperty(baseState, 'isActive', {
      get() { return this.status === 'active'; },
      enumerable: true
    });
    
    Object.defineProperty(baseState, 'isConnecting', {
      get() { return this.status === 'connecting'; },
      enumerable: true
    });
    
    return baseState as ConversationState;
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
        setConversationState(prev => {
          const newState = {
            ...prev,
            status: 'active' as const,
            isConnected: true,
            error: undefined,
            retryAvailable: false
          };
          // Redefine computed properties
          Object.defineProperty(newState, 'isActive', {
            get() { return this.status === 'active'; },
            enumerable: true
          });
          Object.defineProperty(newState, 'isConnecting', {
            get() { return this.status === 'connecting'; },
            enumerable: true
          });
          return newState as ConversationState;
        });
      });

      vapi.on('call-end', () => {
        console.log('Call ended');
        setConversationState(prev => {
          const newState = {
            ...prev,
            status: 'ended' as const,
            isConnected: false
          };
          Object.defineProperty(newState, 'isActive', {
            get() { return this.status === 'active'; },
            enumerable: true
          });
          Object.defineProperty(newState, 'isConnecting', {
            get() { return this.status === 'connecting'; },
            enumerable: true
          });
          return newState as ConversationState;
        });
        
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
        console.log('📞 Vapi message received:', message.type, message);
        
        // Handle transcript messages more comprehensively
        if (message.type === 'transcript' && message.transcript) {
          const transcriptText = typeof message.transcript === 'object' 
            ? message.transcript.text || message.transcript.content || JSON.stringify(message.transcript)
            : message.transcript;
            
          if (transcriptText && transcriptText.trim()) {
            console.log('📝 Adding transcript:', transcriptText.trim());
            sessionTranscript.current += transcriptText.trim() + '\n';
            
            // Store in session storage as backup
            sessionStorage.setItem(`transcript_${sessionConfigRef.current?.sessionId}`, sessionTranscript.current);
            
            setConversationState(prev => {
              const newState = {
                ...prev,
                transcript: sessionTranscript.current,
                exchangeCount: prev.exchangeCount + 1
              };
              Object.defineProperty(newState, 'isActive', {
                get() { return this.status === 'active'; },
                enumerable: true
              });
              Object.defineProperty(newState, 'isConnecting', {
                get() { return this.status === 'connecting'; },
                enumerable: true
              });
              return newState as ConversationState;
            });
          }
        }
        
        // Handle other message types for additional transcript collection
        if (message.type === 'conversation-update' && message.conversation) {
          console.log('🔄 Conversation update:', message.conversation);
          // Extract transcript from conversation updates if available
        }
        
        // Handle function calls and responses
        if (message.type === 'function-call' || message.type === 'function-result') {
          console.log('🔧 Function call/result:', message);
        }
      });

      vapiInstance.current = vapi;
      return vapi;
    } catch (error) {
      console.error('Error initializing Vapi:', error);
      throw error;
    }
  }, []);

  // Cleanup on unmount - avoid dependency array to prevent unnecessary re-runs
  useEffect(() => {
    return () => {
      // Only cleanup if there's an active VAPI instance
      if (vapiInstance.current) {
        console.log('useRealtimeAIChat cleanup: ending conversation...');
        vapiInstance.current.stop().catch(console.error);
        vapiInstance.current = null;
      }
    };
  }, []); // Empty dependency array to run only on mount/unmount

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
    console.log('=== Starting Enhanced Conversation ===', {
      sessionId,
      replayMode,
      prospectPersonality,
      gamificationMode,
      customProspectId
    });

    try {
      setConversationState(prev => {
        const newState = {
          ...prev,
          status: 'connecting' as const,
          selectedMoment,
          sessionId,
          exchangeCount: 0,
          currentScore: 0,
          hints: [],
          transcript: '',
          error: undefined,
          retryAvailable: false
        };
        Object.defineProperty(newState, 'isActive', {
          get() { return this.status === 'active'; },
          enumerable: true
        });
        Object.defineProperty(newState, 'isConnecting', {
          get() { return this.status === 'connecting'; },
          enumerable: true
        });
        return newState as ConversationState;
      });

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

      // Use enhanced AI conversation start with comprehensive error handling
      console.log('Invoking start-enhanced-ai-conversation...');
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

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to start conversation');
      }

      if (!data || !data.assistantId) {
        console.error('Invalid response from start-enhanced-ai-conversation:', data);
        throw new Error('Invalid response from conversation service');
      }

      console.log('Enhanced AI conversation started successfully:', data);

      // Store prospect profile in state
      setConversationState(prev => ({
        ...prev,
        prospectProfile: data.sessionConfig.prospectProfile,
        personalityState: 'initial'
      }));

      await vapiInstance.current?.start(data.assistantId);

      // Coaching hints disabled

    } catch (error) {
      console.error('=== Error starting enhanced conversation ===', error);
      
      let errorMessage = 'Failed to start conversation';
      let retryAvailable = false;
      
      if (error.message?.includes('busy') || error.message?.includes('429')) {
        errorMessage = 'AI service is currently busy. Please try again in a moment.';
        retryAvailable = true;
      } else if (error.message?.includes('authentication')) {
        errorMessage = 'Authentication required. Please sign in again.';
      } else if (error.message?.includes('configuration')) {
        errorMessage = 'Service configuration error. Please contact support.';
      }
      
      setConversationState(prev => {
        const newState = {
          ...prev,
          status: 'error' as const,
          error: errorMessage,
          retryAvailable
        };
        Object.defineProperty(newState, 'isActive', {
          get() { return this.status === 'active'; },
          enumerable: true
        });
        Object.defineProperty(newState, 'isConnecting', {
          get() { return this.status === 'connecting'; },
          enumerable: true
        });
        return newState as ConversationState;
      });
      
      throw new Error(errorMessage);
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
      // Check if we have sufficient session data and transcript
      if (!sessionConfigRef.current?.sessionId) {
        console.log('❌ No session ID to analyze');
        return;
      }

      // Check session storage backup first
      const backupTranscript = sessionStorage.getItem(`transcript_${sessionConfigRef.current.sessionId}`);
      const finalTranscript = sessionTranscript.current || backupTranscript || '';

      console.log('📊 Pre-analysis validation:', {
        sessionId: sessionConfigRef.current.sessionId,
        transcriptLength: finalTranscript.length,
        transcriptSample: finalTranscript.substring(0, 100) + '...',
        exchangeCount: conversationState.exchangeCount,
        hasBackup: !!backupTranscript
      });

      if (!finalTranscript || finalTranscript.trim().length < 10) {
        console.log('❌ Insufficient transcript for analysis:', finalTranscript?.length || 0, 'characters');
        
        // Create minimal fallback analysis
        setFinalAnalysis({
          score: 50,
          feedback: "Conversation was too short to provide detailed analysis. Try speaking for at least 30 seconds to get meaningful feedback.",
          strengths: ["Initiated conversation"],
          improvements: ["Extend conversation length", "Engage more with the prospect"],
          recommendations: ["Practice longer conversations", "Ask more questions"]
        });
        return;
      }

      console.log('🔄 Starting enhanced conversation analysis...');

      // Add loading state
      setConversationState(prev => ({
        ...prev,
        status: 'analyzing' as any
      }));

      // Use enhanced conversation analysis with retry logic
      let analysisResult;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          console.log(`📊 Analysis attempt ${attempts + 1}/${maxAttempts}`);
          
          const { data, error } = await supabase.functions.invoke('analyze-enhanced-conversation', {
            body: {
              transcript: finalTranscript,
              exchangeCount: Math.max(conversationState.exchangeCount, 1),
              sessionConfig: {
                replayMode: sessionConfigRef.current.replayMode,
                prospectPersonality: sessionConfigRef.current.prospectPersonality,
                gamificationMode: sessionConfigRef.current.gamificationMode,
                prospectProfile: conversationState.prospectProfile
              },
              sessionId: sessionConfigRef.current.sessionId,
              retryAttempt: attempts + 1
            }
          });

          if (error) throw error;
          
          analysisResult = data;
          console.log('✅ Analysis successful:', analysisResult);
          break;
          
        } catch (error) {
          attempts++;
          console.error(`❌ Analysis attempt ${attempts} failed:`, error);
          
          if (attempts >= maxAttempts) {
            throw error;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }

      const finalAnalysisData = {
        score: analysisResult?.score || 75,
        feedback: analysisResult?.feedback || "Analysis completed with limited data",
        strengths: analysisResult?.strengths || ["Completed the conversation"],
        improvements: analysisResult?.improvements || ["Practice active listening", "Ask more probing questions"],
        recommendations: analysisResult?.recommendations || ["Continue practicing", "Focus on rapport building"],
        personalityAnalysis: analysisResult?.personalityAnalysis,
        skillAssessment: analysisResult?.skillAssessment,
        conversationFlow: analysisResult?.conversationFlow
      };

      console.log('📈 Final analysis prepared:', finalAnalysisData);
      setFinalAnalysis(finalAnalysisData);

    } catch (error) {
      console.error('❌ Critical error in analysis pipeline:', error);
      
      // Enhanced fallback analysis
      setFinalAnalysis({
        score: 65,
        feedback: "Analysis service encountered an issue, but your conversation was recorded. The transcript shows good engagement with the prospect.",
        strengths: ["Maintained conversation flow", "Showed persistence"],
        improvements: ["Work on systematic approach", "Practice handling technical objections"],
        recommendations: ["Try another practice session", "Focus on specific objection handling techniques"]
      });
    } finally {
      // Clean up session storage
      if (sessionConfigRef.current?.sessionId) {
        sessionStorage.removeItem(`transcript_${sessionConfigRef.current.sessionId}`);
      }
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
    finalAnalysis
  };
};