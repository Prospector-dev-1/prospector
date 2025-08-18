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
import ReplayModeControls from '@/components/ReplayModeControls';
import CoachingHints from '@/components/CoachingHints';
import ConversationPanel from '@/components/ConversationPanel';
import { useRealtimeAIChat, type ReplayMode, type ProspectPersonality, type GamificationMode } from '@/hooks/useRealtimeAIChat';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const {
    uploadId
  } = useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const isMobile = useIsMobile();

  // State management
  const [originalCall, setOriginalCall] = useState<CallUpload | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [selectedMoment, setSelectedMoment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMoments, setLoadingMoments] = useState(false);

  // Replay mode configuration
  const [replayMode, setReplayMode] = useState<ReplayMode>('detailed');
  const [prospectPersonality, setProspectPersonality] = useState<ProspectPersonality>('professional');
  const [gamificationMode, setGamificationMode] = useState<GamificationMode>('none');

  // AI conversation hook
  const {
    conversationState,
    startConversation,
    endConversation,
    clearHints
  } = useRealtimeAIChat();
  useEffect(() => {
    if (!uploadId || !user) return;
    fetchOriginalCall();
  }, [uploadId, user]);

  // Component cleanup
  useEffect(() => {
    return () => {
      endConversation();
    };
  }, [endConversation]);
  const fetchOriginalCall = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('call_uploads').select('*').eq('id', uploadId).eq('user_id', user?.id).single();
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
      const {
        data,
        error
      } = await supabase.functions.invoke('detect-call-moments', {
        body: {
          call_upload_id: callId
        }
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
  const handleStartConversation = async () => {
    if (!selectedMoment) return;
    const moment = moments.find(m => m.id === selectedMoment);
    if (!moment) return;

    // Generate session ID and navigate to live call page
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queryParams = new URLSearchParams({
      mode: replayMode,
      personality: prospectPersonality,
      gamification: gamificationMode,
      moment: JSON.stringify(moment)
    });
    navigate(`/live-call/${sessionId}?${queryParams.toString()}`);
  };
  const handleEndConversation = () => {
    endConversation();
    toast.info('Conversation ended. Check your score and feedback!');
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading AI replay...</p>
        </div>
      </div>;
  }
  if (!originalCall) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground mb-2">Original call not found</p>
          <SmartBackButton />
        </div>
      </div>;
  }
  return <>
      <SEO title={`AI Replay: ${originalCall.original_filename} | Prospector`} description="Practice your sales call with AI and compare your performance to the original." canonicalPath={`/ai-replay/${uploadId}`} />
      <MobileLayout>
        <div className="min-h-screen bg-background px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button variant="outline" onClick={() => navigate(`/call-review/${uploadId}`)} className="flex items-center gap-2 mb-4">
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
                  Original Score: {originalCall.confidence_score}/100 • Practice with AI conversations and real-time coaching
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
                    <span className="text-sm">AI Practice Ready</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Replay Mode Controls */}
            <div className="mb-6">
              <ReplayModeControls replayMode={replayMode} setReplayMode={setReplayMode} prospectPersonality={prospectPersonality} setProspectPersonality={setProspectPersonality} gamificationMode={gamificationMode} setGamificationMode={setGamificationMode} disabled={conversationState.isActive || conversationState.isConnecting} />
            </div>

            {/* Moments Timeline - Full Width */}
            <div className="mb-6">
              <Card>
                <CardHeader>
                  <CardTitle></CardTitle>
                  <CardDescription>
                    Select a moment below to start an AI conversation practice
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingMoments ? <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Analyzing call moments...</p>
                    </div> : moments.length > 0 ? <MomentsTimeline moments={moments} selectedId={selectedMoment} onSelect={setSelectedMoment} /> : <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        No transcript available for moment analysis
                      </p>
                      <Button variant="outline" onClick={() => originalCall && loadMoments(originalCall.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retry Analysis
                      </Button>
                    </div>}
                </CardContent>
              </Card>
            </div>

            {/* AI Conversation Practice - Bottom */}
            <div>
              <ConversationPanel conversationState={conversationState} selectedMoment={selectedMoment ? moments.find(m => m.id === selectedMoment) : null} onStartConversation={handleStartConversation} onEndConversation={handleEndConversation} disabled={!selectedMoment} />
            </div>

            {/* Coaching Hints Overlay */}
            <CoachingHints hints={conversationState.hints} onClearHints={clearHints} />
          </div>
        </div>
      </MobileLayout>
    </>;
};
export default AIReplay;