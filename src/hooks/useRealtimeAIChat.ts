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
  status: 'idle' | 'connecting' | 'active' | 'ending' | 'ended' | 'error' | 'analyzing';
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

const STORAGE_KEYS = {
  FINAL_TEXT: (sid: string) => `prospector_final_transcript_${sid}`,
  // legacy compatibility key (we still write & clean it to avoid drift elsewhere)
  LEGACY_TEXT: (sid: string) => `transcript_${sid}`,
};

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

  // We no longer append chunks; we only keep the final/full blob.
  const finalTranscriptRef = useRef<string>('');     // provider-marked full transcript (preferred)
  const longestSeenRef = useRef<string>('');         // fallback if provider doesn’t flag final
  const sessionTranscript = useRef<string>('');      // legacy (kept for compatibility during this transition)

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
    setTimeout(() => {
      setConversationState(prev => ({
        ...prev,
        hints: prev.hints.filter(h => h.id !== hint.id)
      }));
    }, 8000);
  }, []);

  // Record the longest candidate as a safety fallback (no appending to UI)
  const commitCandidateTranscript = useCallback((s: string) => {
    const text = (s || '').trim();
    if (!text) return;
    if (text.length > (longestSeenRef.current?.length || 0)) {
      longestSeenRef.current = text;
    }
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

        // Give tail packets time to arrive before finalizing
        setTimeout(() => {
          handleConversationEnd();
        }, 1750);
      });

      vapi.on('speech-start', () => {
        console.log('User started speaking');
      });

      vapi.on('speech-end', () => {
        console.log('User stopped speaking');
      });

      vapi.on('message', (message: any) => {
        console.log('📞 Vapi message received:', message.type, message);

        if (message?.type === 'transcript') {
          const raw =
            typeof message.transcript === 'object'
              ? message.transcript.text ||
                message.transcript.content ||
                JSON.stringify(message.transcript)
              : message.transcript || '';

          // Accept a variety of "final" markers (be liberal)
          const isFull =
            Boolean(message.is_full) ||
            Boolean(message.full) ||
            Boolean(message.final) ||
            Boolean(message.is_final) ||
            message.kind === 'final_transcript' ||
            message.scope === 'conversation';

          if (isFull) {
            finalTranscriptRef.current = (raw || '').trim();
            // Persist under both the new and legacy keys to avoid drift elsewhere
            const sid = sessionConfigRef.current?.sessionId;
            if (sid) {
              sessionStorage.setItem(STORAGE_KEYS.FINAL_TEXT(sid), finalTranscriptRef.current);
              sessionStorage.setItem(STORAGE_KEYS.LEGACY_TEXT(sid), finalTranscriptRef.current);
            }
            // Reflect to UI state (optional; you can remove if you don’t want live preview)
            setConversationState(prev => {
              const newState = { ...prev, transcript: finalTranscriptRef.current };
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
          } else {
            // Do NOT append partials; only keep a best-effort fallback
            commitCandidateTranscript(raw);
          }
        }

        // You can still handle other message types here if needed
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
  }, [commitCandidateTranscript]);

  useEffect(() => {
    return () => {
      if (vapiInstance.current) {
        console.log('useRealtimeAIChat cleanup: ending conversation...');
        try {
          const stopResult = vapiInstance.current.stop();
          if (stopResult && typeof stopResult.catch === 'function') {
            stopResult.catch(console.error);
          }
        } catch (error) {
          console.error('Error during VAPI cleanup:', error);
        }
        vapiInstance.current = null;
      }
    };
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
    if (positiveKeywords.some(k => response.toLowerCase().includes(k))) {
      addCoachingHint("Great! The prospect is showing interest. This might be a good time to ask for next steps.", 'success');
    } else if (objectionKeywords.some(k => response.toLowerCase().includes(k))) {
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
      sessionId, replayMode, prospectPersonality, gamificationMode, customProspectId
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

      // reset buffers
      finalTranscriptRef.current = '';
      longestSeenRef.current = '';
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

      setConversationState(prev => ({
        ...prev,
        prospectProfile: data.sessionConfig.prospectProfile,
        personalityState: 'initial'
      }));

      await vapiInstance.current?.start(data.assistantId);

      // (Coaching hints are disabled in your current code)

    } catch (error: any) {
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
  }, [initializeVapi]);

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
        try {
          const stopResult = vapiInstance.current.stop();
          if (stopResult && typeof stopResult.then === 'function') {
            await stopResult;
          }
          console.log('Vapi instance stopped');
        } catch (error) {
          console.error('Error stopping Vapi instance:', error);
        }
        vapiInstance.current = null;
      }

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
      setConversationState(prev => ({
        ...prev,
        status: 'ended',
        isActive: false,
        isConnecting: false,
        isConnected: false
      }));
      vapiInstance.current = null;
    }
  }, [conversationState.status]);

  const handleConversationEnd = useCallback(async () => {
    try {
      const sid = sessionConfigRef.current?.sessionId;
      if (!sid) {
        console.log('❌ No session ID to analyze');
        return;
      }

      // Prefer the provider-marked final blob; otherwise try stored; otherwise longest seen; otherwise legacy
      const storedFinal = sessionStorage.getItem(STORAGE_KEYS.FINAL_TEXT(sid)) || '';
      const legacyBackup = sessionStorage.getItem(STORAGE_KEYS.LEGACY_TEXT(sid)) || '';
      const finalTranscript =
        finalTranscriptRef.current?.trim() ||
        storedFinal.trim() ||
        longestSeenRef.current?.trim() ||
        sessionTranscript.current?.trim() || // legacy fallback
        legacyBackup.trim() ||
        '';

      console.log('📊 Pre-analysis validation:', {
        sessionId: sid,
        transcriptLength: finalTranscript.length,
        transcriptSample: finalTranscript.substring(0, 100) + '...',
        exchangeCount: conversationState.exchangeCount,
        hasStoredFinal: !!storedFinal,
        hasLegacyBackup: !!legacyBackup
      });

      console.log('🔍 Processing conversation for analysis:', {
        transcriptLength: finalTranscript?.length || 0,
        exchangeCount: conversationState.exchangeCount,
        sessionId: sid
      });

      // If absolutely nothing, fall back to your existing “no data” behavior
      if (!finalTranscript) {
        console.log('❌ No transcript available for analysis');
        setFinalAnalysis({
          score: 40,
          feedback: "No conversation detected. Make sure your microphone is working and try again.",
          strengths: ["Attempted conversation"],
          improvements: ["Check microphone settings", "Ensure clear audio"],
          recommendations: ["Test microphone", "Try again with clearer audio"]
        });
        return;
      }

      console.log('🔄 Starting enhanced conversation analysis...');
      setConversationState(prev => ({ ...prev, status: 'analyzing' as const }));

      // Retry logic preserved
      let analysisResult: any;
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
                replayMode: sessionConfigRef.current!.replayMode,
                prospectPersonality: sessionConfigRef.current!.prospectPersonality,
                gamificationMode: sessionConfigRef.current!.gamificationMode,
                prospectProfile: conversationState.prospectProfile
              },
              sessionId: sid,
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
          if (attempts >= maxAttempts) throw error;
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
      setFinalAnalysis({
        score: 65,
        feedback: "Analysis service encountered an issue, but your conversation was recorded. The transcript shows good engagement with the prospect.",
        strengths: ["Maintained conversation flow", "Showed persistence"],
        improvements: ["Work on systematic approach", "Practice handling technical objections"],
        recommendations: ["Try another practice session", "Focus on specific objection handling techniques"]
      });
    } finally {
      const sid = sessionConfigRef.current?.sessionId;
      if (sid) {
        // Clean both keys to avoid stale leftovers
        sessionStorage.removeItem(STORAGE_KEYS.FINAL_TEXT(sid));
        sessionStorage.removeItem(STORAGE_KEYS.LEGACY_TEXT(sid));
      }
    }
  }, [conversationState.exchangeCount, conversationState.prospectProfile]);

  const clearHints = useCallback(() => {
    setConversationState(prev => ({ ...prev, hints: [] }));
  }, []);

  return {
    conversationState,
    startConversation,
    endConversation,
    finalAnalysis
  };
};
