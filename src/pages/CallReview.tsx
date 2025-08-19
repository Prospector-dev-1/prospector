import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, TrendingUp, TrendingDown, Mic, BarChart3, Lightbulb, RefreshCw, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';
import MobileLayout from '@/components/MobileLayout';
import SmartBackButton from '@/components/SmartBackButton';

interface CallUpload {
  id: string;
  original_filename: string;
  file_type: string;
  status: string;
  transcript: string;
  ai_analysis: any;
  confidence_score: number;
  objection_handling_scores: any;
  strengths: string[];
  weaknesses: string[];
  better_responses: any;
  psychological_insights: string;
  created_at: string;
  fallback_used?: boolean;
}

const CallReview = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [callData, setCallData] = useState<CallUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!uploadId || !user) return;
    
    fetchCallData();
  }, [uploadId, user]);

  const fetchCallData = async () => {
    try {
      const { data, error } = await supabase
        .from('call_uploads')
        .select('*')
        .eq('id', uploadId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      setCallData(data);
    } catch (error) {
      console.error('Error fetching call data:', error);
      toast.error('Failed to load call review');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryAnalysis = async () => {
    if (!uploadId || !user) return;
    
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke('reanalyze-call-upload', {
        body: { uploadId }
      });

      if (error) throw error;
      
      toast.success('Analysis retried successfully!');
      await fetchCallData(); // Refresh the data
    } catch (error) {
      console.error('Error retrying analysis:', error);
      toast.error('Failed to retry analysis. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const averageObjectionScore = callData?.objection_handling_scores 
    ? Object.values(callData.objection_handling_scores as Record<string, number>).reduce((a, b) => a + b, 0) / 4 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading call review...</p>
        </div>
      </div>
    );
  }

  if (!callData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-foreground mb-2">Call review not found</p>
          <SmartBackButton />
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`Call Review: ${callData.original_filename} | Prospector`}
        description="Detailed AI analysis of your sales call with actionable feedback and insights."
        canonicalPath={`/call-review/${uploadId}`}
      />
      <MobileLayout>
        <div className="min-h-screen bg-background px-4 py-8">
          <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
          <SmartBackButton className="flex items-center gap-2 mb-4" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Call Review: {callData.original_filename}
                </h1>
                <p className="text-muted-foreground">
                  AI analysis completed on {new Date(callData.created_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => navigate('/progress')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Progress
                </Button>
                <Button onClick={() => navigate(`/ai-replay/${uploadId}`)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry with AI Prospect
                </Button>
              </div>
            </div>
          </div>

          {/* Fallback Warning */}
          {callData.fallback_used && (
            <Alert className="mb-6 border-warning bg-warning/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This analysis was generated using a fallback method due to AI parsing issues. 
                The results may be less detailed than usual.{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold text-warning-foreground underline"
                  onClick={handleRetryAnalysis}
                  disabled={retrying}
                >
                  {retrying ? 'Retrying...' : 'Click here to retry analysis'}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Score Interpretation Guide */}
          <Card className="mb-6 bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Score Guide:</span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-success"></div>
                  Excellent (80-100%)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-warning"></div>
                  Good (60-79%)
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-destructive"></div>
                  Needs Work (0-59%)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Score Overview */}
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Overall Confidence</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Measures how confident and assured you sounded during the call. High confidence helps build trust with prospects.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CardDescription>
                    Your vocal confidence and assurance level throughout the call
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-3xl font-bold ${getScoreColor(callData.confidence_score)}`}>
                      {callData.confidence_score}%
                    </span>
                    <Badge variant={getScoreBadgeVariant(callData.confidence_score)}>
                      {callData.confidence_score >= 80 ? 'Excellent' : 
                       callData.confidence_score >= 60 ? 'Good' : 'Needs Work'}
                    </Badge>
                  </div>
                  <Progress value={callData.confidence_score} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Objection Handling</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">How effectively you addressed prospect concerns across price, trust, timing, and competitive objections.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CardDescription>
                    Average performance across all objection categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-3xl font-bold ${getScoreColor(averageObjectionScore)}`}>
                      {Math.round(averageObjectionScore)}%
                    </span>
                    <Badge variant={getScoreBadgeVariant(averageObjectionScore)}>
                      Average
                    </Badge>
                  </div>
                  <Progress value={averageObjectionScore} className="h-2" />
                </CardContent>
              </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">File Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Badge variant="outline">{callData.file_type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant="default">{callData.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="objections">Objections</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-success">
                      <TrendingUp className="h-5 w-5" />
                      What You Did Well
                    </CardTitle>
                    <CardDescription>
                      Key strengths and effective techniques identified in your call
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {callData.strengths?.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-success mt-1">✓</span>
                          <span className="text-sm">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <TrendingDown className="h-5 w-5" />
                      Areas for Improvement
                    </CardTitle>
                    <CardDescription>
                      Specific areas where you can enhance your sales approach
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {callData.weaknesses?.map((weakness, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-destructive mt-1">×</span>
                          <span className="text-sm">{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Psychological Insights
                    </CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Analysis of prospect psychology, emotional cues, and behavioral patterns to help you understand buyer mindset.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CardDescription>
                    Understanding the prospect's mindset and emotional state during the call
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{callData.psychological_insights}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="objections" className="space-y-6">
              <TooltipProvider>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries((callData.objection_handling_scores as Record<string, number>) || {}).map(([category, score]) => {
                    const objectionDescriptions: Record<string, string> = {
                      price: "How well you handled cost-related concerns and demonstrated value",
                      trust: "Your ability to build credibility and address trust-related hesitations", 
                      timing: "How effectively you addressed 'not right time' objections",
                      competitor: "Your response to comparisons with competing solutions"
                    };

                    const objectionTooltips: Record<string, string> = {
                      price: "Price objections are about perceived value vs. cost. Good responses focus on ROI, payment terms, and cost of inaction.",
                      trust: "Trust objections stem from skepticism about you, your company, or solution. Address with social proof, guarantees, and transparency.",
                      timing: "Timing objections often mask other concerns. Probe deeper and create urgency with compelling reasons to act now.",
                      competitor: "Competitive objections require differentiation. Focus on unique benefits rather than attacking competitors."
                    };

                    return (
                      <Card key={category}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base capitalize">{category}</CardTitle>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{objectionTooltips[category] || "Objection handling effectiveness"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <CardDescription className="text-xs">
                            {objectionDescriptions[category] || "Objection handling performance"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-2xl font-bold ${getScoreColor(score as number)}`}>
                              {score}%
                            </span>
                          </div>
                          <Progress value={score as number} className="h-2" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TooltipProvider>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>Better Responses</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">AI-generated alternative responses based on sales best practices and successful objection handling techniques.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CardDescription>
                    Here's how you could have handled objections more effectively based on specific moments in your call
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries((callData.better_responses as Record<string, string>) || {}).map(([key, response]) => (
                      <div key={key} className="p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-semibold mb-2 capitalize flex items-center gap-2">
                          {key.replace('_', ' ')}
                          <Lightbulb className="h-4 w-4 text-primary" />
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{response}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Feedback & Analysis</CardTitle>
                  <CardDescription>
                    Detailed insights and recommendations from AI analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(() => {
                    // Parse the AI analysis to extract readable feedback
                    const analysis = callData.ai_analysis;
                    
                    if (!analysis || typeof analysis !== 'object') {
                      return (
                        <div className="text-muted-foreground text-sm">
                          No detailed feedback available for this call.
                        </div>
                      );
                    }

                    // Extract different types of feedback from the analysis
                    const sections = [
                      { key: 'feedback', title: 'Overall Feedback', icon: '💬' },
                      { key: 'summary', title: 'Call Summary', icon: '📋' },
                      { key: 'recommendations', title: 'Recommendations', icon: '💡' },
                      { key: 'analysis', title: 'Detailed Analysis', icon: '🔍' },
                      { key: 'insights', title: 'Key Insights', icon: '🎯' },
                      { key: 'coaching_points', title: 'Coaching Points', icon: '🏆' },
                      { key: 'improvement_areas', title: 'Areas for Improvement', icon: '📈' }
                    ];

                    const hasContent = sections.some(section => analysis[section.key]);

                    if (!hasContent) {
                      return (
                        <div className="space-y-4">
                          <div className="text-muted-foreground text-sm">
                            The AI analysis contains technical data but no formatted feedback. Here's a summary of available information:
                          </div>
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <div className="text-sm space-y-2">
                              {Object.keys(analysis).map((key) => (
                                <div key={key} className="flex justify-between">
                                  <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                                  <span className="text-muted-foreground">
                                    {typeof analysis[key] === 'object' ? 'Available' : 'Set'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {sections.map(section => {
                          const content = analysis[section.key];
                          if (!content) return null;

                          const displayContent = typeof content === 'string' 
                            ? content 
                            : Array.isArray(content) 
                              ? content.join('\n• ') 
                              : JSON.stringify(content, null, 2);

                          return (
                            <div key={section.key} className="space-y-3">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <span>{section.icon}</span>
                                {section.title}
                              </h3>
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {Array.isArray(content) && '• '}
                                  {displayContent}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transcript" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    Call Transcript
                  </CardTitle>
                  <CardDescription>
                    Complete conversation transcript used for AI analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {callData.transcript}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>
          </TooltipProvider>
          </div>
        </div>
      </MobileLayout>
    </>
  );
};

export default CallReview;