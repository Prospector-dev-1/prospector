import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectObjections, getObjectionCoaching, getPersonalityGuidance } from '@/utils/objectionDetection';
import { getMomentSpecificCoaching } from '@/utils/momentCoaching';


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

      // Start with personality-specific coaching
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