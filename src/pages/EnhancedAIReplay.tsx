import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useReplayPlayer } from '@/hooks/useReplayPlayer';
import { ReplayControls } from '@/components/ReplayControls';
import { EnhancedTranscriptDisplay } from '@/components/EnhancedTranscriptDisplay';
import SmartBackButton from '@/components/SmartBackButton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Play, Brain, Clock, Target, TrendingUp } from 'lucide-react';
import SEO from '@/components/SEO';

interface CallData {
  id: string;
  user_id: string;
  transcript: string;
  overall_score: number;
  difficulty_level: number;
  duration_seconds: number;
  created_at: string;
  prospect_role: string;
  business_type: string;
}

interface AIImprovement {
  improvements: Array<{
    original_index: number;
    original_text: string;
    improved_response: string;
    rationale: string;
    improvement_score: number;
    key_techniques: string[];
  }>;
  overall_assessment: string;
  best_practices: string[];
}

export default function EnhancedAIReplay() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [callData, setCallData] = useState<CallData | null>(null);
  const [aiImprovements, setAiImprovements] = useState<AIImprovement | null>(null);
  const [transcriptEntries, setTranscriptEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDoOver, setShowDoOver] = useState(false);
  const [isGeneratingImprovements, setIsGeneratingImprovements] = useState(false);

  const replayPlayer = useReplayPlayer(callId || '');

  useEffect(() => {
    if (!callId || !user) {
      navigate('/dashboard');
      return;
    }
    fetchCallData();
  }, [callId, user, navigate]);

  const fetchCallData = async () => {
    try {
      setIsLoading(true);

      // Fetch call data
      const { data: call, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .eq('user_id', user!.id)
        .single();

      if (callError || !call) {
        throw new Error('Call not found');
      }

      setCallData(call);

      // Parse transcript into entries
      const entries = parseTranscriptToEntries(call.transcript || '');
      setTranscriptEntries(entries);

    } catch (error) {
      console.error('Error fetching call data:', error);
      toast({
        title: "Error",
        description: "Failed to load call data",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const parseTranscriptToEntries = (transcript: string) => {
    const lines = transcript.split('\n').filter(line => line.trim());
    const entries = [];
    let currentTime = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Prospect said:') || line.startsWith('You said:')) {
        const speaker = line.startsWith('Prospect said:') ? 'prospect' : 'user';
        const text = line.replace(/^(Prospect said:|You said:)\s*/, '');
        const duration = Math.max(2, text.length * 0.05);

        entries.push({
          index: i,
          speaker,
          text,
          timestamp: currentTime,
          duration
        });

        currentTime += duration + 0.5;
      }
    }

    return entries;
  };

  const generateAIImprovements = async () => {
    if (!callData) return;

    setIsGeneratingImprovements(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-improvement', {
        body: {
          callId: callData.id,
          originalTranscript: callData.transcript,
          callContext: {
            score: callData.overall_score,
            difficulty: callData.difficulty_level,
            duration: callData.duration_seconds,
            prospectRole: callData.prospect_role,
            businessType: callData.business_type
          }
        }
      });

      if (error) throw error;

      setAiImprovements(data);

      // Apply improvements to transcript entries
      const enhancedEntries = transcriptEntries.map(entry => {
        if (entry.speaker === 'user') {
          const improvement = data.improvements.find((imp: any) => 
            imp.original_text.toLowerCase().trim() === entry.text.toLowerCase().trim()
          );
          
          if (improvement) {
            return {
              ...entry,
              improved: {
                text: improvement.improved_response,
                rationale: improvement.rationale,
                score: improvement.improvement_score,
                techniques: improvement.key_techniques
              }
            };
          }
        }
        return entry;
      });

      setTranscriptEntries(enhancedEntries);
      setShowDoOver(true);

    } catch (error) {
      console.error('Error generating AI improvements:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI improvements",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImprovements(false);
    }
  };

  const playImprovement = async (text: string, speaker: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('synthesize-replay-audio', {
        body: {
          transcript: text,
          speaker,
          voiceId: 'nova'
        }
      });

      if (error) throw error;

      // Create and play audio
      const audioBlob = new Blob([
        Uint8Array.from(atob(data.audioData), c => c.charCodeAt(0))
      ], { type: 'audio/mp3' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();

    } catch (error) {
      console.error('Error playing improvement audio:', error);
      toast({
        title: "Error",
        description: "Failed to play audio",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading replay...</p>
        </div>
      </div>
    );
  }

  if (!callData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Call not found</p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="AI Replay - Prospector"
        description="Review and improve your sales call with AI-powered replay and coaching"
      />
      
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <SmartBackButton />
            <div>
              <h1 className="text-2xl font-bold">AI Replay</h1>
              <p className="text-muted-foreground">
                {callData.prospect_role} • {callData.business_type}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Score</div>
              <Badge variant="secondary" className="text-lg">
                {callData.overall_score}/100
              </Badge>
            </div>
          </div>
        </div>

        {/* Call Overview */}
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Duration</div>
              <div className="font-medium">
                {Math.floor((callData.duration_seconds || 0) / 60)}:
                {String((callData.duration_seconds || 0) % 60).padStart(2, '0')}
              </div>
            </div>
            <div className="text-center">
              <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Difficulty</div>
              <div className="font-medium">{callData.difficulty_level}/10</div>
            </div>
            <div className="text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Performance</div>
              <div className="font-medium">
                {callData.overall_score >= 80 ? 'Excellent' : 
                 callData.overall_score >= 60 ? 'Good' : 
                 callData.overall_score >= 40 ? 'Fair' : 'Needs Work'}
              </div>
            </div>
            <div className="text-center">
              <Brain className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">AI Analysis</div>
              <div className="font-medium">
                {aiImprovements ? 'Ready' : 'Available'}
              </div>
            </div>
          </div>
        </Card>

        {/* Replay Controls */}
        <ReplayControls
          isPlaying={replayPlayer.isPlaying}
          currentTime={replayPlayer.currentTime}
          duration={replayPlayer.duration}
          volume={replayPlayer.volume}
          playbackSpeed={replayPlayer.playbackSpeed}
          onPlay={replayPlayer.play}
          onPause={replayPlayer.pause}
          onSeek={replayPlayer.seek}
          onVolumeChange={replayPlayer.setVolume}
          onSpeedChange={replayPlayer.setPlaybackSpeed}
          onSkipBack={replayPlayer.skipBack}
          onSkipForward={replayPlayer.skipForward}
          disabled={replayPlayer.isLoading}
        />

        {/* AI Improvements Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-improvements" className="text-base font-medium">
                Best-Practice AI Do-Over
              </Label>
              <p className="text-sm text-muted-foreground">
                See how AI would handle the same conversation with expert techniques
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {!aiImprovements && (
                <Button
                  onClick={generateAIImprovements}
                  disabled={isGeneratingImprovements}
                  className="min-w-[100px]"
                >
                  {isGeneratingImprovements ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              )}
              <Switch
                id="show-improvements"
                checked={showDoOver}
                onCheckedChange={setShowDoOver}
                disabled={!aiImprovements}
              />
            </div>
          </div>
        </Card>

        {/* AI Assessment */}
        {aiImprovements && showDoOver && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-medium mb-2">AI Assessment</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {aiImprovements.overall_assessment}
            </p>
            <div className="space-y-2">
              <div className="text-sm font-medium">Recommended Best Practices:</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {aiImprovements.best_practices.map((practice, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    {practice}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}

        {/* Enhanced Transcript */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Call Transcript</h3>
          <EnhancedTranscriptDisplay
            transcript={transcriptEntries}
            currentTime={replayPlayer.currentTime}
            showDoOver={showDoOver}
            onJumpToTime={replayPlayer.jumpToTime}
            onPlayImprovement={playImprovement}
          />
        </Card>
      </div>
    </div>
  );
}