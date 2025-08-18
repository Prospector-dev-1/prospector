import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Mic, MicOff, Play, Square, RotateCcw, TrendingUp, TrendingDown, Clock, Users, Target } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import MobileLayout from '@/components/MobileLayout';
import SmartBackButton from '@/components/SmartBackButton';
import MomentsTimeline, { type Moment } from '@/components/MomentsTimeline';

interface CallUpload {
  id: string;
  original_filename: string;
  transcript: string;
  confidence_score: number;
  objection_handling_scores: any;
  ai_analysis: any;
  call_moments?: any; // Json type from Supabase
}

interface ReplaySession {
  isRecording: boolean;
  transcript: string;
  duration: number;
  newScore: number | null;
  improvement: number | null;
}

const AIReplay = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [originalCall, setOriginalCall] = useState<CallUpload | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [replaySession, setReplaySession] = useState<ReplaySession>({
    isRecording: false,
    transcript: '',
    duration: 0,
    newScore: null,
    improvement: null
  });
  const [loading, setLoading] = useState(true);
  const [loadingMoments, setLoadingMoments] = useState(false);
  const [processing, setProcessing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!uploadId || !user) return;
    fetchOriginalCall();
  }, [uploadId, user]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopRecording();
    };
  }, []);

  const fetchOriginalCall = async () => {
    try {
      const { data, error } = await supabase
        .from('call_uploads')
        .select('*')
        .eq('id', uploadId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      setOriginalCall(data);
      
      // Set existing moments if available
      if (data.call_moments && Array.isArray(data.call_moments)) {
        // Type-safe parsing of moments from JSON
        const parsedMoments = data.call_moments as Moment[];
        setMoments(parsedMoments);
      } else {
        // Load moments if not available
        await loadMoments(data.id);
      }
    } catch (error) {
      console.error('Error fetching original call:', error);
      toast.error('Failed to load original call');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadMoments = async (callId: string) => {
    if (!user) return;
    
    setLoadingMoments(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-call-moments', {
        body: { call_upload_id: callId }
      });

      if (error) throw error;
      
      if (data?.moments && Array.isArray(data.moments)) {
        setMoments(data.moments);
      }
    } catch (error) {
      console.error('Error loading moments:', error);
      toast.error('Failed to analyze call moments');
    } finally {
      setLoadingMoments(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      
      setReplaySession(prev => ({ ...prev, isRecording: true, duration: 0 }));
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setReplaySession(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);

      toast.success('Recording started! Practice your call with the AI prospect.');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && replaySession.isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      setReplaySession(prev => ({ ...prev, isRecording: false }));
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const processReplay = async () => {
    if (!originalCall || chunksRef.current.length === 0) return;

    setProcessing(true);
    
    try {
      // Convert recorded audio to base64
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          
          // Call the upload analysis function for the replay
          const { data, error } = await supabase.functions.invoke('upload-call-analysis', {
            body: {
              file: base64Audio,
              originalFilename: `replay_${originalCall.original_filename}`,
              fileType: 'audio'
            }
          });

          if (error) throw error;

          // Get the new analysis
          const { data: newAnalysis, error: analysisError } = await supabase
            .from('call_uploads')
            .select('confidence_score, objection_handling_scores')
            .eq('id', data.uploadId)
            .single();

          if (analysisError) throw analysisError;

          const improvement = newAnalysis.confidence_score - originalCall.confidence_score;

          // Save the replay comparison
          const { error: replayError } = await supabase
            .from('ai_replays')
            .insert({
              user_id: user?.id,
              original_call_id: originalCall.id,
              original_score: originalCall.confidence_score,
              new_score: newAnalysis.confidence_score,
              transcript: 'Replay transcript would be here' // In a real app, you'd get this from the analysis
            });

          if (replayError) throw replayError;

          setReplaySession(prev => ({
            ...prev,
            newScore: newAnalysis.confidence_score,
            improvement: improvement
          }));

          toast.success('Replay analyzed successfully!');
          
        } catch (error) {
          console.error('Processing error:', error);
          toast.error('Failed to analyze replay');
        }
      };

      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('Error processing replay:', error);
      toast.error('Failed to process replay');
    } finally {
      setProcessing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading AI replay...</p>
        </div>
      </div>
    );
  }

  if (!originalCall) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground mb-2">Original call not found</p>
          <SmartBackButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`AI Replay: ${originalCall.original_filename} | Prospector`}
        description="Practice your sales call with AI and compare your performance to the original."
        canonicalPath={`/ai-replay/${uploadId}`}
      />
      <MobileLayout>
        <div className="min-h-screen bg-background px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/call-review/${uploadId}`)}
                className="flex items-center gap-2 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Review
              </Button>
              
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  AI Replay Mode
                </h1>
                <p className="text-muted-foreground">
                  Practice specific moments from your call with our AI prospect
                </p>
              </div>
            </div>

            {/* Call Overview */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Original Call: {originalCall.original_filename}
                </CardTitle>
                <CardDescription>
                  Original Score: {originalCall.confidence_score}/100 • Practice individual moments to improve your performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Transcript Length: {originalCall.transcript?.length || 0} chars</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Moments Found: {moments.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Ready to Practice</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Moments Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Moments Timeline */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Call Moments</CardTitle>
                    <CardDescription>
                      Select a moment below to practice that specific part of your call
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingMoments ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Analyzing call moments...</p>
                      </div>
                    ) : moments.length > 0 ? (
                      <MomentsTimeline
                        moments={moments}
                        selectedId={selectedMoment}
                        onSelect={setSelectedMoment}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          No transcript available for moment analysis
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => originalCall && loadMoments(originalCall.id)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retry Analysis
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Practice Panel */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Practice Session</CardTitle>
                    <CardDescription>
                      {selectedMoment ? 'Practice the selected moment' : 'Select a moment to practice'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedMoment ? (
                      <div className="space-y-4">
                        {(() => {
                          const moment = moments.find(m => m.id === selectedMoment);
                          if (!moment) return null;
                          
                          return (
                            <>
                              <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-semibold mb-2">{moment.label}</h4>
                                <p className="text-sm text-muted-foreground mb-2">{moment.summary}</p>
                                {moment.coaching_tip && (
                                  <div className="mt-3 p-3 bg-primary/10 rounded-md">
                                    <p className="text-sm font-medium text-primary">Coaching Tip:</p>
                                    <p className="text-sm text-primary/80">{moment.coaching_tip}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-center space-y-3">
                                {!replaySession.isRecording ? (
                                  <Button 
                                    size="lg" 
                                    onClick={startRecording}
                                    className="w-full"
                                  >
                                    <Mic className="h-4 w-4 mr-2" />
                                    Start Practicing This Moment
                                  </Button>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-center gap-2 text-red-500">
                                      <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                                      Recording: {formatDuration(replaySession.duration)}
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="lg"
                                      onClick={stopRecording}
                                      className="w-full"
                                    >
                                      <Square className="h-4 w-4 mr-2" />
                                      Stop & Analyze
                                    </Button>
                                  </div>
                                )}
                                
                                {replaySession.newScore !== null && (
                                  <div className="p-4 bg-accent/10 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">Your Score</span>
                                      <span className="text-lg font-bold">{replaySession.newScore}/100</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {replaySession.improvement! > 0 ? (
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <TrendingDown className="h-4 w-4 text-red-500" />
                                      )}
                                      <span className={replaySession.improvement! > 0 ? 'text-green-500' : 'text-red-500'}>
                                        {replaySession.improvement! > 0 ? '+' : ''}{replaySession.improvement} improvement
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          Choose a moment from the timeline to start practicing
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </MobileLayout>
    </>
  );
};

export default AIReplay;