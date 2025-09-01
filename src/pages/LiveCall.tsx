import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtimeAIChat } from '@/hooks/useRealtimeAIChat';
import ReplaySummary from '@/components/ReplaySummary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { useToast } from '@/components/ui/use-toast';
import SEO from '@/components/SEO';
import MobileLayout from '@/components/MobileLayout';
import { useAudioRouting } from '@/hooks/useAudioRouting';
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
  Target
} from 'lucide-react';

const LiveCall = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
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
  
  const [confidence, setConfidence] = useState(75);
  const [responseSpeed, setResponseSpeed] = useState(85);

  const { outputMode, isChanging: isAudioChanging, toggleAudioRoute } = useAudioRouting();

  // Get session config from URL params or localStorage
  const [sessionConfig] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      replayMode: urlParams.get('mode') || 'practice',
      prospectPersonality: urlParams.get('personality') || 'professional',
      gamificationMode: urlParams.get('gamification') || 'streak_builder',
      originalMoment: JSON.parse(urlParams.get('moment') || '{}')
    };
  });

  // Timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-start conversation
  useEffect(() => {
    if (sessionId && !conversationState.isActive && !conversationState.isConnecting) {
      handleStartConversation();
    }
  }, [sessionId, conversationState.isActive, conversationState.isConnecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationState.isActive || conversationState.isConnecting) {
        console.log('LiveCall unmounting, ending conversation...');
        endConversation();
      }
    };
  }, [conversationState.isActive, conversationState.isConnecting, endConversation]);

  const formatCallDuration = (startTime: number, currentTime: number) => {
    const duration = Math.floor((currentTime - startTime) / 1000);
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

  const handleEndCall = async () => {
    try {
      await endConversation();
      // Navigate to analysis page with session data
      navigate(`/call-analysis/${sessionId}`, {
        state: {
          sessionConfig,
          duration: Math.floor((currentTime - callStartTime) / 1000),
          score: conversationState.currentScore,
          exchanges: conversationState.exchangeCount,
          analysis: finalAnalysis || null
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end the conversation properly.",
        variant: "destructive",
      });
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Microphone On" : "Microphone Off",
      description: isMuted ? "You can now speak" : "Your microphone is muted",
    });
  };

  const getConnectionStatus = () => {
    if (conversationState.isConnecting) {
      return { label: 'Connecting...', color: 'bg-warning', icon: Signal };
    } else if (conversationState.isActive) {
      return { label: 'Connected', color: 'bg-success', icon: Signal };
    } else {
      return { label: 'Disconnected', color: 'bg-destructive', icon: Signal };
    }
  };

  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;

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
                <Badge variant={conversationState.isActive ? 'default' : 'secondary'}>
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

          {/* Replay Summary */}
          <ReplaySummary 
            originalMoment={sessionConfig.originalMoment}
            replayMode={sessionConfig.replayMode}
            prospectPersonality={sessionConfig.prospectPersonality}
            gamificationMode={sessionConfig.gamificationMode}
          />

          {/* Main Call Interface */}
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4 space-y-8">
            
            {/* AI Prospect Avatar */}
            <div className="relative">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-primary flex items-center justify-center">
                <User className="h-16 w-16 sm:h-20 sm:w-20 text-primary-foreground" />
              </div>
              
              {/* Breathing animation ring */}
              {conversationState.isActive && (
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              )}
              
              {/* Speaking indicator */}
              {conversationState.isActive && (
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

              {/* Speaker Toggle */}
              <Button
                variant={outputMode === 'speaker' ? "default" : "secondary"}
                size="lg"
                onClick={toggleAudioRoute}
                disabled={isAudioChanging}
                className="rounded-full w-16 h-16"
                aria-label={outputMode === 'speaker' ? 'Switch to earpiece' : 'Switch to speaker'}
              >
                {outputMode === 'speaker' ? <Volume2 className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
              </Button>
            </div>
          </div>

        </div>
      </MobileLayout>
    </>
  );
};

export default LiveCall;