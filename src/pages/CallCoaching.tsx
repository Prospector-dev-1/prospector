import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Sparkles, Copy, CheckCircle, MessageSquare, Lightbulb, AlertTriangle, Target, TrendingUp } from 'lucide-react';
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

const getCategoryIcon = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes('objection')) return AlertTriangle;
  if (normalized.includes('closing') || normalized.includes('close')) return Target;
  if (normalized.includes('rapport')) return MessageSquare;
  return TrendingUp;
};

const getSeverityColor = (issue: string) => {
  const normalized = issue.toLowerCase();
  if (normalized.includes('critical') || normalized.includes('major')) return 'destructive';
  if (normalized.includes('minor') || normalized.includes('small')) return 'secondary';
  return 'default';
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
  const [reviewedItems, setReviewedItems] = useState<Set<number>>(new Set());

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied!', description: 'Response copied to clipboard' });
    } catch (err) {
      toast({ title: 'Failed to copy', description: 'Could not copy to clipboard' });
    }
  };

  const toggleReviewed = (index: number) => {
    const newReviewed = new Set(reviewedItems);
    if (newReviewed.has(index)) {
      newReviewed.delete(index);
    } else {
      newReviewed.add(index);
    }
    setReviewedItems(newReviewed);
  };

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
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="coaching" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Detailed Coaching
              </TabsTrigger>
              <TabsTrigger value="tips" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Quick Tips
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              {coachingData.summary && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Performance Summary
                    </CardTitle>
                    <CardDescription>
                      Your overall performance analysis and key insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertTitle>AI Coach Analysis</AlertTitle>
                      <AlertDescription className="text-base leading-relaxed mt-2">
                        {coachingData.summary}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {Array.isArray(coachingData.coaching) && coachingData.coaching.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Coaching Overview</CardTitle>
                    <CardDescription>
                      {coachingData.coaching.length} improvement areas identified
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {coachingData.coaching.map((item, idx) => {
                        const CategoryIcon = getCategoryIcon(item.category);
                        const severityVariant = getSeverityColor(item.issue);
                        
                        return (
                          <div key={idx} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <CategoryIcon className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-medium">Coaching #{idx + 1}</p>
                                <p className="text-sm text-muted-foreground">{item.category}</p>
                              </div>
                            </div>
                            <Badge variant={severityVariant}>
                              {severityVariant === 'destructive' ? 'Critical' : 
                               severityVariant === 'secondary' ? 'Minor' : 'Moderate'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Detailed Coaching Tab */}
            <TabsContent value="coaching" className="mt-6">
              {Array.isArray(coachingData.coaching) && coachingData.coaching.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {coachingData.coaching.map((item, idx) => {
                    const CategoryIcon = getCategoryIcon(item.category);
                    const severityVariant = getSeverityColor(item.issue);
                    const isReviewed = reviewedItems.has(idx);
                    
                    return (
                      <AccordionItem key={idx} value={`item-${idx}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 w-full">
                            <CategoryIcon className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Coaching #{idx + 1}</span>
                                <Badge variant={severityVariant} className="text-xs">
                                  {item.category}
                                </Badge>
                                {isReviewed && (
                                  <CheckCircle className="h-4 w-4 text-success" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {item.issue}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-8 space-y-6">
                            {/* Conversation Context */}
                            <div className="space-y-4">
                              {item.assistant_said && (
                                <div>
                                  <p className="font-medium text-sm mb-2 text-muted-foreground">Prospect said:</p>
                                  <div className="bg-muted/30 border-l-4 border-muted p-4 rounded-r-md">
                                    <p className="italic">"{item.assistant_said}"</p>
                                  </div>
                                </div>
                              )}
                              
                              {item.your_response && (
                                <div>
                                  <p className="font-medium text-sm mb-2 text-muted-foreground">Your response:</p>
                                  <div className="bg-warning/10 border-l-4 border-warning p-4 rounded-r-md">
                                    <p>"{item.your_response}"</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <Separator />

                            {/* Issue Analysis */}
                            {item.issue && (
                              <Alert variant={severityVariant === 'destructive' ? 'destructive' : 'default'}>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>What went wrong</AlertTitle>
                                <AlertDescription className="mt-2">
                                  {item.issue}
                                </AlertDescription>
                              </Alert>
                            )}

                            {/* Better Response */}
                            {item.better_response && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <p className="font-medium text-sm">Suggested response:</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(item.better_response)}
                                    className="flex items-center gap-2"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copy
                                  </Button>
                                </div>
                                <div className="bg-success/10 border-l-4 border-success p-4 rounded-r-md">
                                  <p className="whitespace-pre-wrap font-medium">"{item.better_response}"</p>
                                </div>
                              </div>
                            )}

                            {/* Explanation */}
                            {item.why_better && (
                              <div>
                                <p className="font-medium text-sm mb-2 text-muted-foreground">Why this works better:</p>
                                <p className="text-sm leading-relaxed">{item.why_better}</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                variant={isReviewed ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleReviewed(idx)}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle className="h-3 w-3" />
                                {isReviewed ? 'Reviewed' : 'Mark as Reviewed'}
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No detailed coaching available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Quick Tips Tab */}
            <TabsContent value="tips" className="mt-6">
              {Array.isArray(coachingData.tips) && coachingData.tips.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      Key Takeaways
                    </CardTitle>
                    <CardDescription>
                      Remember these points for your next calls
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {coachingData.tips.map((tip, i) => (
                        <Alert key={i}>
                          <Lightbulb className="h-4 w-4" />
                          <AlertDescription className="text-base">
                            {tip}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No quick tips available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

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