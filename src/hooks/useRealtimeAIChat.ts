import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectObjections, getObjectionCoaching, getPersonalityGuidance } from '@/utils/objectionDetection';
import { getMomentSpecificCoaching } from '@/utils/momentCoaching';
import { getAudioConfig } from '@/config/audioConfig';
import { waitUntil, waitForKrispReady, safePromise } from '@/utils/async';
import { audioLogger, AUDIO_PHASES } from '@/utils/audioLogger';


export type ReplayMode = 'detailed' | 'quick' | 'focused';
export type ProspectPersonality = 'skeptical' | 'enthusiastic' | 'professional' | 'aggressive' | 'analytical';
export type GamificationMode = 'none' | 'speed' | 'difficulty' | 'empathy';

interface CoachingHint {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'objection' | 'technique';
  timestamp: number;
  objectionType?: string;
  technique?: string;
  priority?: 'low' | 'medium' | 'high';
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
  sessionConfig?: any;
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

// Teardown state machine
type TeardownState = 'idle' | 'initializing' | 'ready' | 'tearing_down' | 'done';

interface UseRealtimeAIChatProps {
  isUploadCallReplay?: boolean;
  existingVapiInstance?: any; // Optional existing VAPI instance from parent
  useCase?: 'live' | 'replay'; // Audio processing use case
}

export const useRealtimeAIChat = ({ 
  isUploadCallReplay = false, 
  existingVapiInstance,
  useCase = 'live'
}: UseRealtimeAIChatProps = {}) => {
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
  
  // Core refs
  const vapiInstance = useRef<any>(null);
  const sessionTranscript = useRef<string>('');
  const sessionConfigRef = useRef<{
    replayMode: ReplayMode;
    prospectPersonality: ProspectPersonality;
    gamificationMode: GamificationMode;
    customProspectId?: string;
    sessionId?: string;
  } | null>(null);

  // Audio processing state management
  const krispState = useRef<TeardownState>('idle');
  const isStopping = useRef(false);
  const krispProcessor = useRef<any>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioConfig = getAudioConfig(useCase);

  const addCoachingHint = useCallback((
    message: string, 
    type: CoachingHint['type'] = 'info',
    options: {
      objectionType?: string;
      technique?: string;
      priority?: 'low' | 'medium' | 'high';
      duration?: number;
    } = {}
  ) => {
    const timestamp = Date.now();
    const hint: CoachingHint = {
      id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      timestamp,
      objectionType: options.objectionType,
      technique: options.technique,
      priority: options.priority || 'medium'
    };
    
    setConversationState(prev => ({
      ...prev,
      hints: [...prev.hints.slice(-3), hint] // Keep only last 4 hints
    }));

    // Variable auto-remove duration based on type and priority
    const duration = options.duration || (
      type === 'objection' ? 20000 : // 20 seconds for objections
      type === 'technique' ? 15000 : // 15 seconds for techniques
      options.priority === 'high' ? 12000 : // 12 seconds for high priority
      8000 // 8 seconds default
    );

    setTimeout(() => {
      setConversationState(prev => ({
        ...prev,
        hints: prev.hints.filter(h => h.id !== hint.id)
      }));
    }, duration);
  }, []);

  const initializeVapi = useCallback(async () => {
    try {
      // If we have an existing VAPI instance from parent, use it instead of creating a new one
      if (existingVapiInstance) {
        console.log('Using existing VAPI instance from parent component');
        vapiInstance.current = existingVapiInstance;
        return existingVapiInstance;
      }

      // Only create a new instance if no existing one is provided
      if (vapiInstance.current) {
        try {
          await vapiInstance.current.stop();
        } catch (error) {
          console.warn('Error stopping previous Vapi instance:', error);
        }
        vapiInstance.current = null;
      }

      const { data, error } = await supabase.functions.invoke('get-vapi-key');
      
      if (error) throw error;

      console.log('Vapi initialized with public key');
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

      vapi.on('error', (error: any) => {
        console.error('Vapi error:', error);
        // Don't end the call for minor errors like Krisp processor issues
        if (error?.message?.includes('WASM_OR_WORKER_NOT_READY') || 
            error?.message?.includes('krisp processor')) {
          console.warn('Ignoring Krisp processor error:', error.message);
          return;
        }
        
        // For other errors, end the conversation
        setConversationState(prev => ({
          ...prev,
          status: 'ended',
          isConnected: false,
          isActive: false,
          isConnecting: false
        }));
      });

      vapi.on('message', (message: any) => {
        console.log('Vapi message received in useRealtimeAIChat:', message.type);
        
        // DO NOT process transcripts here - they are handled by useTranscriptManager
        // Only handle non-transcript message types for coaching and analysis
        
        if (message.type === 'transcript' && message.transcript && message.role === 'assistant') {
          // Only analyze AI responses for coaching, don't duplicate transcript processing
          const transcriptText = typeof message.transcript === 'string' 
            ? message.transcript 
            : message.transcript.text || message.transcript.content || '';
          
          if (transcriptText && transcriptText.trim()) {
            // Just analyze for coaching opportunities - don't store the transcript
            analyzeAIResponse(transcriptText, sessionConfigRef.current?.prospectPersonality);
            
            // Update exchange count without storing transcript
            setConversationState(prev => ({
              ...prev,
              exchangeCount: prev.exchangeCount + (message.role === 'user' ? 1 : 0)
            }));
          }
        }
      });

      vapiInstance.current = vapi;
      return vapi;
    } catch (error) {
      console.error('Error initializing Vapi:', error);
      throw error;
    }
  }, [existingVapiInstance]);

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

  const analyzeAIResponse = useCallback((response: string, prospectPersonality?: string) => {
    const personality = prospectPersonality || 'professional';
    
    // Detect objections with sophisticated analysis
    const detectedObjections = detectObjections(response);
    
    if (detectedObjections.length > 0) {
      const primaryObjection = detectedObjections[0];
      const coaching = getObjectionCoaching(primaryObjection.type, personality);
      
      if (coaching) {
        // Immediate objection handling coaching
        addCoachingHint(
          coaching.immediate,
          'objection',
          {
            objectionType: primaryObjection.type,
            technique: coaching.technique,
            priority: 'high',
            duration: 20000
          }
        );
        
        // Follow-up technique hint
        if (coaching.followUp) {
          setTimeout(() => {
            addCoachingHint(
              coaching.followUp!,
              'technique',
              {
                technique: coaching.technique,
                priority: 'medium',
                duration: 15000
              }
            );
          }, 5000);
        }
        
        // Example response hint
        if (coaching.example) {
          setTimeout(() => {
            addCoachingHint(
              `Try: "${coaching.example}"`,
              'info',
              {
                priority: 'medium',
                duration: 12000
              }
            );
          }, 10000);
        }
      }
      
      return; // Exit early for objections
    }
    
    // Analyze positive signals
    const positiveKeywords = ['interested', 'sounds good', 'tell me more', 'that could work', 'makes sense', 'compelling'];
    const buyingSignals = ['when', 'how', 'timeline', 'implementation', 'next step', 'contract', 'pricing', 'proposal'];
    
    if (buyingSignals.some(keyword => response.toLowerCase().includes(keyword))) {
      addCoachingHint(
        "Strong buying signal detected! The prospect is ready to move forward. Ask for next steps or a commitment.",
        'success',
        { priority: 'high', duration: 15000 }
      );
    } else if (positiveKeywords.some(keyword => response.toLowerCase().includes(keyword))) {
      addCoachingHint(
        "Positive response! Build on their interest by sharing a relevant case study or asking discovery questions.",
        'success',
        { priority: 'medium' }
      );
    }
    
    // Check for stalling tactics
    const stallingKeywords = ['think about it', 'consider', 'discuss', 'review', 'later', 'maybe'];
    if (stallingKeywords.some(keyword => response.toLowerCase().includes(keyword))) {
      addCoachingHint(
        "They're stalling. Ask what specific concerns they need to address before moving forward.",
        'warning',
        { priority: 'high' }
      );
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
    // Choose the appropriate edge function based on call type
    const functionName = isUploadCallReplay ? 'start-replay-conversation' : 'start-enhanced-ai-conversation';
    
    try {
      console.log('Starting conversation with session:', sessionId);
      
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

      // Initialize or use existing Vapi instance
      if (!existingVapiInstance) {
        await initializeVapi();
      } else {
        vapiInstance.current = existingVapiInstance;
      }

      sessionConfigRef.current = {
        replayMode,
        prospectPersonality,
        gamificationMode,
        customProspectId,
        sessionId
      };

      console.log(`Using edge function: ${functionName}`);
      
      // Use the appropriate AI conversation start function
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          sessionId,
          originalMoment: selectedMoment,
          replayMode,
          prospectPersonality,
          gamificationMode,
          customProspectId,
          // For replay conversations, include session configuration
          ...(isUploadCallReplay && {
            transcript: '', // Will be populated during conversation
            exchangeCount: 0,
            sessionConfig: {
              replayMode,
              prospectPersonality,
              gamificationMode,
              originalMoment: selectedMoment
            }
          })
        }
      });

      if (error) throw error;

      console.log(`${functionName} configured successfully, starting Vapi call...`);

      // For upload call replay, the response structure is different
      if (isUploadCallReplay) {
        if (!data.assistantId) {
          throw new Error('No assistant ID returned from replay conversation function');
        }
        
        // Store replay session config
        setConversationState(prev => ({
          ...prev,
          sessionConfig: data.sessionConfig
        }));
      } else {
        // Store prospect profile in state (for enhanced conversations)
        setConversationState(prev => ({
          ...prev,
          prospectProfile: data.sessionConfig?.prospectProfile,
          personalityState: 'initial'
        }));
      }

      // Start the actual call
      if (!vapiInstance.current) {
        throw new Error('Vapi instance not initialized');
      }

      await vapiInstance.current.start(data.assistantId);
      console.log('Vapi call started with assistant:', data.assistantId);

      // Add personality-specific coaching (for both types)
      setTimeout(() => {
        const personalityGuidance = getPersonalityGuidance(prospectPersonality);
        addCoachingHint(
          `${prospectPersonality.charAt(0).toUpperCase() + prospectPersonality.slice(1)} prospect detected. ${personalityGuidance.approach}`,
          'info',
          { priority: 'high', duration: 12000 }
        );
      }, 2000);
      
      // Add moment-specific coaching
      if (selectedMoment?.type) {
        setTimeout(() => {
          const momentCoaching = getMomentSpecificCoaching(selectedMoment.type, prospectPersonality);
          if (momentCoaching) {
            addCoachingHint(momentCoaching, 'technique', { priority: 'high' });
          }
        }, 5000);
      }

    } catch (error) {
      console.error(`Error starting ${functionName}:`, error);
      setConversationState(prev => ({
        ...prev,
        status: 'idle',
        isActive: false,
        isConnecting: false
      }));
      throw error;
    }
  }, [initializeVapi, addCoachingHint]);

  // Safe Krisp unloading with state management
  const safeUnloadKrisp = useCallback(async (): Promise<void> => {
    const currentState = krispState.current;
    audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Safe Krisp unload start', { state: currentState });

    if (!krispProcessor.current || currentState === 'done') {
      audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Krisp already unloaded or not initialized');
      return;
    }

    if (currentState === 'initializing') {
      audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Waiting for Krisp initialization to complete');
      // Short backoff-and-try (max ~1s), then bail silently
      try {
        await waitUntil(
          () => krispState.current === 'ready',
          { timeout: audioConfig.KRISP_INIT_TIMEOUT, interval: audioConfig.KRISP_READY_CHECK_INTERVAL }
        );
      } catch (e) {
        audioLogger.warn(AUDIO_PHASES.TEARDOWN, 'Timeout waiting for Krisp ready', { error: (e as Error).message });
        return;
      }
    }

    if (krispState.current !== 'ready') {
      audioLogger.warn(AUDIO_PHASES.TEARDOWN, 'Krisp not ready, skipping unload');
      return;
    }

    try {
      krispState.current = 'tearing_down';
      if (krispProcessor.current?.unload) {
        await krispProcessor.current.unload();
      }
      audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Krisp unloaded successfully');
    } catch (e) {
      audioLogger.warn(AUDIO_PHASES.TEARDOWN, 'Krisp unload skipped', { error: (e as Error).message });
    } finally {
      krispState.current = 'done';
      krispProcessor.current = null;
    }
  }, [audioConfig]);

  // Idempotent stop function
  const stop = useCallback(async (reason?: string): Promise<void> => {
    if (isStopping.current) {
      audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Stop already in progress');
      return;
    }

    isStopping.current = true;
    audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Call stop begin', { reason });

    try {
      // 1) Stop realtime/vapi session
      if (vapiInstance.current) {
        await safePromise(vapiInstance.current.stop());
        audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Vapi stopped');
      }

      // 2) Stop mic tracks
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            audioLogger.warn(AUDIO_PHASES.TEARDOWN, 'Track stop failed', { error: (e as Error).message });
          }
        });
        mediaStream.current = null;
        audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Media tracks stopped');
      }

      // 3) Disconnect audio nodes in reverse order
      // This should be implemented based on your audio graph structure
      // disconnectGraph();

      // 4) Close owned AudioContext (if we created it)
      if (audioContext.current && audioContext.current.state !== 'closed') {
        await safePromise(audioContext.current.close());
        audioContext.current = null;
        audioLogger.info(AUDIO_PHASES.TEARDOWN, 'AudioContext closed');
      }

      // 5) Unload Krisp ONLY if ready and enabled
      if (audioConfig.enableKrisp) {
        await safeUnloadKrisp();
      }

      audioLogger.info(AUDIO_PHASES.TEARDOWN, 'Call stop done');
    } catch (error) {
      audioLogger.error(AUDIO_PHASES.TEARDOWN, 'Stop failed', { error: (error as Error).message });
    } finally {
      isStopping.current = false;
      
      // Clear the Vapi instance to prevent further use
      vapiInstance.current = null;
    }
  }, [audioConfig.enableKrisp, safeUnloadKrisp]);

  const endConversation = useCallback(async () => {
    try {
      audioLogger.info(AUDIO_PHASES.TEARDOWN, 'End conversation called', { 
        status: conversationState.status,
        useCase 
      });
      
      setConversationState(prev => ({
        ...prev,
        status: 'ending',
        isActive: false,
        isConnecting: false
      }));

      // Use the idempotent stop function
      await stop('end-conversation');

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

      console.log('Analyzing conversation...');

      // Use the appropriate analysis function
      const analysisFunction = isUploadCallReplay ? 'analyze-replay-conversation' : 'analyze-enhanced-conversation';
      const { data, error } = await supabase.functions.invoke(analysisFunction, {
        body: {
          transcript: sessionTranscript.current,
          exchangeCount: conversationState.exchangeCount,
          sessionConfig: {
            replayMode: sessionConfigRef.current.replayMode,
            prospectPersonality: sessionConfigRef.current.prospectPersonality,
            gamificationMode: sessionConfigRef.current.gamificationMode,
            prospectProfile: conversationState.prospectProfile,
            originalMoment: conversationState.selectedMoment
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