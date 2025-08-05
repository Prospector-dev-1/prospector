import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Trophy, TrendingUp, MessageSquare, Star } from 'lucide-react';

interface CallRecord {
  id: string;
  difficulty_level: number;
  duration_seconds: number;
  confidence_score: number;
  objection_handling_score: number;
  clarity_score: number;
  persuasiveness_score: number;
  tone_score: number;
  closing_score: number;
  overall_score: number;
  successful_sale: boolean;
  transcript: string;
  ai_feedback: string;
  created_at: string;
}

const CallResults = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [callRecord, setCallRecord] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (callId && user) {
      fetchCallRecord();
    }
  }, [callId, user]);

  const fetchCallRecord = async () => {
    if (!callId || !user) return;

    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching call record:', error);
        navigate('/');
        return;
      }

      setCallRecord(data);
    } catch (error) {
      console.error('Error fetching call record:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading call results...</p>
        </div>
      </div>
    );
  }

  if (!callRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Call record not found.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const scoreCategories = [
    { name: 'Confidence', score: callRecord.confidence_score, icon: Star },
    { name: 'Objection Handling', score: callRecord.objection_handling_score, icon: MessageSquare },
    { name: 'Clarity', score: callRecord.clarity_score, icon: MessageSquare },
    { name: 'Persuasiveness', score: callRecord.persuasiveness_score, icon: TrendingUp },
    { name: 'Tone', score: callRecord.tone_score, icon: Star },
    { name: 'Closing Ability', score: callRecord.closing_score, icon: Trophy },
  ];

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
            <CardDescription className="text-lg">
              <Badge className="mt-2">
                {getScoreBadge(callRecord.overall_score || 0)}
              </Badge>
            </CardDescription>
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
              {scoreCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <category.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{category.name}</span>
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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AI Coach Feedback</CardTitle>
            <CardDescription>
              Personalized recommendations to improve your performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground whitespace-pre-wrap">
                {callRecord.ai_feedback || "No feedback available for this call."}
              </p>
            </div>
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={() => navigate('/call-simulation')} className="flex-1">
            Practice Again
          </Button>
          <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CallResults;