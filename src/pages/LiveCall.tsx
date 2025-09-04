import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRealtimeAIChat } from '@/hooks/useRealtimeAIChat';
import ReplaySummary from '@/components/ReplaySummary';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import SEO from '@/components/SEO';
import MobileLayout from '@/components/MobileLayout';
import { useAudioRouting } from '@/hooks/useAudioRouting';
import { Phone, PhoneOff, Mic, MicOff, Volume2, User, Clock, Signal, AlertCircle, RefreshCw } from 'lucide-react';
const LiveCall = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    conversationState,
    startConversation,
    endConversation,
    finalAnalysis
  } = useRealtimeAIChat();
  const [callStartTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isMuted, setIsMuted] = useState(false);
  
  // Component mount tracking to prevent premature cleanup
  const isComponentMounted = React.useRef(true);
  
  const {
    outputMode,
    isChanging: isAudioChanging,
    toggleAudioRoute
  } = useAudioRouting();

  // Enhanced session config parsing with validation
  const [sessionConfig] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const locationState = location.state as any;
      
      // Try to get config from location state first, then URL params
      return {
        replayMode: locationState?.replayMode || urlParams.get('mode') || 'detailed',
        prospectPersonality: locationState?.prospectPersonality || urlParams.get('personality') || 'professional',
        gamificationMode: locationState?.gamificationMode || urlParams.get('gamification') || 'none',
        originalMoment: locationState?.originalMoment || (() => {
          try {
            return JSON.parse(urlParams.get('moment') || '{}');
          } catch {
            return {
              id: 'default',
              type: 'discovery',
              moment_label: 'Practice Conversation',
              context: 'General sales practice session',
              scenario: 'Practice your sales skills with an AI prospect',
              coaching_tip: 'Focus on building rapport and understanding the prospect\'s needs'
            };
          }
        })()
      };
    } catch (error) {
      console.error('Error parsing session config:', error);
      return {
        replayMode: 'detailed',
        prospectPersonality: 'professional',
        gamificationMode: 'none',
        originalMoment: {
          id: 'default',
          type: 'discovery',
          moment_label: 'Practice Conversation',
          context: 'General sales practice session',
          scenario: 'Practice your sales skills with an AI prospect',
          coaching_tip: 'Focus on building rapport and understanding the prospect\'s needs'
        }
      };
    }
  });
  
  // Extract config values for easier access
  const { replayMode, prospectPersonality, gamificationMode, originalMoment } = sessionConfig;
  const callDuration = Math.floor((currentTime - callStartTime) / 1000);

  // Timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-navigate when final analysis is ready
  useEffect(() => {
    if (finalAnalysis) {
      console.log('📊 Final analysis ready, preparing navigation...', {
        score: finalAnalysis.score,
        feedbackLength: finalAnalysis.feedback?.length,
        strengthsCount: finalAnalysis.strengths?.length,
        sessionId
      });
      
      // Validate analysis data before navigation
      const isValidAnalysis = finalAnalysis.score !== undefined && 
                             finalAnalysis.feedback && 
                             Array.isArray(finalAnalysis.strengths);
      
      if (!isValidAnalysis) {
        console.warn('⚠️  Invalid analysis data, using fallback');
        const fallbackAnalysis = {
          score: 70,
          feedback: "Practice session completed successfully",
          strengths: ["Engaged with prospect", "Maintained conversation"],
          improvements: ["Continue practicing", "Focus on objection handling"],
          recommendations: ["Try another session", "Study sales techniques"]
        };
        
        navigate(`/call-analysis/${sessionId}`, {
          replace: true,
          state: {
            analysis: fallbackAnalysis,
            sessionConfig: { replayMode, prospectPersonality, gamificationMode, originalMoment },
            duration: callDuration,
            timestamp: Date.now(),
            fallbackUsed: true
          }
        });
        return;
      }
      
      // Navigate with comprehensive validated state
      setTimeout(() => {
        console.log('🚀 Navigating to analysis page...');
        navigate(`/call-analysis/${sessionId}`, {
          replace: true,
          state: {
            analysis: finalAnalysis,
            sessionConfig: {
              replayMode,
              prospectPersonality, 
              gamificationMode,
              originalMoment
            },
            duration: callDuration,
            timestamp: Date.now(),
            transcriptLength: conversationState.transcript?.length || 0
          }
        });
      }, 100); // Small delay to ensure state is ready
    }
  }, [finalAnalysis, navigate, sessionId, replayMode, prospectPersonality, gamificationMode, originalMoment, callDuration, conversationState.transcript]);

  // Auto-start conversation with validation
  useEffect(() => {
    if (!sessionId) {
      console.error('No session ID provided');
      toast({
        title: "Configuration Error",
        description: "Missing session information. Redirecting to dashboard.",
        variant: "destructive"
      });
      navigate('/dashboard');
      return;
    }

    // Add delay to prevent React Strict Mode double mounting issues
    const timeoutId = setTimeout(() => {
      if (isComponentMounted.current && conversationState.status === 'idle' && !conversationState.error) {
        console.log('Auto-starting conversation for session:', sessionId);
        handleStartConversation();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [sessionId]);
  
  // Component mount tracking
  React.useEffect(() => {
    isComponentMounted.current = true;
    
    return () => {
      isComponentMounted.current = false;
      console.log('LiveCall component unmounting...');
      // The cleanup will be handled by the useRealtimeAIChat hook
    };
  }, []);
  const formatCallDuration = (startTime: number, currentTime: number) => {
    const duration = Math.floor((currentTime - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  const handleStartConversation = async () => {
    if (!sessionId) {
      toast({
        title: "Error",
        description: "Missing session information",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Starting conversation with config:', sessionConfig);
      await startConversation(
        sessionId,
        sessionConfig.originalMoment,
        sessionConfig.replayMode as any,
        sessionConfig.prospectPersonality as any,
        sessionConfig.gamificationMode as any
      );
    } catch (error) {
      console.error('Failed to start conversation:', error);
      
      let errorMessage = "Failed to start the conversation. Please try again.";
      let showRetry = false;
      
      if (error.message?.includes('busy') || error.message?.includes('429')) {
        errorMessage = "AI service is currently busy. Please wait a moment and try again.";
        showRetry = true;
      } else if (error.message?.includes('authentication')) {
        errorMessage = "Authentication required. Please sign in again.";
        setTimeout(() => navigate('/auth'), 2000);
      }
      
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
        action: showRetry ? (
          <Button variant="outline" size="sm" onClick={handleStartConversation}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        ) : undefined
      });
    }
  };
  const handleEndCall = async () => {
    try {
      console.log('User initiated call end');
      await endConversation();
      
      toast({
        title: "Call Ended",
        description: "Analyzing your performance...",
        duration: 3000
      });
      
      // The navigation will be handled by the finalAnalysis useEffect
      // If no analysis comes within 5 seconds, navigate with basic state
      setTimeout(() => {
        if (!finalAnalysis) {
          console.log('⏰ No analysis received after timeout, navigating with basic state');
          navigate(`/call-analysis/${sessionId}`, {
            replace: true,
            state: {
              sessionConfig: { replayMode, prospectPersonality, gamificationMode, originalMoment },
              duration: callDuration,
              score: conversationState.currentScore || 0,
              exchanges: conversationState.exchangeCount || 0,
              timedOut: true
            }
          });
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error ending call:', error);
      toast({
        title: "Error",
        description: "Failed to end the conversation properly.",
        variant: "destructive"
      });
    }
  };
  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Microphone On" : "Microphone Off",
      description: isMuted ? "You can now speak" : "Your microphone is muted"
    });
  };
  const getConnectionStatus = () => {
    switch (conversationState.status) {
      case 'connecting':
        return {
          label: 'Connecting...',
          color: 'bg-warning',
          icon: Signal
        };
      case 'active':
        return {
          label: 'Connected',
          color: 'bg-success',
          icon: Signal
        };
      case 'error':
        return {
          label: 'Error',
          color: 'bg-destructive',
          icon: AlertCircle
        };
      case 'ending':
        return {
          label: 'Ending...',
          color: 'bg-warning',
          icon: Signal
        };
      default:
        return {
          label: 'Disconnected',
          color: 'bg-muted',
          icon: Signal
        };
    }
  };
  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;
  return (
    <>
      <SEO title="Live Practice Call" description="Practice your sales skills with AI-powered real-time coaching" />
      <ErrorBoundary>
        <MobileLayout>
          <div className="min-h-screen bg-background">
            {/* Call Header */}
            <div className="sticky top-0 z-50 glass-card border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={conversationState.status === 'active' ? 'default' : 'secondary'}>
                    <ConnectionIcon className="h-3 w-3 mr-1" />
                    {connectionStatus.label}
                  </Badge>
                  <Badge variant="outline">
                    {sessionConfig.replayMode} mode
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-lg font-mono">
                  <Clock className="h-4 w-4" />
                  {formatCallDuration(callStartTime, currentTime)}
                </div>
              </div>
            </div>

            {/* Error State */}
            {conversationState.status === 'error' && (
              <Card className="m-4 p-4 border-destructive/50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      Connection Error
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conversationState.error || 'Unknown error occurred'}
                    </p>
                  </div>
                  {conversationState.retryAvailable && (
                    <Button variant="outline" size="sm" onClick={handleStartConversation}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Replay Summary */}
            <ReplaySummary 
              originalMoment={sessionConfig.originalMoment} 
              replayMode={sessionConfig.replayMode} 
              prospectPersonality={sessionConfig.prospectPersonality} 
              gamificationMode={sessionConfig.gamificationMode} 
            />

            {/* Main Call Interface */}
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4 space-y-8 pb-32">
              
              {/* AI Prospect Avatar */}
              <div className="relative">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-primary flex items-center justify-center">
                  <User className="h-16 w-16 sm:h-20 sm:w-20 text-primary-foreground" />
                </div>
                
                {/* Breathing animation ring */}
                {conversationState.status === 'active' && (
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                )}
                
                {/* Speaking indicator */}
                {conversationState.status === 'active' && (
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
                  {sessionConfig.prospectPersonality} personality
                </p>
              </div>

              {/* Connection Status Info */}
              {conversationState.status === 'connecting' && (
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connecting to AI prospect...
                  </p>
                </div>
              )}
            </div>

            {/* Call Controls */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-sm border-t mobile-safe-bottom">
              <div className="flex justify-center items-center gap-6">
                {/* Mute Toggle */}
                <Button 
                  variant={isMuted ? "destructive" : "secondary"} 
                  size="lg" 
                  onClick={toggleMute} 
                  className="rounded-full w-16 h-16"
                  disabled={conversationState.status !== 'active'}
                >
                  {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>

                {/* End Call */}
                <Button 
                  variant="destructive" 
                  size="lg" 
                  onClick={handleEndCall} 
                  className="rounded-full w-20 h-20 bg-red-500 hover:bg-red-600" 
                  disabled={conversationState.status === 'connecting' || conversationState.status === 'ending'}
                >
                  <PhoneOff className="h-8 w-8" />
                </Button>

                {/* Speaker Toggle */}
                <Button 
                  variant={outputMode === 'speaker' ? "default" : "secondary"} 
                  size="lg" 
                  onClick={toggleAudioRoute} 
                  disabled={isAudioChanging || conversationState.status !== 'active'} 
                  className="rounded-full w-16 h-16" 
                  aria-label={outputMode === 'speaker' ? 'Switch to earpiece' : 'Switch to speaker'}
                >
                  {outputMode === 'speaker' ? <Volume2 className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
                </Button>
              </div>
            </div>

          </div>
        </MobileLayout>
      </ErrorBoundary>
    </>
  );
};
export default LiveCall;