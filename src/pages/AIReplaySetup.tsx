import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, Clock, Users, Trophy, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import MobileLayout from '@/components/MobileLayout';
import SmartBackButton from '@/components/SmartBackButton';
import MomentsTimeline, { type Moment } from '@/components/MomentsTimeline';
import ReplayModeControls from '@/components/ReplayModeControls';
import { type ReplayMode, type ProspectPersonality, type GamificationMode } from '@/hooks/useRealtimeAIChat';

interface CallRecord {
  id: string;
  transcript: string;
  overall_score: number;
  duration_seconds: number;
  difficulty_level: number;
  created_at: string;
  ai_feedback: string;
}

const AIReplaySetup = () => {
  const { callId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State management
  const [callRecord, setCallRecord] = useState<CallRecord | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMoments, setLoadingMoments] = useState(false);

  // Replay mode configuration
  const [replayMode, setReplayMode] = useState<ReplayMode>('detailed');
  const [prospectPersonality, setProspectPersonality] = useState<ProspectPersonality>('professional');
  const [gamificationMode, setGamificationMode] = useState<GamificationMode>('none');

  useEffect(() => {
    if (!callId || !user) return;
    fetchCallRecord();
  }, [callId, user]);

  const fetchCallRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setCallRecord(data);

      // Generate moments from call simulation transcript
      if (data.transcript) {
        await generateMomentsFromTranscript(data.transcript);
      }
    } catch (error) {
      console.error('Error fetching call record:', error);
      toast.error('Failed to load call record');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const generateMomentsFromTranscript = async (transcript: string) => {
    setLoadingMoments(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-simulation-moments', {
        body: {
          transcript,
          call_id: callId
        }
      });

      if (error) throw error;
      if (data?.moments && Array.isArray(data.moments)) {
        setMoments(data.moments);
      }
    } catch (error) {
      console.error('Error generating moments:', error);
      // Fallback: create simple moments from transcript
      createFallbackMoments(transcript);
    } finally {
      setLoadingMoments(false);
    }
  };

  const createFallbackMoments = (transcript: string) => {
    // Simple fallback: split transcript into sections
    const sections = transcript.split(/(?:\n|\.{2,}|\?{2,}|\!{2,})/).filter(section => section.trim().length > 50);
    const fallbackMoments: Moment[] = sections.slice(0, 5).map((section, index) => ({
      id: `moment_${index + 1}`,
      type: index === 0 ? 'opening' : index === sections.length - 1 ? 'closing' : 'objection',
      label: `Moment ${index + 1}`,
      start_char: index * 100,
      end_char: (index + 1) * 100,
      summary: section.trim().substring(0, 100) + '...',
      difficulty: Math.floor(Math.random() * 3) === 0 ? 'easy' : Math.floor(Math.random() * 3) === 1 ? 'medium' : 'hard'
    }));
    setMoments(fallbackMoments);
  };

  const handleStartConversation = async () => {
    if (!selectedMoment) {
      toast.error('Please select a moment to practice');
      return;
    }

    const moment = moments.find(m => m.id === selectedMoment);
    if (!moment) return;

    // Generate session ID and navigate to live call page
    const sessionId = `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queryParams = new URLSearchParams({
      mode: replayMode,
      personality: prospectPersonality,
      gamification: gamificationMode,
      moment: JSON.stringify(moment),
      originalCallId: callId || ''
    });

    navigate(`/live-call/${sessionId}?${queryParams.toString()}`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return "Very Easy";
    if (level <= 4) return "Easy";
    if (level <= 6) return "Medium";
    if (level <= 8) return "Hard";
    return "Expert";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading AI replay setup...</p>
        </div>
      </div>
    );
  }

  if (!callRecord) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground mb-2">Call record not found</p>
          <SmartBackButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="AI Replay Setup | Practice Call Moments" 
        description="Set up AI replay mode to practice specific moments from your call simulation." 
        canonicalPath={`/ai-replay-setup/${callId}`} 
      />
      <MobileLayout>
        <div className="min-h-screen bg-background px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/call-results/${callId}`)} 
                className="flex items-center gap-2 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Results
              </Button>
              
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  AI Replay Setup
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
                  <Trophy className="h-5 w-5" />
                  Original Call Performance
                </CardTitle>
                <CardDescription>
                  Review your original performance before practicing with AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Score</p>
                      <p className="font-bold">{callRecord.overall_score}/10</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-bold">{formatDuration(callRecord.duration_seconds || 0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Difficulty</p>
                      <p className="font-bold">{getDifficultyLabel(callRecord.difficulty_level)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Moments</p>
                      <p className="font-bold">{moments.length} Found</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Replay Mode Controls */}
            <div className="mb-6">
              <ReplayModeControls
                replayMode={replayMode}
                setReplayMode={setReplayMode}
                prospectPersonality={prospectPersonality}
                setProspectPersonality={setProspectPersonality}
                gamificationMode={gamificationMode}
                setGamificationMode={setGamificationMode}
                disabled={false}
              />
            </div>

            {/* Moments Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Practice Moments
                </CardTitle>
                <CardDescription>
                  Select a moment below to start your AI conversation practice
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
                      onClick={() => callRecord.transcript && generateMomentsFromTranscript(callRecord.transcript)}
                    >
                      Retry Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Start Practice Button */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Button
                    onClick={handleStartConversation}
                    disabled={!selectedMoment}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Start AI Practice Session
                  </Button>
                  {!selectedMoment && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Select a moment above to begin
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MobileLayout>
    </>
  );
};

export default AIReplaySetup;