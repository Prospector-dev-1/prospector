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
import MobileLayout from '@/components/MobileLayout';

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
                  Practice the same scenario with our AI prospect and see your improvement
                </p>
              </div>
            </div>

            {/* ... keep existing code (remaining content) */}
          </div>
        </div>
      </MobileLayout>
    </>
  );
};

export default AIReplay;