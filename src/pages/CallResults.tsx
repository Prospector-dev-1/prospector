import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Trophy, HelpCircle, Brain, Target, Lightbulb, Ear, DollarSign, FileText, Sparkles, MessageSquare } from 'lucide-react';
import SEO from '@/components/SEO';
import { useToast } from '@/hooks/use-toast';
import MobileLayout from '@/components/MobileLayout';
import SmartBackButton from '@/components/SmartBackButton';
interface CallRecord {
  id: string;
  difficulty_level: number;
  duration_seconds: number;
  confidence_score: number;
  objection_handling_score: number;
  clarity_score: number;
  persuasiveness_score: number;
  tone_score: number;
  overall_pitch_score: number;
  closing_score: number;
  overall_score: number;
  successful_sale: boolean;
  transcript: string;
  ai_feedback: string;
  created_at: string;
}
type CoachingItem = {
  assistant_said: string;
  your_response: string;
  issue: string;
  better_response: string;
  why_better: string;
  category: string;
};
type CoachingResponse = {
  success?: boolean;
  coaching: CoachingItem[];
  summary?: string;
  tips?: string[];
  credits_remaining?: number;
};
const CallResults = () => {
  const {
    callId
  } = useParams<{
    callId: string;
  }>();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [callRecord, setCallRecord] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  useEffect(() => {
    if (callId && user) {
      fetchCallRecord();
    }
  }, [callId, user]);
  const fetchCallRecord = async () => {
    if (!callId || !user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('calls').select('*').eq('id', callId).eq('user_id', user.id).single();
      if (error) {
        console.error('Error fetching call record:', error);
        navigate('/');
        return;
      }
      setCallRecord(data);

      // Check if analysis is complete, failed, or still in progress
      if (data && data.overall_score === null) {
        if (data.call_status === 'failed') {
          setAnalysisError('Call analysis failed. This may be due to external service issues.');
          setLoading(false);
        } else {
          console.log('Analysis not complete, starting polling...');
          pollForAnalysisCompletion();
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching call record:', error);
      navigate('/');
    }
  };
  const pollForAnalysisCompletion = async () => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 60 seconds

    const pollInterval = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        console.log('Max polling attempts reached');
        clearInterval(pollInterval);
        setAnalysisError('Analysis is taking too long. Please try refreshing the page.');
        setLoading(false);
        return;
      }
      try {
        const {
          data,
          error
        } = await supabase.from('calls').select('*').eq('id', callId).eq('user_id', user.id).single();
        if (!error && data) {
          if (data.overall_score !== null) {
            console.log('Analysis completed, updating call record');
            setCallRecord(data);
            setLoading(false);
            clearInterval(pollInterval);
          } else if (data.call_status === 'failed') {
            setAnalysisError('Call analysis failed. This may be due to external service issues.');
            setLoading(false);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Error polling for analysis completion:', error);
      }
    }, 1000); // Poll every second
  };
  const retryAnalysis = async () => {
    if (!callId || !user) return;
    setLoading(true);
    setAnalysisError(null);
    try {
      // Reset call status to trigger reanalysis
      const {
        error
      } = await supabase.from('calls').update({
        call_status: 'started'
      }).eq('id', callId).eq('user_id', user.id);
      if (error) {
        throw error;
      }

      // Start polling again
      pollForAnalysisCompletion();
      toast({
        title: "Analysis restarted",
        description: "We're processing your call again. This may take a moment."
      });
    } catch (error) {
      console.error('Error retrying analysis:', error);
      setAnalysisError('Failed to restart analysis. Please try again.');
      setLoading(false);
    }
  };
  const handleCoaching = () => {
    navigate(`/call-coaching/${callId}`);
  };
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    if (score >= 4) return 'text-orange-500';
    return 'text-red-500';
  };
  const getScoreBadge = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Needs Work';
    return 'Needs Improvement';
  };
  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return "Very Easy";
    if (level <= 4) return "Easy";
    if (level <= 6) return "Medium";
    if (level <= 8) return "Hard";
    return "Expert";
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {analysisError ? 'Retrying analysis...' : 'Analyzing your call performance...'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">This may take up to a minute</p>
        </div>
      </div>;
  }
  if (analysisError) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto">
          <p className="text-destructive mb-4">{analysisError}</p>
          <div className="space-y-2">
            <Button onClick={retryAnalysis} variant="default">
              Retry Analysis
            </Button>
            <SmartBackButton variant="outline" className="w-full" />
          </div>
        </div>
      </div>;
  }
  if (!callRecord) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Call record not found.</p>
          <SmartBackButton className="mt-4" />
        </div>
      </div>;
  }
  const scoreCategories = [{
    name: '❓ Objection Handling',
    description: 'Did you turn around the objection or ignore it?',
    score: callRecord.objection_handling_score,
    icon: HelpCircle
  }, {
    name: '🧠 Confidence',
    description: 'Was your tone assertive or hesitant?',
    score: callRecord.confidence_score,
    icon: Brain
  }, {
    name: '🎯 Clarity',
    description: 'Was your message focused?',
    score: callRecord.clarity_score,
    icon: Target
  }, {
    name: '💡 Persuasion',
    description: 'Did you appeal emotionally or logically?',
    score: callRecord.persuasiveness_score,
    icon: Lightbulb
  }, {
    name: '👂 Listening & Response',
    description: 'Did you tailor answers or script-dump?',
    score: callRecord.tone_score,
    icon: Ear
  }, {
    name: '📋 Overall Pitch / Script',
    description: 'How well structured and delivered was your overall pitch?',
    score: callRecord.overall_pitch_score,
    icon: FileText
  }, {
    name: 'Closing Ability',
    description: 'How effectively did you close or advance the sale?',
    score: callRecord.closing_score,
    icon: DollarSign
  }];
  return (
    <>
      <SEO title={`Call Results | Score & Feedback`} description="Detailed breakdown of your AI practice call with scores and feedback." canonicalPath={`/call-results/${callId}`} />
      <MobileLayout>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="border-b border-border bg-card">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-3">
                  <SmartBackButton variant="ghost" size="icon" />
                  <h1 className="text-2xl font-bold text-primary">Call Results</h1>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Overall Score */}
            <Card className="mb-8">
              <CardHeader className="text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Trophy className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-3xl">
                  Overall Score: <span className={getScoreColor(callRecord.overall_score || 0)}>
                    {callRecord.overall_score || 0}/10
                  </span>
                </CardTitle>
                <div className="mt-2">
                  <Badge>
                    {getScoreBadge(callRecord.overall_score || 0)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Sale Result:</span>
                    <Badge variant={callRecord.successful_sale ? "default" : "secondary"} className="ml-2">
                      {callRecord.successful_sale ? "✅ Successful Sale" : "❌ No Sale"}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Difficulty</p>
                    <p className="font-bold">Level {callRecord.difficulty_level}</p>
                    <p className="text-xs text-muted-foreground">{getDifficultyLabel(callRecord.difficulty_level)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-bold">{formatDuration(callRecord.duration_seconds || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-bold">{new Date(callRecord.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-bold">{new Date(callRecord.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Score Breakdown */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
                <CardDescription>
                  Detailed analysis of your cold calling skills
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scoreCategories.map(category => (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <category.icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{category.name}</span>
                            <p className="text-xs text-muted-foreground">{category.description}</p>
                          </div>
                        </div>
                        <span className={`font-bold ${getScoreColor(category.score || 0)}`}>
                          {category.score || 0}/10
                        </span>
                      </div>
                      <Progress value={(category.score || 0) * 10} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Feedback */}
            <Card className="mb-8 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">AI Coach Feedback</CardTitle>
                    <CardDescription>
                      Personalized insights and recommendations to elevate your performance
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {callRecord.ai_feedback ? (
                  <div className="divide-y divide-border">
                    {/* Feedback Content */}
                    <div className="p-6">
                      <div className="relative">
                        <div className="absolute -left-2 top-0 w-1 h-full bg-gradient-to-b from-primary to-accent rounded-full"></div>
                        <div className="pl-6 space-y-4">
                          {callRecord.ai_feedback.split('\n\n').map((paragraph, index) => (
                            <div key={index} className="group">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                  <span className="text-xs font-medium text-primary">{index + 1}</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                                    {paragraph.trim()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Footer */}
                    <div className="px-6 py-4 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Sparkles className="h-4 w-4" />
                          <span>Generated by AI Coach</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Brain className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No feedback available for this call.</p>
                    <Button variant="outline" onClick={handleCoaching} className="text-sm">
                      Generate detailed coaching
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Call Transcript */}
            {callRecord.transcript && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Call Transcript</CardTitle>
                  <CardDescription>
                    Complete conversation from your practice session
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">
                      {callRecord.transcript}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Objection Coaching */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Objection Coaching
                </CardTitle>
                <CardDescription>
                  Analyze this call for weak moments and get better responses for next time. Cost: 0.5 credit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleCoaching}>
                  Get objection coaching (0.5 credit)
                </Button>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button onClick={() => navigate('/call-simulation')} className="flex items-center justify-center gap-2">
                <Target className="h-4 w-4" />
                Practice Again
              </Button>
              <Button variant="outline" onClick={() => navigate(`/ai-replay-setup/${callId}`)} className="flex items-center justify-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Replay Moments with AI
              </Button>
              <SmartBackButton variant="outline" className="flex items-center justify-center gap-2" />
            </div>
          </div>
        </div>
      </MobileLayout>
    </>
  );
};
export default CallResults;