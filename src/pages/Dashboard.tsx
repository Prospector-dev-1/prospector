import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Phone, TrendingUp, User, Settings, LogOut, CreditCard } from 'lucide-react';
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
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };
  const getSubscriptionBadge = () => {
    if (profile?.subscription_type === 'premium') {
      return <Badge className="bg-primary text-primary-foreground">Premium</Badge>;
    }
    return <Badge variant="secondary">Free</Badge>;
  };
  const averageScore = recentCalls.length > 0 ? (recentCalls.reduce((sum, call) => sum + (call.overall_score || 0), 0) / recentCalls.length).toFixed(1) : 'N/A';
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold text-primary">Prospector</h1>
              {getSubscriptionBadge()}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Credits</p>
                <p className="text-sm font-bold text-primary">{profile?.credits || 0}</p>
              </div>
              <div className="text-right sm:hidden">
                <p className="text-xs font-bold text-primary">{profile?.credits || 0}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
                <User className="h-4 w-4" />
              </Button>
              
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
            Welcome back, {profile?.first_name || 'Prospector'}!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Ready to improve your cold calling skills? Start a new practice session or review your progress.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/call-simulation')}>
            <CardHeader className="text-center pb-3">
              <Phone className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-2" />
              <CardTitle className="text-base sm:text-lg">Start Practice Call</CardTitle>
              <CardDescription className="text-sm">
                Begin a new AI-powered cold calling session
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button className="w-full" size="lg">
                Start New Call
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center pb-3">
              <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-accent mx-auto mb-2" />
              <CardTitle className="text-base sm:text-lg">Performance</CardTitle>
              <CardDescription className="text-sm">
                Average Score: {averageScore}/10
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total Calls: {totalCallsCount}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  This Week: {thisWeekCallsCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
            <CardHeader className="text-center pb-3">
              <CreditCard className="h-8 w-8 sm:h-10 sm:w-10 text-info mx-auto mb-2" />
              <CardTitle className="text-base sm:text-lg">Credits</CardTitle>
              <CardDescription className="text-sm">
                {profile?.credits || 0} calls remaining
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button variant="outline" className="w-full">
                Buy More Credits
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Calls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Recent Practice Sessions</CardTitle>
            <CardDescription className="text-sm">
              Your latest cold calling practice sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="mt-3 text-sm text-muted-foreground">Loading calls...</p>
              </div> : recentCalls.length === 0 ? <div className="text-center py-6">
                <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No practice sessions yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start your first call to see your progress here
                </p>
              </div> : <div className="space-y-3">
                {recentCalls.map(call => <div key={call.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border border-border rounded-lg space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Badge variant={call.difficulty_level <= 3 ? "secondary" : call.difficulty_level <= 7 ? "default" : "destructive"} className="text-xs">
                          Level {call.difficulty_level}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Score: {call.overall_score}/10
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor((call.duration_seconds || 0) / 60)}m {(call.duration_seconds || 0) % 60}s
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end space-x-2 sm:space-x-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(call.created_at).toLocaleDateString()}
                      </p>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate(`/call-results/${call.id}`)}>
                        View Details
                      </Button>
                    </div>
                  </div>)}
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Dashboard;