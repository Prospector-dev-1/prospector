import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroCard } from '@/components/ui/hero-card';
import { FeatureCard } from '@/components/ui/feature-card';
import { StatsCard } from '@/components/ui/stats-card';
import MobileLayout from '@/components/MobileLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Phone, TrendingUp, User, Target, FileText, Sparkles, Upload, Trophy, Activity, Clock } from 'lucide-react';
interface CallRecord {
  id: string;
  difficulty_level: number;
  overall_score: number;
  duration_seconds: number;
  created_at: string;
  confidence_score: number;
  objection_handling_score: number;
  clarity_score: number;
  persuasiveness_score: number;
  tone_score: number;
  closing_score: number;
}
const Dashboard = () => {
  const {
    user,
    profile,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const [recentCalls, setRecentCalls] = useState<CallRecord[]>([]);
  const [totalCallsCount, setTotalCallsCount] = useState<number>(0);
  const [thisWeekCallsCount, setThisWeekCallsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  useEffect(() => {
    fetchRecentCalls();
  }, [user]);
  const fetchRecentCalls = async () => {
    if (!user) return;
    try {
      // Fetch recent calls (for display)
      const {
        data,
        error
      } = await supabase.from('calls').select('*').eq('user_id', user.id).order('created_at', {
        ascending: false
      }).limit(5);
      if (error) {
        console.error('Error fetching calls:', error);
        return;
      }
      setRecentCalls(data || []);

      // Fetch total count of all calls
      const {
        count,
        error: countError
      } = await supabase.from('calls').select('*', {
        count: 'exact',
        head: true
      }).eq('user_id', user.id);
      if (countError) {
        console.error('Error fetching call count:', countError);
      } else {
        setTotalCallsCount(count || 0);
      }

      // Fetch count of calls made this week
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const {
        count: thisWeekCount,
        error: thisWeekError
      } = await supabase.from('calls').select('*', {
        count: 'exact',
        head: true
      }).eq('user_id', user.id).gte('created_at', oneWeekAgo);
      if (thisWeekError) {
        console.error('Error fetching this week call count:', thisWeekError);
      } else {
        setThisWeekCallsCount(thisWeekCount || 0);
      }

      // Fetch leaderboard data
      const { data: leaderboardData } = await supabase.functions.invoke('get-leaderboard');
      if (leaderboardData) {
        // Handle both wrapped and unwrapped response formats
        const normalizedData = leaderboardData?.leaderboard || leaderboardData || [];
        const arrayData = Array.isArray(normalizedData) ? normalizedData : [];
        setTopUsers(arrayData.slice(0, 3));
        const currentUserEntry = arrayData.find((entry: any) => entry.user_id === user?.id);
        setUserRank(currentUserEntry?.rank || null);
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };
  const getPlanDisplayName = (planType: string) => {
    switch (planType) {
      case 'beginner':
        return 'Beginner Bundle';
      case 'premium':
        return 'Premium';
      case 'free':
      default:
        return 'Free';
    }
  };
  const getSubscriptionBadge = () => {
    const planName = getPlanDisplayName(profile?.subscription_type || 'free');
    if (profile?.subscription_type === 'premium') {
      return <Badge className="bg-primary text-primary-foreground">{planName}</Badge>;
    } else if (profile?.subscription_type === 'beginner') {
      return <Badge className="bg-secondary text-secondary-foreground">{planName}</Badge>;
    }
    return <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => navigate('/plans')}>{planName}</Badge>;
  };
  const averageScore = recentCalls.length > 0 ? (recentCalls.reduce((sum, call) => sum + (call.overall_score || 0), 0) / recentCalls.length).toFixed(1) : 'N/A';
  
  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        {/* Hero Card */}
        <HeroCard
          title="Prospector"
          subtitle="Ready to master your cold calling skills? Start a new practice session or review your progress."
          userName={profile?.first_name || 'Prospector'}
          credits={profile?.credits || 0}
          subscriptionType={profile?.subscription_type}
          onCreditsClick={() => navigate('/profile?tab=subscription')}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatsCard
            label="Total Calls"
            value={totalCallsCount}
            icon={Phone}
            variant="default"
          />
          <StatsCard
            label="Avg Score"
            value={averageScore}
            icon={Target}
            variant="success"
          />
          <StatsCard
            label="This Week"
            value={thisWeekCallsCount}
            icon={Clock}
            variant="info"
          />
        </div>

        {/* Main Features */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground mb-3">Quick Actions</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <FeatureCard
              icon={Phone}
              title="Start Practice Call"
              description="Begin a new AI-powered cold calling session with personalized scenarios"
              buttonText="Start New Call"
              variant="default"
              onAction={() => navigate('/call-simulation')}
            />

            <FeatureCard
              icon={Upload}
              title="Upload Call Recording"
              description="Get detailed AI analysis and coaching for your real calls"
              buttonText="Upload & Analyze"
              variant="upload"
              onAction={() => navigate('/call-upload')}
            />

            <FeatureCard
              icon={FileText}
              title="Script Analysis"
              description="Get AI feedback on your sales scripts and improve your approach"
              buttonText="Analyze Script"
              variant="progress"
              onAction={() => navigate('/script-analysis')}
            />

            <FeatureCard
              icon={Sparkles}
              title="Custom Script Generator"
              description="Generate personalized sales scripts tailored to your industry"
              buttonText="Generate Script"
              variant="challenges"
              onAction={() => navigate('/custom-script')}
            />
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Weekly Leaderboard</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/leaderboard')}
            >
              View All
            </Button>
          </div>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : topUsers.length === 0 ? (
                <div className="text-center py-4">
                  <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No rankings yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topUsers.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        entry.user_id === user?.id ? 'bg-primary/10' : 'bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold">#{entry.rank}</span>
                        <span className="text-sm">
                          {entry.profile.first_name} {entry.profile.last_initial}.
                        </span>
                        {entry.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <span className="text-sm font-bold text-primary">{entry.total_score}</span>
                    </div>
                  ))}
                  {userRank && userRank > 3 && (
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10">
                        <span className="text-sm">Your rank: #{userRank}</span>
                        <Button variant="outline" size="sm" onClick={() => navigate('/leaderboard')}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Recent Practice Sessions</h3>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading sessions...</p>
                </div>
              ) : recentCalls.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                    <Phone className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">No practice sessions yet</p>
                  <p className="text-xs text-muted-foreground">
                    Start your first call to see your progress here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCalls.map(call => (
                    <div 
                      key={call.id} 
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/call-results/${call.id}`)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full gradient-primary p-0.5">
                          <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                            <Activity className="h-5 w-5 text-foreground" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={call.difficulty_level <= 3 ? "secondary" : call.difficulty_level <= 7 ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              Level {call.difficulty_level}
                            </Badge>
                            <span className="text-sm font-medium">Score: {call.overall_score}/10</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {Math.floor((call.duration_seconds || 0) / 60)}m {(call.duration_seconds || 0) % 60}s • {new Date(call.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
};
export default Dashboard;