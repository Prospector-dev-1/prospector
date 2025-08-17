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

        <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-10 gap-1 sm:gap-0 p-1">
              <TabsTrigger value="overview" className="flex items-center gap-2 min-h-[48px] sm:min-h-[40px] text-sm">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden xs:inline">Overview</span>
                <span className="xs:hidden">Summary</span>
              </TabsTrigger>
              <TabsTrigger value="coaching" className="flex items-center gap-2 min-h-[48px] sm:min-h-[40px] text-sm">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden xs:inline">Detailed Coaching</span>
                <span className="xs:hidden">Coaching</span>
              </TabsTrigger>
              <TabsTrigger value="tips" className="flex items-center gap-2 min-h-[48px] sm:min-h-[40px] text-sm">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden xs:inline">Quick Tips</span>
                <span className="xs:hidden">Tips</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 sm:mt-6">
              {coachingData.summary && (
                <Card className="mb-4 sm:mb-6">
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Performance Summary
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Your overall performance analysis and key insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertTitle className="text-base sm:text-lg">AI Coach Analysis</AlertTitle>
                      <AlertDescription className="text-sm sm:text-base leading-relaxed mt-2">
                        {coachingData.summary}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {Array.isArray(coachingData.coaching) && coachingData.coaching.length > 0 && (
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-lg sm:text-xl">Coaching Overview</CardTitle>
                    <CardDescription className="text-sm">
                      {coachingData.coaching.length} improvement area{coachingData.coaching.length !== 1 ? 's' : ''} identified
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-3 sm:gap-4">
                      {coachingData.coaching.map((item, idx) => {
                        const CategoryIcon = getCategoryIcon(item.category);
                        const severityVariant = getSeverityColor(item.issue);
                        
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 sm:p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <CategoryIcon className="h-5 w-5 text-primary flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm sm:text-base">Coaching #{idx + 1}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.category}</p>
                              </div>
                            </div>
                            <Badge variant={severityVariant} className="text-xs ml-2 flex-shrink-0">
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
            <TabsContent value="coaching" className="mt-4 sm:mt-6">
              {Array.isArray(coachingData.coaching) && coachingData.coaching.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-2 sm:space-y-0">
                  {coachingData.coaching.map((item, idx) => {
                    const CategoryIcon = getCategoryIcon(item.category);
                    const severityVariant = getSeverityColor(item.issue);
                    const isReviewed = reviewedItems.has(idx);
                    
                    return (
                      <AccordionItem key={idx} value={`item-${idx}`} className="border border-border rounded-lg overflow-hidden">
                        <AccordionTrigger className="hover:no-underline px-3 sm:px-6 py-4 sm:py-4">
                          <div className="flex items-center gap-3 w-full min-w-0">
                            <CategoryIcon className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <span className="font-medium text-sm sm:text-base">Coaching #{idx + 1}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant={severityVariant} className="text-xs">
                                    {item.category}
                                  </Badge>
                                  {isReviewed && (
                                    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                                {item.issue}
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 sm:px-6 pb-4">
                          <div className="space-y-4 sm:space-y-6">
                            {/* Conversation Context */}
                            <div className="space-y-3 sm:space-y-4">
                              {item.assistant_said && (
                                <div>
                                  <p className="font-medium text-xs sm:text-sm mb-2 text-muted-foreground">Prospect said:</p>
                                  <div className="bg-muted/30 border-l-4 border-muted p-3 sm:p-4 rounded-r-md">
                                    <p className="italic text-sm sm:text-base">"{item.assistant_said}"</p>
                                  </div>
                                </div>
                              )}
                              
                              {item.your_response && (
                                <div>
                                  <p className="font-medium text-xs sm:text-sm mb-2 text-muted-foreground">Your response:</p>
                                  <div className="bg-warning/10 border-l-4 border-warning p-3 sm:p-4 rounded-r-md">
                                    <p className="text-sm sm:text-base">"{item.your_response}"</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <Separator />

                            {/* Issue Analysis */}
                            {item.issue && (
                              <Alert variant={severityVariant === 'destructive' ? 'destructive' : 'default'}>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle className="text-sm sm:text-base">What went wrong</AlertTitle>
                                <AlertDescription className="mt-2 text-sm sm:text-base">
                                  {item.issue}
                                </AlertDescription>
                              </Alert>
                            )}

                            {/* Better Response */}
                            {item.better_response && (
                              <div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                                  <p className="font-medium text-xs sm:text-sm">Suggested response:</p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(item.better_response)}
                                    className="flex items-center gap-2 self-start sm:self-auto min-h-[40px]"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copy
                                  </Button>
                                </div>
                                <div className="bg-success/10 border-l-4 border-success p-3 sm:p-4 rounded-r-md">
                                  <p className="whitespace-pre-wrap font-medium text-sm sm:text-base">"{item.better_response}"</p>
                                </div>
                              </div>
                            )}

                            {/* Explanation */}
                            {item.why_better && (
                              <div>
                                <p className="font-medium text-xs sm:text-sm mb-2 text-muted-foreground">Why this works better:</p>
                                <p className="text-sm sm:text-base leading-relaxed">{item.why_better}</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                variant={isReviewed ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleReviewed(idx)}
                                className="flex items-center gap-2 min-h-[40px]"
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
                  <CardContent className="text-center py-6 sm:py-8">
                    <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-muted-foreground text-sm sm:text-base">No detailed coaching available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Quick Tips Tab */}
            <TabsContent value="tips" className="mt-4 sm:mt-6">
              {Array.isArray(coachingData.tips) && coachingData.tips.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      Key Takeaways
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Remember these points for your next calls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3 sm:space-y-4">
                      {coachingData.tips.map((tip, i) => (
                        <Alert key={i}>
                          <Lightbulb className="h-4 w-4" />
                          <AlertDescription className="text-sm sm:text-base">
                            {tip}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-6 sm:py-8">
                    <Lightbulb className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <p className="text-muted-foreground text-sm sm:text-base">No quick tips available</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:gap-4 mt-6 sm:mt-8">
            <Button 
              onClick={() => navigate('/call-simulation')} 
              className="w-full min-h-[48px] text-base font-medium"
              size="lg"
            >
              Practice Again
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/call-results/${callId}`)} 
                className="min-h-[48px] text-base"
                size="lg"
              >
                Back to Call Results
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')} 
                className="min-h-[48px] text-base"
                size="lg"
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CallCoaching;