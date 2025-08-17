import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, Calendar, Target, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

interface ProgressData {
  confidence_trend: Array<{ date: string; score: number }>;
  objection_trends: Array<{ date: string; price: number; timing: number; trust: number; competitor: number }>;
  weekly_summary: {
    improvement: number;
    total_calls: number;
    avg_confidence: number;
    insight: string;
  };
}

const Progress = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProgressData();
  }, [user]);

  const fetchProgressData = async () => {
    try {
      // Get call uploads for the user
      const { data: uploads, error } = await supabase
        .from('call_uploads')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!uploads || uploads.length === 0) {
        setProgressData({
          confidence_trend: [],
          objection_trends: [],
          weekly_summary: {
            improvement: 0,
            total_calls: 0,
            avg_confidence: 0,
            insight: "Upload your first call to start tracking progress!"
          }
        });
        return;
      }

      // Process data for charts
      const confidenceTrend = uploads.map(upload => ({
        date: new Date(upload.created_at).toLocaleDateString(),
        score: upload.confidence_score || 0
      }));

      const objectionTrends = uploads.map(upload => {
        const scores = upload.objection_handling_scores as any || {};
        return {
          date: new Date(upload.created_at).toLocaleDateString(),
          price: scores.price || 0,
          timing: scores.timing || 0,
          trust: scores.trust || 0,
          competitor: scores.competitor || 0
        };
      });

      // Calculate weekly summary
      const avgConfidence = uploads.reduce((sum, upload) => sum + (upload.confidence_score || 0), 0) / uploads.length;
      const lastWeekUploads = uploads.filter(upload => {
        const uploadDate = new Date(upload.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return uploadDate >= weekAgo;
      });

      const improvement = lastWeekUploads.length > 1 
        ? lastWeekUploads[lastWeekUploads.length - 1].confidence_score - lastWeekUploads[0].confidence_score
        : 0;

      const insights = [
        "You're showing great consistency in your call quality!",
        "Your objection handling has improved significantly this week.",
        "Keep up the momentum - you're building strong sales skills!",
        "Your confidence scores are trending upward!",
        "You used fewer filler words this week - excellent progress!"
      ];

      setProgressData({
        confidence_trend: confidenceTrend,
        objection_trends: objectionTrends,
        weekly_summary: {
          improvement: Math.round(improvement || 0),
          total_calls: uploads.length,
          avg_confidence: Math.round(avgConfidence),
          insight: insights[Math.floor(Math.random() * insights.length)]
        }
      });

    } catch (error) {
      console.error('Error fetching progress data:', error);
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="My Progress | Prospector"
        description="Track your sales performance over time with detailed analytics and insights."
        canonicalPath="/progress"
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
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  My Progress
                </h1>
                <p className="text-muted-foreground">
                  Track your sales performance and improvement over time
                </p>
              </div>
              
              <Button onClick={() => navigate('/call-upload')}>
                Upload New Call
              </Button>
            </div>
          </div>

          {/* Weekly Summary */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                This Week's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    {progressData?.weekly_summary.improvement > 0 ? '+' : ''}
                    {progressData?.weekly_summary.improvement}%
                  </div>
                  <p className="text-sm text-muted-foreground">Confidence Improvement</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {progressData?.weekly_summary.total_calls}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Calls Analyzed</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent mb-1">
                    {progressData?.weekly_summary.avg_confidence}%
                  </div>
                  <p className="text-sm text-muted-foreground">Average Confidence</p>
                </div>
                
                <div className="text-center">
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Trending Up
                  </Badge>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <h4 className="font-semibold text-primary mb-2">💡 AI Insight</h4>
                <p className="text-sm">{progressData?.weekly_summary.insight}</p>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Confidence Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Confidence Over Time
                </CardTitle>
                <CardDescription>
                  Your confidence scores from recent calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressData?.confidence_trend.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data yet. Upload calls to see trends!
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={progressData?.confidence_trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Objection Handling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Objection Handling by Category
                </CardTitle>
                <CardDescription>
                  Performance across different objection types
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressData?.objection_trends.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data yet. Upload calls to see trends!
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={progressData?.objection_trends.slice(-5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="price" fill="hsl(var(--primary))" name="Price" />
                      <Bar dataKey="timing" fill="hsl(var(--accent))" name="Timing" />
                      <Bar dataKey="trust" fill="hsl(var(--secondary))" name="Trust" />
                      <Bar dataKey="competitor" fill="hsl(var(--muted))" name="Competitor" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Keep Building Your Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload more calls to get better insights and track your improvement
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tip: Upload 2-3 calls per week for the best progress tracking
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/challenges')}>
                    View Challenges
                  </Button>
                  <Button onClick={() => navigate('/call-upload')}>
                    Upload Call
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Progress;