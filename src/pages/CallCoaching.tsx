import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Sparkles } from 'lucide-react';
import SEO from '@/components/SEO';
import { useToast } from '@/hooks/use-toast';

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

const CallCoaching = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [coachingData, setCoachingData] = useState<CoachingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (callId && user) {
      generateCoaching();
    }
  }, [callId, user]);

  const generateCoaching = async () => {
    if (!callId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-call-coaching', {
        body: { callId },
      });
      
      if (error) {
        console.error('Coaching error:', error, data);
        const generic = 'Objection Coaching is temporarily unavailable. Please try again shortly. No credits were deducted.';
        const status = (error as any)?.context?.response?.status as number | undefined;
        const description = (data as any)?.error || (status === 429
          ? 'Rate limited by AI provider. Please retry in a few minutes. No credits were deducted.'
          : generic);
        toast({ 
          title: 'Coaching failed', 
          description
        });
        navigate(`/call-results/${callId}`);
        return;
      }
      
      const payload = data as CoachingResponse;
      setCoachingData(payload);
      toast({ 
        title: 'Coaching ready', 
        description: 'We analyzed your transcript and prepared suggestions.' 
      });
    } catch (e: any) {
      console.error('Coaching exception:', e);
      toast({ 
        title: 'Error', 
        description: 'Something went wrong. Please try again.' 
      });
      navigate(`/call-results/${callId}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Generating your coaching...</p>
        </div>
      </div>
    );
  }

  if (!coachingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to generate coaching.</p>
          <Button onClick={() => navigate(`/call-results/${callId}`)} className="mt-4">
            Back to Call Results
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Call Coaching | Objection Analysis" 
        description="Detailed coaching analysis for your practice call with actionable feedback and improved responses." 
        canonicalPath={`/call-coaching/${callId}`} 
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label="Back to call results" 
                  onClick={() => navigate(`/call-results/${callId}`)}
                > 
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-bold text-primary">Call Coaching</h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary */}
          {coachingData.summary && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Coaching Summary</CardTitle>
                <CardDescription>
                  Overview of your performance and key areas for improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-4 text-sm">
                  {coachingData.summary}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Coaching */}
          {Array.isArray(coachingData.coaching) && coachingData.coaching.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Detailed Coaching</CardTitle>
                <CardDescription>
                  Specific moments where you can improve your responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {coachingData.coaching.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-border p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-medium">Coaching #{idx + 1}</span>
                        {item.category && <Badge variant="secondary">{item.category}</Badge>}
                      </div>
                      <div className="space-y-4">
                        {item.assistant_said && (
                          <div>
                            <p className="font-medium text-sm mb-1">Prospect said:</p>
                            <p className="text-muted-foreground italic border-l-4 border-muted pl-4">
                              "{item.assistant_said}"
                            </p>
                          </div>
                        )}
                        {item.your_response && (
                          <div>
                            <p className="font-medium text-sm mb-1">Your reply:</p>
                            <p className="text-muted-foreground border-l-4 border-orange-200 pl-4">
                              "{item.your_response}"
                            </p>
                          </div>
                        )}
                        {item.issue && (
                          <div>
                            <p className="font-medium text-sm mb-1">What went wrong:</p>
                            <p className="text-red-600">{item.issue}</p>
                          </div>
                        )}
                        {item.better_response && (
                          <div>
                            <p className="font-medium text-sm mb-1">What to say next time:</p>
                            <div className="bg-green-50 border-l-4 border-green-200 p-4 rounded-r-md">
                              <p className="whitespace-pre-wrap text-green-800">"{item.better_response}"</p>
                            </div>
                          </div>
                        )}
                        {item.why_better && (
                          <div>
                            <p className="font-medium text-sm mb-1">Why this works better:</p>
                            <p className="text-muted-foreground">{item.why_better}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Tips */}
          {Array.isArray(coachingData.tips) && coachingData.tips.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
                <CardDescription>
                  Key takeaways to remember for your next calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {coachingData.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary font-bold mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => navigate('/call-simulation')} className="flex-1">
              Practice Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/call-results/${callId}`)} 
              className="flex-1"
            >
              Back to Call Results
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="flex-1"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CallCoaching;