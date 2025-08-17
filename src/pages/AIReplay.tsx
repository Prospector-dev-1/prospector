import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Mic, MicOff, Play, Square, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

interface CallUpload {
  id: string;
  original_filename: string;
  confidence_score: number;
  objection_handling_scores: any;
  ai_analysis: any;
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
  const [replaySession, setReplaySession] = useState<ReplaySession>({
    isRecording: false,
    transcript: '',
    duration: 0,
    newScore: null,
    improvement: null
  });
  const [loading, setLoading] = useState(true);
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
    } catch (error) {
      console.error('Error fetching original call:', error);
      toast.error('Failed to load original call');
      navigate('/');
    } finally {
      setLoading(false);
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
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
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
                Practice the same scenario with our AI prospect and see your improvement
              </p>
            </div>
          </div>

          {/* Original vs New Comparison */}
          {replaySession.newScore !== null && (
            <Card className="mb-6 bg-gradient-to-r from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-muted-foreground mb-1">
                      {originalCall.confidence_score}%
                    </div>
                    <p className="text-sm text-muted-foreground">Original Score</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {replaySession.newScore}%
                    </div>
                    <p className="text-sm text-muted-foreground">New Score</p>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-1 flex items-center justify-center gap-1 ${
                      (replaySession.improvement || 0) > 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {(replaySession.improvement || 0) > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      {replaySession.improvement > 0 ? '+' : ''}{replaySession.improvement}%
                    </div>
                    <p className="text-sm text-muted-foreground">Improvement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recording Interface */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Practice Session</CardTitle>
              <CardDescription>
                Start recording and practice your call with the same objections and scenario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-6">
                {/* Recording Status */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  replaySession.isRecording ? 'bg-destructive/10 text-destructive' : 'bg-muted'
                }`}>
                  {replaySession.isRecording ? (
                    <>
                      <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                      <span className="font-medium">Recording: {formatDuration(replaySession.duration)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Ready to record</span>
                  )}
                </div>

                {/* Recording Controls */}
                <div className="flex justify-center gap-4">
                  {!replaySession.isRecording ? (
                    <Button 
                      onClick={startRecording}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Mic className="h-5 w-5" />
                      Start Practice
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopRecording}
                      variant="destructive"
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <Square className="h-5 w-5" />
                      Stop Recording
                    </Button>
                  )}

                  {!replaySession.isRecording && replaySession.duration > 0 && (
                    <Button 
                      onClick={processReplay}
                      disabled={processing}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      {processing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5" />
                          Analyze Performance
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Live Transcript (Mock) */}
                {replaySession.isRecording && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-base">Live Transcript</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground italic">
                        Your speech will appear here in real-time during the practice session...
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Prospect Guidance */}
          <Card>
            <CardHeader>
              <CardTitle>AI Prospect Instructions</CardTitle>
              <CardDescription>
                Here's what the AI prospect will challenge you with
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2">🎭 Scenario</h4>
                  <p className="text-sm text-muted-foreground">
                    The AI will replay the same objections and concerns from your original call, 
                    giving you a chance to practice better responses.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2">🎯 Focus Areas</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {originalCall.objection_handling_scores && Object.entries(originalCall.objection_handling_scores).map(([category, score]) => (
                      <div key={category} className="flex justify-between">
                        <span className="capitalize">{category}:</span>
                        <Badge variant={score as number >= 80 ? 'default' : 'secondary'}>
                          {score}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/call-upload')}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Upload New Call
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/progress')}>
                    View All Progress
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default AIReplay;