import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Phone, PhoneOff, Timer, Mic, MicOff, ArrowLeft, User } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import SEO from '@/components/SEO';

const CallSimulation = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  // Call setup states
  const [difficultyLevel, setDifficultyLevel] = useState([5]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Call state tracking
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [callRecordId, setCallRecordId] = useState<string | null>(null);
  
  // Vapi instance
  const vapiRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<string>('');
  const callRecordIdRef = useRef<string | null>(null);
  const callDurationRef = useRef<number>(0);
  const conversationModeRef = useRef<boolean>(false);
  const turnsRef = useRef<string[]>([]);
  const lastUserChunkRef = useRef<string>('');
  const lastAssistantChunkRef = useRef<string>('');

  useEffect(() => {
    const initVapi = async () => {
      try {
        // Get the public key from our edge function
        const { data: keyData, error: keyError } = await supabase.functions.invoke('get-vapi-key');
        
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
          // Ignore raw message.transcript to avoid duplication; rely on conversation updates
          if (message.transcript) {
            console.log('Ignoring message.transcript to prevent duplicates:', message.transcript);
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
              conversationModeRef.current = true; // Prefer conversation updates
              // Reset incremental buffers to avoid mixed content
              turnsRef.current = [];
              lastUserChunkRef.current = '';
              lastAssistantChunkRef.current = '';
              console.log('Updated full conversation transcript (conversation mode ON)');
            }
          }
          
          // Capture user speech
          if (message.type === 'speech-update' && message.role === 'user') {
            const chunk = (message.transcript || message.text || '').trim();
            if (chunk && !conversationModeRef.current && chunk !== lastUserChunkRef.current) {
              turnsRef.current.push(`User: ${chunk}`);
              lastUserChunkRef.current = chunk;
              console.log('Buffered user chunk:', chunk);
            }
          }
          
          // Capture assistant speech
          if (message.type === 'speech-update' && message.role === 'assistant') {
            const chunk = (message.transcript || message.text || '').trim();
            if (chunk && !conversationModeRef.current && chunk !== lastAssistantChunkRef.current) {
              turnsRef.current.push(`Assistant: ${chunk}`);
              lastAssistantChunkRef.current = chunk;
              console.log('Buffered assistant chunk:', chunk);
            }
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
            variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    console.log('=== STARTING CALL DEBUG ===');
    console.log('Selected difficulty level:', difficultyLevel[0]);
    console.log('User credits:', profile.credits);
    console.log('Subscription type:', profile.subscription_type);
    
    try {
      // Start call through our edge function
      const { data, error } = await supabase.functions.invoke('start-call', {
        body: { difficulty_level: difficultyLevel[0] }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message);
      }

      if (data.error) {
        console.error('Edge function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('Call data received:', data);
      console.log('Setting callRecordId to:', data.callRecordId);
      setCallRecordId(data.callRecordId);
      callRecordIdRef.current = data.callRecordId; // Store in ref too
      setCallStarted(true);
      
      // Debug: Check if callRecordId was set properly
      console.log('callRecordId state should now be:', data.callRecordId);
      console.log('callRecordId ref should now be:', callRecordIdRef.current);
      
      // Start the Vapi call with the assistant
      console.log('Starting Vapi call with assistant ID:', data.assistantId);
      await vapiRef.current.start(data.assistantId);
      
      // Refresh profile to update credits
      await refreshProfile();

    } catch (error: any) {
      console.error('Error starting call:', error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to start the call. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const endCall = async () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
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
        
        // Build the best available transcript
        let tx = (transcriptRef.current || '').trim();
        if (!tx) {
          tx = turnsRef.current.join('\n');
        }
        tx = tx
          .replace(/\r/g, '')
          .replace(/Assistant:\s*Assistant:/g, 'Assistant:')
          .replace(/User:\s*User:/g, 'User:')
          .replace(/\s*(Assistant:)/g, '\n$1')
          .replace(/\s*(User:)/g, '\n$1')
          .split('\n').map(l => l.trim()).filter(Boolean).join('\n');

        console.log('Starting background analysis - Duration from ref:', finalDuration, 'Prepared transcript length:', tx.length);
        
        // Send transcript for analysis (even if empty) - don't await
        supabase.functions.invoke('end-call-analysis', {
          body: {
            callRecordId: currentCallRecordId,
            transcript: tx || 'No transcript available',
            duration: finalDuration
          }
        }).then(({ data, error }) => {
          console.log('Background analysis completed:', { data, error });
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
    conversationModeRef.current = false;
    turnsRef.current = [];
    lastUserChunkRef.current = '';
    lastAssistantChunkRef.current = '';
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

  return (<>
    <SEO title="Practice Call | AI Cold Call Simulator" description="Simulate realistic cold calls with AI; choose difficulty and get coaching." canonicalPath="/call-simulation" />
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" aria-label="Back to dashboard" onClick={() => navigate('/')}> 
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg sm:text-xl font-bold text-primary">Practice Call</h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Credits</p>
              <p className="text-sm font-bold text-primary">{profile.credits}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {!callStarted ? (
          // Call Setup
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Choose Difficulty Level</CardTitle>
                <p className="text-muted-foreground">
                  Select how challenging you want your prospect to be
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Difficulty: {difficultyLevel[0]}/10</span>
                    <Badge className={getDifficultyColor(difficultyLevel[0])}>
                      {getDifficultyLabel(difficultyLevel[0])}
                    </Badge>
                  </div>
                  <Slider
                    value={difficultyLevel}
                    onValueChange={setDifficultyLevel}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium">Level 1-3: Beginner</p>
                      <p>Friendly prospects, minimal objections</p>
                    </div>
                    <div>
                      <p className="font-medium">Level 4-6: Intermediate</p>
                      <p>Standard objections, moderate resistance</p>
                    </div>
                    <div>
                      <p className="font-medium">Level 7-8: Advanced</p>
                      <p>Skeptical prospects, strong objections</p>
                    </div>
                    <div>
                      <p className="font-medium">Level 9-10: Expert</p>
                      <p>Hostile prospects, maximum difficulty</p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Your Mission:</h4>
                  <p className="text-sm text-muted-foreground">
                    You're making a cold call to a business owner. The prospect doesn't know who you are or what you're selling. 
                    Introduce yourself, explain what you're offering, build rapport, handle objections, and either close the sale or schedule a follow-up meeting.
                  </p>
                </div>

                <Button 
                  onClick={startCall} 
                  disabled={isConnecting || (profile.subscription_type !== 'premium' && profile.credits <= 0)}
                  className="w-full"
                  size="lg"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Start Practice Call {profile.subscription_type !== 'premium' && `(1 Credit)`}
                    </>
                  )}
                </Button>

                {profile.subscription_type !== 'premium' && profile.credits <= 0 && (
                  <p className="text-center text-sm text-destructive">
                    You need credits to start a call. Purchase more credits to continue.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Active Call Interface
          <div className="flex flex-col items-center justify-center space-y-8">
            <Card className="w-full max-w-md">
              <CardContent className="p-8 text-center">
                <div className="space-y-6">
                  {/* Prospect Avatar */}
                  <div className="mx-auto w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                    <User className="h-12 w-12 text-primary-foreground" />
                  </div>

                  {/* Prospect Name */}
                  <div>
                    <h3 className="text-xl font-semibold">Business Owner</h3>
                    <p className="text-muted-foreground">Level {difficultyLevel[0]} Prospect</p>
                  </div>

                  {/* Call Timer */}
                  <div className="flex items-center justify-center space-x-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-mono">{formatTime(callDuration)}</span>
                  </div>

                  {/* Call Status */}
                  <div>
                    {isConnecting && (
                      <p className="text-muted-foreground">Connecting...</p>
                    )}
                    {isCallActive && (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-500 font-medium">Connected</span>
                      </div>
                    )}
                  </div>

                  {/* Call Controls */}
                  <div className="flex justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                      className="rounded-full w-12 h-12"
                    >
                      {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={endCall}
                      className="rounded-full w-12 h-12"
                    >
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Call Tips */}
            <Card className="w-full max-w-2xl">
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
          </div>
        )}
      </div>
    </div>
  </>);
};

export default CallSimulation;