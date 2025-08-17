import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import MobileLayout from '@/components/MobileLayout';
import SEO from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, ArrowLeft, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaderboardEntry {
  user_id: string;
  score: number;
  rank: number;
  profile: {
    first_name: string;
    last_initial: string;
  };
}

const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-leaderboard');
      
      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      // Handle both wrapped and unwrapped response formats
      const leaderboardData = data?.leaderboard || data || [];
      const normalizedData = Array.isArray(leaderboardData) ? leaderboardData : [];
      setLeaderboard(normalizedData);
      
      // Find current user's rank
      const currentUserEntry = normalizedData.find((entry: LeaderboardEntry) => entry.user_id === user?.id);
      setUserRank(currentUserEntry?.rank || null);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    if (rank === 1) return "default";
    if (rank <= 3) return "secondary";
    if (rank <= 10) return "outline";
    return "secondary";
  };

  return (
    <MobileLayout>
      <SEO
        title="Leaderboard | Prospector"
        description="See how you rank against other sales professionals in the weekly leaderboard"
        canonicalPath="/leaderboard"
      />
      
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">Weekly Leaderboard</h1>
            {userRank && (
              <Badge variant={getRankBadgeVariant(userRank)} className="mt-1">
                Your Rank: #{userRank}
              </Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/challenges')}
          >
            <Target className="h-4 w-4 mr-2" />
            Challenges
          </Button>
        </div>

        {/* Leaderboard */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span>Top Performers This Week</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-sm text-muted-foreground">Loading leaderboard...</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No rankings available yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete challenges to appear on the leaderboard
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      entry.user_id === user?.id
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-muted/20 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-foreground">
                            {entry.profile.first_name} {entry.profile.last_initial}.
                          </span>
                          {entry.user_id === user?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Rank #{entry.rank}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">{entry.score}</span>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-16 flex-col"
            onClick={() => navigate('/call-simulation')}
          >
            <Target className="h-5 w-5 mb-1" />
            <span className="text-xs">Practice Calls</span>
          </Button>
          <Button
            variant="outline"
            className="h-16 flex-col"
            onClick={() => navigate('/challenges')}
          >
            <Trophy className="h-5 w-5 mb-1" />
            <span className="text-xs">View Challenges</span>
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Leaderboard;