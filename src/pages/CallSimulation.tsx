import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Phone, PhoneOff, Timer, Mic, MicOff, User, Volume2 } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import SEO from '@/components/SEO';
import CallCustomization from '@/components/CallCustomization';
import MobileLayout from '@/components/MobileLayout';
import SmartBackButton from '@/components/SmartBackButton';
import { useAudioRouting } from '@/hooks/useAudioRouting';
const CallSimulation = () => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    refreshProfile
  } = useAuth();
  const {
    toast
  } = useToast();

  // Call setup states
  const [difficultyLevel, setDifficultyLevel] = useState([5]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Customization states
  const [businessType, setBusinessType] = useState('');
  const [prospectRole, setProspectRole] = useState('');
  const [callObjective, setCallObjective] = useState('');
  const [customObjective, setCustomObjective] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  // Call state tracking
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [callRecordId, setCallRecordId] = useState<string | null>(null);

  const { outputMode, isChanging: isAudioChanging, toggleAudioRoute } = useAudioRouting();

  // Vapi instance
  const vapiRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<string>('');
  const callRecordIdRef = useRef<string | null>(null);
  const callDurationRef = useRef<number>(0);
  useEffect(() => {
    const initVapi = async () => {
      try {
        // Get the public key from our edge function
        const {
          data: keyData,
          error: keyError
        } = await supabase.functions.invoke('get-vapi-key');
        if (keyError || !keyData?.publicKey) {
          console.error('Failed to get Vapi public key:', keyError);
          return;
        }

        // Initialize Vapi with public key
        vapiRef.current = new Vapi(keyData.publicKey);
        console.log('Vapi initialized with public key');

        // Set up event listeners
        vapiRef.current.on('call-start', () => {
          console.log('Call started');
          setIsCallActive(true);
          setIsConnecting(false);
          console.log('About to start timer...');
          startTimer();
          console.log('Timer started');
        });
        vapiRef.current.on('call-end', () => {
          console.log('=== CALL END EVENT TRIGGERED ===');
          console.log('Call ended - duration from ref at event time:', callDurationRef.current);
          console.log('Call ended - duration from state at event time:', callDuration);
          console.log('Call record ID from state:', callRecordId);
          console.log('Call record ID from ref:', callRecordIdRef.current);
          console.log('Transcript length:', transcriptRef.current.length);
          console.log('About to call handleCallEnd...');
          handleCallEnd();
        });
        vapiRef.current.on('speech-start', () => {
          console.log('Speech started');
        });
        vapiRef.current.on('speech-end', () => {
          console.log('Speech ended');
        });
        vapiRef.current.on('message', (message: any) => {
          console.log('Vapi message received:', message);

          // Capture various types of transcript data
          if (message.transcript) {
            transcriptRef.current += message.transcript + ' ';
            console.log('Transcript added from message.transcript:', message.transcript);
          }

          // Also capture conversation transcript if available
          if (message.type === 'conversation-update' && message.conversation) {
            const conversationText = message.conversation.map((item: any) => {
              if (item.role === 'user' && item.transcript) {
                return `User: ${item.transcript}`;
              } else if (item.role === 'assistant' && item.transcript) {
                return `Assistant: ${item.transcript}`;
              }
              return '';
            }).filter(Boolean).join('\n');
            if (conversationText) {
              transcriptRef.current = conversationText; // Replace with full conversation
              console.log('Updated full conversation transcript:', conversationText);
            }
          }

          // Capture user speech
          if (message.type === 'speech-update' && message.role === 'user') {
            transcriptRef.current += `User: ${message.transcript || message.text || ''} `;
            console.log('User speech captured:', message.transcript || message.text);
          }

          // Capture assistant speech
          if (message.type === 'speech-update' && message.role === 'assistant') {
            transcriptRef.current += `Assistant: ${message.transcript || message.text || ''} `;
            console.log('Assistant speech captured:', message.transcript || message.text);
          }
          console.log('Current transcript length:', transcriptRef.current.length);
        });
        vapiRef.current.on('error', (error: any) => {
          console.error('Vapi error:', error);

          // Don't show error toast for normal call ending
          if (error?.error?.type === 'ejected' && error?.errorMsg === 'Meeting has ended') {
            console.log('Call ended normally');
            return;
          }
          toast({
            title: "Call Error",
            description: "There was an error with the call. Please try again.",
            variant: "destructive"
          });
          setIsCallActive(false);
          setIsConnecting(false);
        });
      } catch (error) {
        console.error('Error initializing Vapi:', error);
      }
    };
    initVapi();
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  const startTimer = () => {
    console.log('startTimer function called');
    timerRef.current = setInterval(() => {
      setCallDuration(prev => {
        const newDuration = prev + 1;
        callDurationRef.current = newDuration; // Keep ref in sync
        console.log(`Timer tick: duration is now ${newDuration}, ref is now ${callDurationRef.current}`);
        return newDuration;
      });
    }, 1000);
    console.log('setInterval created, timerRef.current:', timerRef.current);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return "Very Easy";
    if (level <= 4) return "Easy";
    if (level <= 6) return "Medium";
    if (level <= 8) return "Hard";
    return "Expert";
  };
  const getDifficultyColor = (level: number) => {
    if (level <= 2) return "bg-green-500";
    if (level <= 4) return "bg-yellow-500";
    if (level <= 6) return "bg-orange-500";
    if (level <= 8) return "bg-red-500";
    return "bg-purple-500";
  };
  const startCall = async () => {
    if (!user || !profile) return;

    // Check credits
    if (profile.subscription_type !== 'premium' && profile.credits <= 0) {
      toast({
        title: "Insufficient Credits",
        description: "You need credits to start a practice call. Please purchase more credits.",
        variant: "destructive"
      });
      return;
    }
    setIsConnecting(true);
    setCallStarted(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('start-call', {
        body: {
          difficulty_level: difficultyLevel[0],
          business_type: businessType,
          prospect_role: prospectRole,
          call_objective: callObjective === 'Custom' ? customObjective : callObjective,
          custom_instructions: customInstructions
        }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      setCallRecordId(data.callRecordId);
      callRecordIdRef.current = data.callRecordId;
      await vapiRef.current.start(data.assistantId);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to start the call. Please try again.",
        variant: "destructive"
      });
      setIsConnecting(false);
      setCallStarted(false);
    }
  };
  const endCall = async () => {
    console.log('endCall function called');
    setIsConnecting(true); // Show loading state

    try {
      if (vapiRef.current) {
        console.log('Stopping Vapi call...');
        await vapiRef.current.stop();
        console.log('Vapi call stopped successfully');
      }

      // Force cleanup if call doesn't end naturally
      setTimeout(() => {
        if (isCallActive) {
          console.log('Forcing call cleanup after timeout');
          handleCallEnd();
        }
      }, 2000);
    } catch (error) {
      console.error('Error ending call:', error);
      // Force cleanup even if stop fails
      handleCallEnd();
    }
  };
  const handleCallEnd = async () => {
    console.log('=== HANDLE CALL END FUNCTION STARTED ===');
    stopTimer();
    setIsCallActive(false);
    setCallStarted(false);

    // Use the ref instead of state to avoid closure issues
    const currentCallRecordId = callRecordIdRef.current;
    if (currentCallRecordId) {
      console.log('Call record ID exists, navigating to results...');

      // Navigate immediately to results page
      console.log('Navigating to results page...');
      navigate(`/call-results/${currentCallRecordId}`);

      // Start analysis in background
      try {
        // Get current duration at the time of call end from ref
        const finalDuration = callDurationRef.current;
        console.log('Starting background analysis - Duration from ref:', finalDuration, 'Transcript:', transcriptRef.current);

        // Send transcript for analysis (even if empty) - don't await
        supabase.functions.invoke('end-call-analysis', {
          body: {
            callRecordId: currentCallRecordId,
            transcript: transcriptRef.current || 'No transcript available',
            duration: finalDuration
          }
        }).then(({
          data,
          error
        }) => {
          console.log('Background analysis completed:', {
            data,
            error
          });
          if (error) {
            console.error('Error analyzing call:', error);
          }
        }).catch(error => {
          console.error('Error in background analysis:', error);
        });
      } catch (error) {
        console.error('Error starting background analysis:', error);
      }
    } else {
      console.error('No call record ID available for analysis');
    }

    // Reset state and refs
    console.log('Resetting state...');
    setCallDuration(0);
    callDurationRef.current = 0;
    setCallRecordId(null);
    callRecordIdRef.current = null;
    transcriptRef.current = '';
    console.log('=== HANDLE CALL END FUNCTION COMPLETED ===');
  };
  const toggleMute = () => {
    if (vapiRef.current) {
      if (isMuted) {
        vapiRef.current.unmute();
      } else {
        vapiRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };
  if (!user || !profile) {
    return <div>Loading...</div>;
  }
  return <>
      <SEO title="Practice Call | AI Cold Call Simulator" description="Simulate realistic cold calls with AI; choose difficulty and get coaching." canonicalPath="/call-simulation" />
      <MobileLayout showBottomNav={!callStarted}>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="border-b border-border bg-card">
            <div className="px-3 sm:px-4 lg:px-8">
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center space-x-2">
                  <SmartBackButton variant="ghost" size="icon" />
                  {!callStarted ? <h1 className="text-lg sm:text-xl font-bold text-primary">Practice Call</h1> : <div className="flex items-center gap-3">
                      <Badge variant={isCallActive ? 'default' : 'secondary'}>
                        {isConnecting && <>
                            <div className="w-2 h-2 bg-current rounded-full animate-pulse mr-1"></div>
                            Connecting...
                          </>}
                        {isCallActive && <>
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                            Connected
                          </>}
                        {!isConnecting && !isCallActive && 'Call Ended'}
                      </Badge>
                      <Badge variant="outline" className={`${getDifficultyColor(difficultyLevel[0])} text-white border-transparent`}>
                        Level {difficultyLevel[0]} - {getDifficultyLabel(difficultyLevel[0])}
                      </Badge>
                    </div>}
                </div>
                <div className="text-right">
                  {!callStarted ? <>
                      <p className="text-xs text-muted-foreground">Credits</p>
                      <p className="text-sm font-bold text-primary">{profile.credits}</p>
                    </> : <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono font-medium">{formatTime(callDuration)}</span>
                    </div>}
                </div>
              </div>
            </div>
          </div>

          <div className="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
            {!callStarted ?
          // Call Setup
          <div className="space-y-6">
                {/* Call Customization */}
                <CallCustomization businessType={businessType} setBusinessType={setBusinessType} prospectRole={prospectRole} setProspectRole={setProspectRole} callObjective={callObjective} setCallObjective={setCallObjective} customObjective={customObjective} setCustomObjective={setCustomObjective} customInstructions={customInstructions} setCustomInstructions={setCustomInstructions} difficultyLevel={difficultyLevel} setDifficultyLevel={setDifficultyLevel} />

                {/* Scenario Preview */}
                {(businessType || prospectRole || callObjective) && <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="text-primary">Practice Session Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {businessType && <div>
                            <span className="font-medium">Business:</span> {businessType}
                          </div>}
                        {prospectRole && <div>
                            <span className="font-medium">Role:</span> {prospectRole}
                          </div>}
                        {callObjective && <div>
                            <span className="font-medium">Objective:</span> {callObjective}
                          </div>}
                        <div>
                          <span className="font-medium">Difficulty:</span> Level {difficultyLevel[0]} ({getDifficultyLabel(difficultyLevel[0])})
                        </div>
                      </div>
                    </CardContent>
                  </Card>}

                {/* Start Call Button */}
                <div className="space-y-4">
                  <Button onClick={startCall} disabled={isConnecting || profile.subscription_type !== 'premium' && profile.credits <= 0} className="w-full" size="lg">
                    {isConnecting ? <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Connecting...
                      </> : <>
                        <Phone className="mr-2 h-4 w-4" />
                        Start Practice Call {profile.subscription_type !== 'premium' && `(1 Credit)`}
                      </>}
                  </Button>

                  {profile.subscription_type !== 'premium' && profile.credits <= 0 && <p className="text-center text-sm text-destructive">
                      You need credits to start a call. Purchase more credits to continue.
                    </p>}
                </div>
              </div> :
          // Active Call Interface - Modern Design
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] space-y-8">
                
                {/* AI Prospect Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="h-16 w-16 sm:h-20 sm:w-20 text-primary-foreground" />
                  </div>
                  
                  {/* Breathing animation ring */}
                  {isCallActive && <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />}
                  
                  {/* Speaking indicator */}
                  {isCallActive && <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <Badge variant="default" className="text-xs">
                        AI Speaking...
                      </Badge>
                    </div>}
                </div>

                {/* Prospect Info */}
                <div className="text-center space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {prospectRole || 'Business Owner'}
                  </h2>
                  <p className="text-muted-foreground">
                    {businessType && `${businessType} • `}Level {difficultyLevel[0]} Prospect
                  </p>
                  {callObjective && <p className="text-sm text-muted-foreground">
                      Goal: {callObjective}
                    </p>}
                </div>

                {/* Quick Tips */}
                <Card className="w-full max-w-2xl glass-card">
                  <CardHeader>
                    <CardTitle className="text-center">💡 Quick Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-primary">Build Rapport</p>
                        <p className="text-muted-foreground">Start with a friendly introduction</p>
                      </div>
                      <div>
                        <p className="font-medium text-primary">Ask Questions</p>
                        <p className="text-muted-foreground">Understand their business needs</p>
                      </div>
                      <div>
                        <p className="font-medium text-primary">Handle Objections</p>
                        <p className="text-muted-foreground">Listen and address concerns</p>
                      </div>
                      <div>
                        <p className="font-medium text-primary">Close Strong</p>
                        <p className="text-muted-foreground">Ask for the next step</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Call Controls - Fixed Bottom */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-sm border-t mobile-safe-bottom">
                  <div className="flex justify-center items-center gap-6">
                    {/* Mute Toggle */}
                    <Button variant={isMuted ? "destructive" : "secondary"} size="lg" onClick={toggleMute} className="rounded-full w-16 h-16" aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}>
                      {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </Button>

                    {/* End Call */}
                    <Button variant="destructive" size="lg" onClick={endCall} className="rounded-full w-20 h-20 bg-destructive hover:bg-destructive/90" disabled={isConnecting}>
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
              </div>}
          </div>
        </div>
      </MobileLayout>
    </>;
};
export default CallSimulation;