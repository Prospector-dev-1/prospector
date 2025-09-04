import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import SEO from '@/components/SEO';
import MobileLayout from '@/components/MobileLayout';
import SmartBackButton from '@/components/SmartBackButton';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp,
  Clock,
  MessageSquare,
  Trophy,
  Target,
  Lightbulb,
  RefreshCw,
  Download,
  Share2,
  ChevronRight,
  Star,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface AnalysisData {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  exchanges: any[];
  duration: number;
  sessionConfig: any;
}

const CallAnalysis = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExchange, setSelectedExchange] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced analysis data loading with multiple fallback layers
  useEffect(() => {
    const loadAnalysisData = async () => {
      try {
        setLoading(true);
        console.log('🔍 Loading analysis data for session:', sessionId);
        
        // First try: Get data from navigation state
        const navigationData = (location.state as any)?.analysis;
        console.log('📍 Navigation data:', navigationData ? 'Available' : 'Not available');
        
        if (navigationData) {
          console.log('✅ Using navigation data');
          const realAnalysis: AnalysisData = {
            score: navigationData.score || 0,
            feedback: navigationData.feedback || 'Analysis completed',
            strengths: Array.isArray(navigationData.strengths) ? navigationData.strengths : [],
            improvements: Array.isArray(navigationData.improvements) ? navigationData.improvements : [],
            recommendations: Array.isArray(navigationData.recommendations) ? navigationData.recommendations : [],
            exchanges: navigationData.exchanges || [],
            duration: (location.state as any)?.duration || 0,
            sessionConfig: (location.state as any)?.sessionConfig || {}
          };
          
          setAnalysisData(realAnalysis);
          setLoading(false);
          return;
        }
        
        // Second try: Check session storage
        if (sessionId) {
          try {
            const sessionStorageData = sessionStorage.getItem(`analysis_${sessionId}`);
            if (sessionStorageData) {
              const parsedData = JSON.parse(sessionStorageData);
              console.log('✅ Using session storage data');
              
              const sessionAnalysis: AnalysisData = {
                score: parsedData.score || 50,
                feedback: parsedData.feedback || 'Analysis retrieved from session storage',
                strengths: parsedData.strengths || ['Completed conversation'],
                improvements: parsedData.improvements || ['Continue practicing'],
                recommendations: parsedData.recommendations || ['Keep practicing regularly'],
                exchanges: parsedData.exchanges || [],
                duration: parsedData.duration || Math.round((Date.now() - parsedData.timestamp) / 1000) || 0,
                sessionConfig: parsedData.sessionConfig || {}
              };
              
              setAnalysisData(sessionAnalysis);
              
              if (parsedData.isFallback) {
                toast({
                  title: 'Analysis Recovered',
                  description: 'Using backup analysis from session storage',
                  variant: 'default'
                });
              }
              
              setLoading(false);
              return;
            }
          } catch (storageError) {
            console.warn('⚠️ Failed to parse session storage data:', storageError);
          }
        }
        
        // Third try: Database fallback (query conversation_analytics table)
        if (sessionId) {
          console.log('🔄 Attempting database fallback for session:', sessionId);
          try {
            const { data: conversationData, error } = await supabase
              .from('conversation_analytics')
              .select('performance_metrics, conversation_flow, session_id')
              .eq('session_id', sessionId)
              .single();
              
            if (!error && conversationData?.performance_metrics) {
              console.log('✅ Using database fallback data');
              const metrics = conversationData.performance_metrics as any;
              
               const dbAnalysis: AnalysisData = {
                 score: metrics?.final_score || 50,
                 feedback: "Analysis retrieved from database backup. This shows your conversation performance based on the AI coaching system.",
                 strengths: metrics?.skill_assessment ? Object.entries(metrics.skill_assessment)
                   .filter(([_, score]) => (score as number) >= 70)
                   .map(([skill, score]) => `Good ${skill.replace('_', ' ')}: ${score}%`) : ["Completed conversation"],
                 improvements: metrics?.skill_assessment ? Object.entries(metrics.skill_assessment)
                   .filter(([_, score]) => (score as number) < 60)
                   .map(([skill, score]) => `Improve ${skill.replace('_', ' ')}: ${score}%`) : ["Continue practicing"],
                 recommendations: ["Practice regularly to improve conversation skills", "Focus on weaker skill areas", "Try different conversation scenarios"],
                 exchanges: [], // conversation_flow is an object, not an array of exchanges
                 duration: Math.round((new Date(metrics?.end_time).getTime() - new Date(metrics?.start_time).getTime()) / 1000) || 0,
                 sessionConfig: metrics?.session_config || { replayMode: 'Standard Practice' }
               };
              
              setAnalysisData(dbAnalysis);
              
              toast({
                title: 'Analysis Recovered',
                description: 'Retrieved analysis from database backup',
                variant: 'default'
              });
              
              setLoading(false);
              return;
            }
          } catch (dbError) {
            console.warn('⚠️ Database fallback failed:', dbError);
          }
        }
        
        // Final fallback: Create basic analysis based on available info
        console.log('⚠️ All fallbacks failed, creating basic analysis');
        
        const fallbackAnalysis: AnalysisData = {
          score: 40,
          feedback: "Unable to retrieve detailed analysis. This conversation was completed but analysis data was not available. This can happen with very short conversations or connection issues.",
          strengths: ["Completed practice session", "Took initiative to practice"],
          improvements: ["Try a longer conversation for better analysis", "Ensure stable internet connection"],
          recommendations: ["Practice regularly for consistent feedback", "Aim for conversations lasting 2-3 minutes"],
          exchanges: [],
          duration: 0,
          sessionConfig: {}
        };
        
        setAnalysisData(fallbackAnalysis);
        
        toast({
          title: 'Basic Analysis',
          description: 'Analysis data unavailable - showing basic feedback',
          variant: 'default'
        });
        
      } catch (error) {
        console.error('❌ Error loading analysis data:', error);
        
        setAnalysisData({
          score: 35,
          feedback: "Error occurred while loading analysis data. Please try practicing again with a longer conversation.",
          strengths: ["Attempted practice"],
          improvements: ["Check internet connection", "Try longer conversations"],
          recommendations: ["Contact support if issue persists", "Retry with stable connection"],
          exchanges: [],
          duration: 0,
          sessionConfig: {}
        });
        
        toast({
          title: "Error",
          description: "Failed to load call analysis.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalysisData();
  }, [sessionId, location.state, toast, retryCount]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-primary";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: "default" as const, label: "Excellent" };
    if (score >= 70) return { variant: "secondary" as const, label: "Good" };
    if (score >= 50) return { variant: "outline" as const, label: "Fair" };
    return { variant: "destructive" as const, label: "Needs Work" };
  };

  const handlePracticeAgain = () => {
    navigate('/ai-replay/' + sessionId, {
      state: { sessionConfig: analysisData?.sessionConfig }
    });
  };
  
  const handleRetryAnalysis = () => {
    console.log('🔄 Retrying analysis load...');
    setLoading(true);
    setRetryCount(prev => prev + 1);
  };

  const handleShareResults = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Sales Call Analysis',
          text: `I just completed a sales practice call and scored ${analysisData?.score}/100!`,
          url: window.location.href
        });
      } else {
        // Fallback - copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Analysis link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <p className="font-medium">Analyzing your call...</p>
              <p className="text-sm text-muted-foreground">This may take a few moments</p>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!analysisData) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4 max-w-md mx-auto p-4">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Analysis Not Available</h2>
              <p className="text-sm text-muted-foreground">
                We couldn't load analysis data for this session. This might happen if:
              </p>
              <ul className="text-xs text-muted-foreground text-left space-y-1">
                <li>• The conversation was too short</li>
                <li>• The session expired</li>
                <li>• There was a processing error</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleRetryAnalysis}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry Analysis
              </Button>
              <Button onClick={() => navigate('/ai-replay')}>
                Start New Practice
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const scoreBadge = getScoreBadge(analysisData.score);

  return (
    <>
      <SEO 
        title="Call Analysis Results"
        description="Review your sales call performance with detailed AI analysis and recommendations"
      />
      <MobileLayout>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="sticky top-0 z-50 glass-card border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SmartBackButton />
                <h1 className="text-lg font-semibold">Call Analysis</h1>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleShareResults}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Score Overview */}
          <div className="p-4 space-y-4">
            <Card className="gradient-card">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="h-8 w-8 text-yellow-500" />
                    <span className="text-2xl font-bold">Final Score</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className={`text-6xl font-bold ${getScoreColor(analysisData.score)}`}>
                      {analysisData.score}
                    </div>
                    <Badge {...scoreBadge} className="text-sm px-4 py-1">
                      {scoreBadge.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6 text-center">
                    <div>
                      <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-sm font-medium">{formatDuration(analysisData.duration)}</div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                    <div>
                      <MessageSquare className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-sm font-medium">{analysisData.exchanges.length}</div>
                      <div className="text-xs text-muted-foreground">Exchanges</div>
                    </div>
                    <div>
                      <Target className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-sm font-medium">{analysisData.sessionConfig.replayMode}</div>
                      <div className="text-xs text-muted-foreground">Mode</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={handlePracticeAgain} className="h-auto py-4">
                <div className="text-center">
                  <RefreshCw className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm">Practice Again</div>
                </div>
              </Button>
              <Button variant="outline" onClick={() => navigate('/ai-replay')} className="h-auto py-4">
                <div className="text-center">
                  <MessageSquare className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm">Replay Mode</div>
                </div>
              </Button>
              <Button variant="outline" onClick={() => navigate('/progress')} className="h-auto py-4">
                <div className="text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm">View Progress</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="p-4">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      AI Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {analysisData.feedback}
                    </p>
                  </CardContent>
                </Card>

                {/* Strengths */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-5 w-5" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysisData.strengths.map((strength, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Improvements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-warning">
                      <AlertCircle className="h-5 w-5" />
                      Areas for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysisData.improvements.map((improvement, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{improvement}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Exchanges Tab */}
              <TabsContent value="exchanges" className="space-y-3">
                {analysisData.exchanges.map((exchange, index) => (
                  <Card 
                    key={exchange.id}
                    className={`cursor-pointer transition-all ${
                      selectedExchange === index ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedExchange(selectedExchange === index ? null : index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Exchange {index + 1}</Badge>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${getScoreColor(exchange.score * 10)}`}>
                            {exchange.score}/10
                          </span>
                          <ChevronRight className={`h-4 w-4 transition-transform ${
                            selectedExchange === index ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-primary">You:</span>
                          <p className="text-muted-foreground mt-1">{exchange.user_message}</p>
                        </div>
                        <div>
                          <span className="font-medium text-accent">Prospect:</span>
                          <p className="text-muted-foreground mt-1">{exchange.ai_response}</p>
                        </div>
                      </div>

                      {selectedExchange === index && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-warning" />
                            <span className="font-medium">Feedback</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{exchange.feedback}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-warning" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysisData.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Next Steps */}
                <Card>
                  <CardHeader>
                    <CardTitle>Next Practice Session</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Based on your performance, here are recommended next steps:
                    </p>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-between">
                        Focus on objection handling
                        <Badge variant="secondary">Recommended</Badge>
                      </Button>
                      <Button variant="outline" className="w-full justify-between">
                        Practice with aggressive personality
                        <Badge variant="outline">Challenge</Badge>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </MobileLayout>
    </>
  );
};

export default CallAnalysis;