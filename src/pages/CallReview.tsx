import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, TrendingUp, TrendingDown, Mic, BarChart3, Lightbulb, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

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
}

const CallReview = () => {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [callData, setCallData] = useState<CallUpload | null>(null);
  const [loading, setLoading] = useState(true);

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
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
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
      
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
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

          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Overall Confidence</CardTitle>
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
                <CardTitle className="text-lg">Objection Handling</CardTitle>
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
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Psychological Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{callData.psychological_insights}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="objections" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries((callData.objection_handling_scores as Record<string, number>) || {}).map(([category, score]) => (
                  <Card key={category}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base capitalize">{category}</CardTitle>
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
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Better Responses</CardTitle>
                  <CardDescription>
                    Here's how you could have handled objections more effectively
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries((callData.better_responses as Record<string, string>) || {}).map(([key, response]) => (
                      <div key={key} className="p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-semibold mb-2 capitalize">
                          {key.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-muted-foreground">{response}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="feedback" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {JSON.stringify(callData.ai_analysis, null, 2)}
                  </pre>
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
        </div>
      </div>
    </>
  );
};

export default CallReview;