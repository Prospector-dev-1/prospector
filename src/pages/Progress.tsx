import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, Calendar, Target, Award, Zap, BarChart3, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

interface ProgressData {
  confidence_trend: Array<{ date: string; score: number; source: 'upload' | 'live' }>;
  objection_trends: Array<{ date: string; price: number; timing: number; trust: number; competitor: number; source: 'upload' | 'live' }>;
  success_rate_trend: Array<{ date: string; successRate: number; totalCalls: number }>;
  difficulty_progression: Array<{ difficulty: number; avgScore: number; callCount: number }>;
  comprehensive_scores: Array<{ date: string; clarity: number; persuasiveness: number; tone: number; closing: number; overall: number }>;
  weekly_summary: {
    improvement: number;
    total_calls: number;
    live_calls: number;
    uploaded_calls: number;
    avg_confidence: number;
    success_rate: number;
    avg_difficulty: number;
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
      // Get both call uploads and live calls for comprehensive data
      const [uploadsResult, callsResult] = await Promise.all([
        supabase
          .from('call_uploads')
          .select('*')
          .eq('user_id', user?.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: true }),
        supabase
          .from('calls')
          .select('*')
          .eq('user_id', user?.id)
          .eq('call_status', 'completed')
          .order('created_at', { ascending: true })
      ]);

      if (uploadsResult.error) throw uploadsResult.error;
      if (callsResult.error) throw callsResult.error;

      const uploads = uploadsResult.data || [];
      const liveCalls = callsResult.data || [];

      if (uploads.length === 0 && liveCalls.length === 0) {
        setProgressData({
          confidence_trend: [],
          objection_trends: [],
          success_rate_trend: [],
          difficulty_progression: [],
          comprehensive_scores: [],
          weekly_summary: {
            improvement: 0,
            total_calls: 0,
            live_calls: 0,
            uploaded_calls: 0,
            avg_confidence: 0,
            success_rate: 0,
            avg_difficulty: 0,
            insight: "Start practicing with live calls or upload recordings to track your progress!"
          }
        });
        return;
      }

      // Process confidence trend data from both sources
      const uploadConfidenceTrend = uploads.map(upload => ({
        date: new Date(upload.created_at).toLocaleDateString(),
        score: upload.confidence_score || 0,
        source: 'upload' as const
      }));

      const liveCallConfidenceTrend = liveCalls.map(call => ({
        date: new Date(call.created_at).toLocaleDateString(),
        score: call.confidence_score || 0,
        source: 'live' as const
      }));

      const confidenceTrend = [...uploadConfidenceTrend, ...liveCallConfidenceTrend]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Process objection handling trends
      const uploadObjectionTrends = uploads.map(upload => {
        const scores = upload.objection_handling_scores as any || {};
        return {
          date: new Date(upload.created_at).toLocaleDateString(),
          price: scores.price || 0,
          timing: scores.timing || 0,
          trust: scores.trust || 0,
          competitor: scores.competitor || 0,
          source: 'upload' as const
        };
      });

      const liveCallObjectionTrends = liveCalls.map(call => {
        const score = call.objection_handling_score || 0;
        return {
          date: new Date(call.created_at).toLocaleDateString(),
          price: score,
          timing: score,
          trust: score,
          competitor: score,
          source: 'live' as const
        };
      });

      const objectionTrends = [...uploadObjectionTrends, ...liveCallObjectionTrends]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate success rate trend from live calls
      const successRateByDate = liveCalls.reduce((acc, call) => {
        const date = new Date(call.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { total: 0, successful: 0 };
        }
        acc[date].total++;
        if (call.successful_sale) {
          acc[date].successful++;
        }
        return acc;
      }, {} as Record<string, { total: number; successful: number }>);

      const successRateTrend = Object.entries(successRateByDate).map(([date, data]) => ({
        date,
        successRate: Math.round((data.successful / data.total) * 100),
        totalCalls: data.total
      }));

      // Calculate difficulty progression
      const difficultyGroups = liveCalls.reduce((acc, call) => {
        const difficulty = call.difficulty_level;
        if (!acc[difficulty]) {
          acc[difficulty] = { scores: [], count: 0 };
        }
        acc[difficulty].scores.push(call.overall_score || 0);
        acc[difficulty].count++;
        return acc;
      }, {} as Record<number, { scores: number[]; count: number }>);

      const difficultyProgression = Object.entries(difficultyGroups).map(([difficulty, data]) => ({
        difficulty: parseInt(difficulty),
        avgScore: Math.round(data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length),
        callCount: data.count
      })).sort((a, b) => a.difficulty - b.difficulty);

      // Process comprehensive scores from live calls
      const comprehensiveScores = liveCalls.map(call => ({
        date: new Date(call.created_at).toLocaleDateString(),
        clarity: call.clarity_score || 0,
        persuasiveness: call.persuasiveness_score || 0,
        tone: call.tone_score || 0,
        closing: call.closing_score || 0,
        overall: call.overall_score || 0
      }));

      // Calculate weekly summary
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const recentUploads = uploads.filter(upload => new Date(upload.created_at) >= weekAgo);
      const recentLiveCalls = liveCalls.filter(call => new Date(call.created_at) >= weekAgo);

      const allConfidenceScores = confidenceTrend.map(item => item.score).filter(score => score > 0);
      const avgConfidence = allConfidenceScores.length > 0 
        ? Math.round(allConfidenceScores.reduce((sum, score) => sum + score, 0) / allConfidenceScores.length)
        : 0;

      const successfulCalls = liveCalls.filter(call => call.successful_sale).length;
      const successRate = liveCalls.length > 0 ? Math.round((successfulCalls / liveCalls.length) * 100) : 0;

      const avgDifficulty = liveCalls.length > 0 
        ? Math.round(liveCalls.reduce((sum, call) => sum + call.difficulty_level, 0) / liveCalls.length)
        : 0;

      // Calculate improvement based on recent vs older confidence scores
      const recentConfidenceScores = confidenceTrend.slice(-7).map(item => item.score).filter(score => score > 0);
      const olderConfidenceScores = confidenceTrend.slice(0, -7).map(item => item.score).filter(score => score > 0);
      
      const recentAvg = recentConfidenceScores.length > 0 
        ? recentConfidenceScores.reduce((sum, score) => sum + score, 0) / recentConfidenceScores.length
        : 0;
      const olderAvg = olderConfidenceScores.length > 0 
        ? olderConfidenceScores.reduce((sum, score) => sum + score, 0) / olderConfidenceScores.length
        : recentAvg;

      const improvement = Math.round(recentAvg - olderAvg);

      const insights = [
        `You've completed ${liveCalls.length + uploads.length} practice sessions - excellent dedication!`,
        `Your success rate is ${successRate}% - keep building on this momentum!`,
        `You're practicing at difficulty level ${avgDifficulty} - challenge yourself to grow!`,
        "Your confidence scores are trending upward across both live and uploaded calls!",
        "Great mix of live practice and call analysis - this balanced approach accelerates learning!",
        "Your objection handling has improved significantly across all categories!",
        "You're building strong sales skills with consistent practice!"
      ];

      setProgressData({
        confidence_trend: confidenceTrend,
        objection_trends: objectionTrends,
        success_rate_trend: successRateTrend,
        difficulty_progression: difficultyProgression,
        comprehensive_scores: comprehensiveScores,
        weekly_summary: {
          improvement,
          total_calls: uploads.length + liveCalls.length,
          live_calls: liveCalls.length,
          uploaded_calls: uploads.length,
          avg_confidence: avgConfidence,
          success_rate: successRate,
          avg_difficulty: avgDifficulty,
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
              
              <Button 
                onClick={() => navigate('/call-upload')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
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
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                  <p className="text-sm text-muted-foreground">Total Practice Sessions</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent mb-1">
                    {progressData?.weekly_summary.avg_confidence}%
                  </div>
                  <p className="text-sm text-muted-foreground">Average Confidence</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {progressData?.weekly_summary.success_rate}%
                  </div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {progressData?.weekly_summary.live_calls}
                  </div>
                  <p className="text-sm text-muted-foreground">Live Calls</p>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {progressData?.weekly_summary.uploaded_calls}
                  </div>
                  <p className="text-sm text-muted-foreground">Call Uploads</p>
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
                       <Tooltip 
                         formatter={(value, name, props) => [
                           `${value}%`, 
                           `Confidence (${props.payload.source === 'live' ? 'Live Call' : 'Upload'})`
                         ]}
                       />
                       <Line 
                         type="monotone" 
                         dataKey="score" 
                         stroke="hsl(var(--primary))" 
                         strokeWidth={2}
                         dot={(props) => (
                           <circle 
                             cx={props.cx} 
                             cy={props.cy} 
                             r={4}
                             fill={props.payload.source === 'live' ? "hsl(var(--primary))" : "hsl(var(--accent))"}
                             stroke="white"
                             strokeWidth={2}
                           />
                         )}
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

          {/* New Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Success Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Success Rate Trend
                </CardTitle>
                <CardDescription>
                  Your sales success rate from live call simulations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressData?.success_rate_trend.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Complete live calls to see success trends!
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={progressData?.success_rate_trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Success Rate']} />
                      <Line 
                        type="monotone" 
                        dataKey="successRate" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--accent))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Difficulty Progression */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Difficulty Progression
                </CardTitle>
                <CardDescription>
                  Performance across different difficulty levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressData?.difficulty_progression.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Complete calls at different difficulties to see progression!
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={progressData?.difficulty_progression}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="difficulty" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        formatter={(value, name, props) => [
                          `${value}%`, 
                          `Avg Score (${props.payload.callCount} calls)`
                        ]}
                      />
                      <Bar dataKey="avgScore" fill="hsl(var(--primary))" />
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
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload more calls to get better insights and track your improvement
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tip: Upload 2-3 calls per week for the best progress tracking
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={() => navigate('/challenges')} className="flex-1 sm:flex-none">
                    View Challenges
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/call-simulation')} className="flex-1 sm:flex-none">
                    <Zap className="h-4 w-4 mr-2" />
                    Live Practice
                  </Button>
                  <Button onClick={() => navigate('/call-upload')} className="flex-1 sm:flex-none">
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