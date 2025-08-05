import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Phone, PhoneOff, Timer, Mic, MicOff, ArrowLeft, User } from 'lucide-react';
import Vapi from '@vapi-ai/web';

const CallSimulation = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  // Call setup states
  const [difficultyLevel, setDifficultyLevel] = useState([5]);
  const [salesScenario, setSalesScenario] = useState("");
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
          startTimer();
        });

        vapiRef.current.on('call-end', () => {
          console.log('Call ended');
          handleCallEnd();
        });

        vapiRef.current.on('speech-start', () => {
          console.log('Speech started');
        });

        vapiRef.current.on('speech-end', () => {
          console.log('Speech ended');
        });

        vapiRef.current.on('message', (message: any) => {
          if (message.transcript) {
            transcriptRef.current += message.transcript + ' ';
          }
        });

        vapiRef.current.on('error', (error: any) => {
          console.error('Vapi error:', error);
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
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
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
    
    try {
      // Start call through our edge function
      const { data, error } = await supabase.functions.invoke('start-call', {
        body: { 
          difficulty_level: difficultyLevel[0],
          sales_scenario: salesScenario || "selling a website"
        }
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
      setCallRecordId(data.callRecordId);
      setCallStarted(true);
      
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
    stopTimer();
    setIsCallActive(false);
    setCallStarted(false);

    if (callRecordId && transcriptRef.current) {
      try {
        // Send transcript for analysis
        const { data, error } = await supabase.functions.invoke('end-call-analysis', {
          body: {
            callRecordId,
            transcript: transcriptRef.current,
            duration: callDuration
          }
        });

        if (error) {
          console.error('Error analyzing call:', error);
        }

        // Navigate to results page
        navigate(`/call-results/${callRecordId}`);
      } catch (error) {
        console.error('Error handling call end:', error);
        toast({
          title: "Analysis Error",
          description: "Could not analyze the call. Please check your call history.",
          variant: "destructive",
        });
      }
    }

    // Reset state
    setCallDuration(0);
    setCallRecordId(null);
    transcriptRef.current = '';
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold text-primary">Practice Call</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Credits</p>
              <p className="font-bold text-primary">{profile.credits}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <div>
                    <Label htmlFor="sales-scenario">What are you selling? (for your reference)</Label>
                    <Input
                      id="sales-scenario"
                      placeholder="e.g., website design services, insurance, software, consulting..."
                      value={salesScenario}
                      onChange={(e) => setSalesScenario(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is just for logging - the AI prospect won't know what you're selling until you tell them!
                    </p>
                  </div>
                  
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
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
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
                    You're calling a business owner to sell them {salesScenario || "your product/service"}. 
                    The prospect doesn't know what you're selling yet - you need to introduce yourself and your offering naturally. 
                    Your goal is to build rapport, handle objections, and either close the sale or schedule a follow-up meeting.
                  </p>
                </div>

                <Button 
                  onClick={startCall} 
                  disabled={isConnecting || !salesScenario.trim() || (profile.subscription_type !== 'premium' && profile.credits <= 0)}
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
  );
};

export default CallSimulation;