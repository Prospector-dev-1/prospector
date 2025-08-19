import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRealtimeAIChat } from '@/hooks/useRealtimeAIChat';
import { useTranscriptSession } from '@/hooks/useTranscriptSession';
import { TranscriptDisplay } from '@/components/TranscriptDisplay';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MobileLayout from '@/components/MobileLayout';
import SEO from '@/components/SEO';
import CoachingHints from '@/components/CoachingHints';
import { Slider } from "@/components/ui/slider";
import SmartBackButton from '@/components/SmartBackButton';
import { useToast } from '@/components/ui/use-toast';
import VapiService from '@/utils/vapiService';
import { supabase } from '@/integrations/supabase/client';
import { persistTranscript, generateTranscriptChecksum } from '@/utils/transcriptPersistence';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  User, 
  Clock,
  Signal,
  TrendingUp,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';

const LiveCall = () => {
  const { sessionId, callRecordId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const {
    conversationState,
    startConversation,
    endConversation,
    finalAnalysis
  } = useRealtimeAIChat();
  
  // Call simulation specific state
  const [vapiService] = useState(() => VapiService.getInstance());
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [callStartTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState([80]);
  const [confidence, setConfidence] = useState(75);
  const [responseSpeed, setResponseSpeed] = useState(85);

  // Guard to prevent duplicate analysis triggers
  const analyzingRef = useRef(false);

  // Get session config from URL params or localStorage
  const [sessionConfig] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    const mode = urlParams.get('mode') || 'practice';
    
    if (mode === 'call_simulation') {
      return {
        replayMode: 'call_simulation',
        businessType: urlParams.get('business_type') || '',
        prospectRole: urlParams.get('prospect_role') || 'Business Owner',
        callObjective: urlParams.get('call_objective') || '',
        difficulty: parseInt(urlParams.get('difficulty') || '5'),
        customInstructions: urlParams.get('custom_instructions') || '',
        assistantId: '', // Will be set after start-call function
        callRecordId: '', // Will be set after start-call function
        autoStart: urlParams.get('auto_start') === 'true',
        originalMoment: { prospect_name: urlParams.get('prospect_role') || 'Business Owner' }
      };
    }
    
    return {
      replayMode: mode,
      prospectPersonality: urlParams.get('personality') || 'professional',
      gamificationMode: urlParams.get('gamification') || 'streak_builder',
      originalMoment: JSON.parse(urlParams.get('moment') || '{}')
    };
  });

  // New transcript session management - initialized after sessionConfig
  const transcriptSession = useTranscriptSession(sessionConfig.callRecordId || `session-${Date.now()}`);

  // State for call setup process
  const [isSettingUp, setIsSettingUp] = useState(sessionConfig.replayMode === 'call_simulation' && sessionConfig.autoStart);
  const [setupError, setSetupError] = useState<string | null>(null);
  
  // Initialize Vapi for call simulation with centralized event management
  useEffect(() => {
    if (sessionConfig.replayMode === 'call_simulation') {
      let cleanup: (() => void) | undefined;

      const initializeCall = async () => {
        try {
          setIsSettingUp(true);
          setSetupError(null);

          await vapiService.initialize();

          // Define event handlers
          const eventHandlers = {
            onCallStart: () => {
              console.log('Call started in LiveCall');
              setIsCallActive(true);
              setIsSettingUp(false);
            },
            onCallEnd: () => {
              handleCallSimulationEnd();
            }
          };

          // Set up stable event listeners - SINGLE message handler only
          vapiService.on('call-start', eventHandlers.onCallStart);
          vapiService.on('call-end', eventHandlers.onCallEnd);
          vapiService.on('message', (message: any) => {
            console.log('Raw VAPI message in LiveCall:', message.type);
            transcriptSession.processVapiMessage(message);
          });
          // Attach explicit transcript-related events as fallback (SDK variants)
          vapiService.on('transcript', (evt: any) => {
            console.log('VAPI transcript event:', evt);
            transcriptSession.processVapiMessage({ type: 'transcript', ...evt });
          });
          vapiService.on('transcript.partial', (evt: any) => {
            console.log('VAPI transcript.partial event:', evt);
            transcriptSession.processVapiMessage({ type: 'transcript', isFinal: false, ...evt });
          });
          vapiService.on('transcript.final', (evt: any) => {
            console.log('VAPI transcript.final event:', evt);
            transcriptSession.processVapiMessage({ type: 'transcript', isFinal: true, ...evt });
          });
          vapiService.on('speech-update', (evt: any) => {
            console.log('VAPI speech-update event:', evt);
            transcriptSession.processVapiMessage({ type: 'speech-update', ...evt });
          });
          vapiService.on('conversation-update', (evt: any) => {
            console.log('VAPI conversation-update event:', evt);
            transcriptSession.processVapiMessage({ type: 'conversation-update', ...evt });
          });

          // Store cleanup function
            cleanup = () => {
              try {
                vapiService.off('call-start', eventHandlers.onCallStart);
                vapiService.off('call-end', eventHandlers.onCallEnd);
                vapiService.off('message');
                vapiService.off('transcript');
                vapiService.off('transcript.partial');
                vapiService.off('transcript.final');
                vapiService.off('speech-update');
                vapiService.off('conversation-update');
                transcriptSession.clear();
                console.log('VAPI listeners cleaned up successfully');
              } catch (e) {
                console.error('Error cleaning up VAPI listeners:', e);
              }
            };

          // If auto-start is enabled, call the start-call function
          if (sessionConfig.autoStart) {
            console.log('Setting up call simulation...');

            const { data, error } = await supabase.functions.invoke('start-call', {
              body: {
                difficulty_level: sessionConfig.difficulty,
                business_type: sessionConfig.businessType,
                prospect_role: sessionConfig.prospectRole,
                call_objective: sessionConfig.callObjective,
                custom_instructions: sessionConfig.customInstructions
              }
            });

            if (error) throw new Error(error.message);
            if ((data as any).error) throw new Error((data as any).error);

            // Update session config with the received data
            sessionConfig.assistantId = (data as any).assistantId;
            sessionConfig.callRecordId = (data as any).callRecordId;

            // Set transcript session status to active
            transcriptSession.setStatus('active');

            console.log('Starting call with assistant:', (data as any).assistantId);
            await vapiService.startCall((data as any).assistantId);
          }
        } catch (error: any) {
          console.error('Error setting up call simulation:', error);
          setSetupError(error.message || 'Failed to set up call');
          setIsSettingUp(false);
          toast({
            title: 'Call Setup Failed',
            description: error.message || 'Failed to set up call. Please try again.',
            variant: 'destructive',
          });
        }
      };

      initializeCall();

      return cleanup;
    }
  }, [sessionConfig.replayMode, sessionConfig.autoStart]);
  
  // Timer for call simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCallActive && sessionConfig.replayMode === 'call_simulation') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCallActive, sessionConfig.replayMode]);

  // Timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-start conversation when component mounts (only for AI replay)
  useEffect(() => {
    if (sessionConfig.replayMode !== 'call_simulation') {
      const timer = setTimeout(() => {
        handleStartConversation();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [sessionConfig.replayMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationState.isActive || conversationState.isConnecting) {
        console.log('LiveCall unmounting, ending conversation...');
        endConversation();
      }
    };
  }, [conversationState.isActive, conversationState.isConnecting, endConversation]);

  const handleCallSimulationEnd = async () => {
    // Prevent duplicate calls (use ref for immediate guard)
    if (analyzingRef.current) {
      console.log('Analysis already in progress, skipping duplicate call');
      return;
    }
    analyzingRef.current = true;
    
    console.log('Call simulation ended');
    setIsCallActive(false);
    setIsAnalyzing(true);
    
    // Finalize transcript and get the cleaned version
    const finalTranscript = await transcriptSession.finalize();
    const finalDuration = Math.max(callDuration, 1); // Ensure minimum duration

    // Persist the finalized transcript
    if (finalTranscript.trim() && sessionConfig.callRecordId) {
      const wordCount = finalTranscript.split(/\s+/).length;
      const checksum = generateTranscriptChecksum(finalTranscript);
      
      await persistTranscript({
        callSessionId: sessionConfig.callRecordId,
        finalTranscript,
        wordCount,
        checksum,
        timeline: transcriptSession.state.timeline
      });
    }
    
    console.log('Final transcript length:', finalTranscript.length);
    console.log('Final duration:', finalDuration);
    
    // Update call record with transcript and duration first, with validation
    try {
      // Skip update if callRecordId is not available
      if (!sessionConfig.callRecordId) {
        console.log('No callRecordId available, skipping call record update');
        setIsAnalyzing(false);
        return;
      }

      const updateData = {
        transcript: finalTranscript,
        duration_seconds: finalDuration,
        call_status: finalTranscript.length > 0 ? 'analyzing' : 'failed'
      };
      
      const { error: updateError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', sessionConfig.callRecordId);
      
      if (updateError) {
        throw updateError;
      }
      
      console.log('Updated call record with transcript and duration');
    } catch (error) {
      console.error('Error updating call record:', error);
      toast({
        title: "Update Failed",
        description: "Failed to save call data. Please try again.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
      return;
    }

    // Only proceed with analysis if we have a valid transcript
    if (finalTranscript.length === 0) {
      console.log('No transcript captured, skipping analysis');
      toast({
        title: "No Transcript",
        description: "No conversation was captured. Please try speaking during the call.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
      navigate(`/call-results/${sessionConfig.callRecordId}`, { replace: true });
      return;
    }

    // Trigger proper call analysis using end-call-analysis function
    try {
      console.log('Starting call analysis...');
      const { data, error } = await supabase.functions.invoke('end-call-analysis', {
        body: {
          callRecordId: sessionConfig.callRecordId,
          transcript: finalTranscript,
          duration: finalDuration
        }
      });
      
      if (error) {
        console.error('Error invoking end-call-analysis:', error);
        toast({
          title: "Analysis Failed",
          description: "Call analysis failed. You can retry from the results page.",
          variant: "destructive",
        });
      } else {
        console.log('Call analysis completed successfully');
        toast({
          title: "Analysis Started",
          description: "Processing your call performance...",
        });
      }
    } catch (error) {
      console.error('Error analyzing call:', error);
      toast({
        title: "Analysis Failed", 
        description: "Call analysis failed. You can retry from the results page.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
    
    // Navigate immediately after analysis starts
    navigate(`/call-results/${sessionConfig.callRecordId}`, { replace: true });
  };

  const handleEndCall = async () => {
    try {
      if (sessionConfig.replayMode === 'call_simulation') {
        // End Vapi call
        await vapiService.stopCall();
        await handleCallSimulationEnd();
      } else {
        // End AI conversation
        await endConversation();
        navigate(`/call-analysis/${sessionId}`, {
          replace: true, // Prevent going back to ended call
          state: {
            sessionConfig,
            duration: Math.floor((currentTime - callStartTime) / 1000),
            score: conversationState.currentScore,
            exchanges: conversationState.exchangeCount,
            analysis: finalAnalysis || null
          }
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end call properly",
        variant: "destructive",
      });
    }
  };

  const formatCallDuration = () => {
    const duration = sessionConfig.replayMode === 'call_simulation' 
      ? callDuration 
      : Math.floor((currentTime - callStartTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartConversation = async () => {
    try {
      await startConversation(
        sessionId || 'default-session',
        sessionConfig.originalMoment,
        sessionConfig.replayMode as any,
        sessionConfig.prospectPersonality as any,
        sessionConfig.gamificationMode as any
      );
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to start the conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getConnectionStatus = () => {
    if (sessionConfig.replayMode === 'call_simulation') {
      if (isSettingUp) {
        return { text: 'Setting up call...', color: 'bg-yellow-500' };
      }
      if (setupError) {
        return { text: 'Setup failed', color: 'bg-red-500' };
      }
      if (isCallActive) {
        return { text: 'Call Active', color: 'bg-green-500' };
      }
      return { text: 'Call Ended', color: 'bg-red-500' };
    }
    
    if (conversationState.status === 'connecting') {
      return { text: 'Connecting...', color: 'bg-yellow-500' };
    }
    if (conversationState.isConnected) {
      return { text: 'Connected', color: 'bg-green-500' };
    }
    return { text: 'Disconnected', color: 'bg-red-500' };
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (sessionConfig.replayMode === 'call_simulation') {
      vapiService.setMuted(!isMuted);
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <>
      <SEO 
        title="Live Practice Call"
        description="Practice your sales skills with AI-powered real-time coaching"
      />
      <MobileLayout>
        <div className="min-h-screen bg-background">
          {/* Call Header */}
          <div className="sticky top-0 z-50 glass-card border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={isCallActive || conversationState.isActive ? 'default' : 'secondary'}>
                  <Signal className="h-3 w-3 mr-1" />
                  {connectionStatus.text}
                </Badge>
                <Badge variant="outline">
                  {sessionConfig.replayMode} mode
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-lg font-mono">
                <Clock className="h-4 w-4" />
                {formatCallDuration()}
              </div>
            </div>
          </div>

          {/* Main Call Interface */}
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4 space-y-8">
            
            {/* Analysis in Progress State */}
            {isAnalyzing && (
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-primary flex items-center justify-center">
                    <BarChart3 className="h-16 w-16 sm:h-20 sm:w-20 text-primary-foreground animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Analyzing Your Call</h2>
                  <p className="text-muted-foreground max-w-md">
                    Our AI is analyzing your performance and preparing detailed feedback. This will take a moment...
                  </p>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Regular Call Interface - only show if not analyzing */}
            {!isAnalyzing && (
              <>
            
            {/* AI Prospect Avatar */}
            <div className="relative">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-primary flex items-center justify-center">
                <User className="h-16 w-16 sm:h-20 sm:w-20 text-primary-foreground" />
              </div>
              
              {/* Breathing animation ring */}
              {(isCallActive || conversationState.isActive) && (
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              )}
              
              {/* Speaking indicator */}
              {(isCallActive || conversationState.isActive) && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="text-xs">
                    AI Speaking...
                  </Badge>
                </div>
              )}
            </div>

            {/* Prospect Info */}
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold">
                {sessionConfig.originalMoment?.prospect_name || 'AI Prospect'}
              </h2>
              <p className="text-muted-foreground">
                {sessionConfig.replayMode === 'call_simulation' 
                  ? `${sessionConfig.businessType || 'Business'} - Level ${sessionConfig.difficulty || 5}`
                  : `${sessionConfig.prospectPersonality} personality`
                }
              </p>
            </div>

            {/* Real-time Performance Metrics */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Confidence</span>
                </div>
                <div className="text-2xl font-bold text-primary">{confidence}%</div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Response</span>
                </div>
                <div className="text-2xl font-bold text-primary">{responseSpeed}%</div>
              </Card>
            </div>

            {/* Progress Indicators */}
            <div className="w-full max-w-md space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Conversation Progress</span>
                  <span>{conversationState.exchangeCount || 0}/10 exchanges</span>
                </div>
                <Progress value={(conversationState.exchangeCount || 0) * 10} className="h-2" />
              </div>
              
              {conversationState.currentScore && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Score</span>
                    <span className="font-medium">{conversationState.currentScore}/100</span>
                  </div>
                  <Progress value={conversationState.currentScore} className="h-2" />
                </div>
              )}
            </div>
            </>
            )}
          </div>

          {/* Volume Control */}
          {!isAnalyzing && (
            <div className="px-6 pb-4">
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <Volume2 className="h-4 w-4" />
                  <Slider
                    value={volume}
                    onValueChange={setVolume}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12">{volume[0]}%</span>
                </div>
              </Card>
            </div>
          )}

          {/* Call Controls */}
          {!isAnalyzing && (
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-sm border-t mobile-safe-bottom">
            <div className="flex justify-center items-center gap-6">
              {/* Mute Toggle */}
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="lg"
                onClick={toggleMute}
                className="rounded-full w-16 h-16"
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              {/* End Call */}
              <Button
                variant="destructive"
                size="lg"
                onClick={handleEndCall}
                className="rounded-full w-20 h-20 bg-red-500 hover:bg-red-600"
                disabled={conversationState.isConnecting}
              >
                <PhoneOff className="h-8 w-8" />
              </Button>

              {/* Emergency Actions */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => conversationState.hints && conversationState.hints.length > 0 && toast({
                  title: "Hints Cleared",
                  description: "All coaching hints have been cleared."
                })}
                className="rounded-full w-16 h-16"
              >
                <Target className="h-6 w-6" />
              </Button>
            </div>
          </div>
          )}


          {/* Floating Coaching Hints */}
          <div className="fixed top-20 right-4 left-4 z-40 pointer-events-none">
            <div className="max-w-sm ml-auto pointer-events-auto">
              <CoachingHints hints={conversationState.hints} onClearHints={() => {}} />
            </div>
          </div>
        </div>
      </MobileLayout>
    </>
  );
};

export default LiveCall;