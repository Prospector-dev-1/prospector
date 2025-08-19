import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Trophy, Target, Clock, Users, Crown, Upload, Zap, Phone, Star, TrendingUp, Calendar, Flame, Shield, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';
import MobileLayout from '@/components/MobileLayout';
import SmartBackButton from '@/components/SmartBackButton';

interface Challenge {
  id: string;
  name: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_credits: number;
  end_date: string;
}

interface UserProgress {
  challenge_id: string;
  current_progress: number;
  completed: boolean;
  completed_at: string | null;
  credits_claimed?: boolean;
  claimed_at?: string | null;
}

interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  rank: number;
  profile?: {
    first_name?: string;
    last_name?: string;
    last_initial?: string;
  };
}

const Challenges = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchChallengesData();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-leaderboard');
      
      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }
      
      let leaderboardData = [];
      if (data && data.leaderboard && Array.isArray(data.leaderboard)) {
        leaderboardData = data.leaderboard;
      } else if (Array.isArray(data)) {
        leaderboardData = data;
      }
      
      const currentUserEntry = leaderboardData.find((entry: any) => entry.user_id === user?.id);
      let topUsers = leaderboardData.slice(0, 15);
      
      if (currentUserEntry && !topUsers.find((u: any) => u.user_id === user?.id)) {
        topUsers.push(currentUserEntry);
      }
      
      return topUsers;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  };

  const fetchChallengesData = async (showCompletionNotifications = false) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (challengesError) {
        console.error('Error fetching challenges:', challengesError);
        return;
      }

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) {
        console.error('Error fetching user progress:', progressError);
        return;
      }

      // Calculate actual progress for each challenge
      for (const challenge of challengesData || []) {
        const userProgress = progressData?.find(p => p.challenge_id === challenge.id);
        let actualProgress = 0;
        const isCompleted = userProgress?.completed || false;
        const creditsAlreadyClaimed = userProgress?.credits_claimed || false;
        
        switch (challenge.challenge_type) {
          case 'daily_calls':
            const today = new Date().toISOString().split('T')[0];
            const { data: todayCalls } = await supabase
              .from('calls')
              .select('id')
              .eq('user_id', user.id)
              .gte('created_at', `${today}T00:00:00.000Z`)
              .lt('created_at', `${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}T00:00:00.000Z`);
            actualProgress = todayCalls?.length || 0;
            break;
            
          case 'weekly_calls':
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const { data: weekCalls } = await supabase
              .from('calls')
              .select('id')
              .eq('user_id', user.id)
              .gte('created_at', weekStart.toISOString());
            actualProgress = weekCalls?.length || 0;
            break;
            
          case 'upload_calls':
            const { data: uploads } = await supabase
              .from('call_uploads')
              .select('id')
              .eq('user_id', user.id)
              .gte('created_at', challenge.start_date)
              .lte('created_at', challenge.end_date);
            actualProgress = uploads?.length || 0;
            break;
            
          case 'ai_replay_sessions':
            const { data: replays } = await supabase
              .from('ai_replays')
              .select('id')
              .eq('user_id', user.id)
              .gte('created_at', challenge.start_date)
              .lte('created_at', challenge.end_date);
            actualProgress = replays?.length || 0;
            break;
            
          case 'high_score':
            const { data: bestCall } = await supabase
              .from('calls')
              .select('overall_score')
              .eq('user_id', user.id)
              .gte('created_at', challenge.start_date)
              .lte('created_at', challenge.end_date)
              .order('overall_score', { ascending: false })
              .limit(1);
            actualProgress = bestCall?.[0]?.overall_score || 0;
            break;
            
          default:
            actualProgress = userProgress?.current_progress || 0;
        }

        // Check if challenge should be marked as completed
        const isNowCompleted = actualProgress >= challenge.target_value;
        const wasCompleted = userProgress?.completed || false;

        // Update progress if it has changed or if completion status changed
        if (actualProgress !== (userProgress?.current_progress || 0) || isNowCompleted !== wasCompleted) {
          await supabase
            .from('user_challenge_progress')
            .upsert({
              user_id: user.id,
              challenge_id: challenge.id,
              current_progress: actualProgress,
              completed: isNowCompleted,
              completed_at: isNowCompleted && !wasCompleted ? new Date().toISOString() : userProgress?.completed_at,
              credits_claimed: userProgress?.credits_claimed || false,
              claimed_at: userProgress?.claimed_at,
              updated_at: new Date().toISOString()
            });

          // Show completion notification for newly completed challenges (only when explicitly requested)
          if (isNowCompleted && !wasCompleted && showCompletionNotifications) {
            toast({
              title: "🎉 Challenge Completed!",
              description: `Claim your ${challenge.reward_credits} credits from the Challenges page!`,
              duration: 5000,
            });
          }
        }
      }

      // Fetch updated progress data
      const { data: updatedProgressData } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', user.id);

      // Fetch leaderboard
      const leaderboardData = await fetchLeaderboard();
      const currentUserRank = leaderboardData.find(entry => entry.user_id === user?.id)?.rank;

      setChallenges(challengesData || []);
      setUserProgress(updatedProgressData || []);
      setLeaderboard(leaderboardData);
      setUserRank(currentUserRank || null);

    } catch (error) {
      console.error('Error fetching challenges data:', error);
      toast({
        title: "Error",
        description: "Failed to load challenges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProgressForChallenge = (challengeId: string): UserProgress | undefined => {
    return userProgress.find(p => p.challenge_id === challengeId);
  };

  const claimChallengeCredits = async (challengeId: string, rewardCredits: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('claim-challenge-credits', {
        body: { challengeId }
      });

      if (error) {
        console.error('Error claiming credits:', error);
        toast({
          title: "Error",
          description: "Failed to claim credits. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Credits Claimed! 🎉",
          description: `${rewardCredits} credits have been added to your account!`,
        });
        
        // Refresh challenges data and user profile (don't show completion notifications on refresh)
        await fetchChallengesData(false);
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error claiming credits:', error);
      toast({
        title: "Error",
        description: "Failed to claim credits. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'daily_calls':
      case 'weekly_calls':
        return Phone;
      case 'upload_calls':
        return Upload;
      case 'ai_replay_sessions':
        return Zap;
      case 'high_score':
        return Target;
      default:
        return Trophy;
    }
  };

  const getChallengeActionButton = (challenge: Challenge, progress?: UserProgress) => {
    const isCompleted = progress?.completed || false;
    const creditsAlreadyClaimed = progress?.credits_claimed || false;

    // If challenge is completed but credits not claimed, show claim button
    if (isCompleted && !creditsAlreadyClaimed) {
      return (
        <Button 
          onClick={() => claimChallengeCredits(challenge.id, challenge.reward_credits)}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          Claim {challenge.reward_credits} Credits 🎁
        </Button>
      );
    }

    // If challenge is completed and credits claimed, don't show any button (will be in dropdown)
    if (isCompleted && creditsAlreadyClaimed) {
      return null;
    }

    // Regular action buttons for active challenges
    switch (challenge.challenge_type) {
      case 'daily_calls':
      case 'weekly_calls':
        return (
          <Button 
            onClick={() => navigate('/call-simulation')}
            className="w-full"
          >
            Start Call
          </Button>
        );
      case 'upload_calls':
        return (
          <Button 
            onClick={() => navigate('/call-upload')}
            variant="outline"
            className="w-full"
          >
            Upload Call
          </Button>
        );
      case 'ai_replay_sessions':
        return (
          <Button 
            onClick={() => navigate('/ai-replay')}
            variant="secondary"
            className="w-full"
          >
            Start AI Replay
          </Button>
        );
      case 'high_score':
        return (
          <Button 
            onClick={() => navigate('/call-simulation')}
            className="w-full"
          >
            Practice Call
          </Button>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <MobileLayout>
      <SEO 
        title="Challenges | Prospector"
        description="Complete challenges to improve your sales skills and earn rewards."
        canonicalPath="/challenges"
      />
      
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <SmartBackButton className="flex items-center gap-2 mb-4" />
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Challenges
                </h1>
                <p className="text-muted-foreground">
                  Complete challenges to earn credits and improve your skills
                </p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">#{userRank || '--'}</div>
                <p className="text-sm text-muted-foreground">Your Rank</p>
              </div>
            </div>
          </div>

          {/* Motivational Banner */}
          <Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {userRank ? 
                      `🎯 ${userRank <= 3 ? `Rank #${userRank} - You're crushing it!` : 
                            userRank <= 10 ? `Top ${Math.round((userRank / Math.max(leaderboard.length, 1)) * 100)}% - Great work!` :
                            'Keep building your skills!'}`
                      : '🎯 Start your journey to the top!'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {userRank ? 
                      'Keep pushing forward - every challenge completed improves your ranking.' :
                      'Complete challenges and practice calls to join the leaderboard!'}
                  </p>
                </div>
                <Trophy className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Challenges */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active and Completed but Unclaimed Challenges */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground mb-4">Challenges</h2>
                
                {challenges
                  .filter(challenge => {
                    const progress = getProgressForChallenge(challenge.id);
                    const isCompleted = progress?.completed || false;
                    const creditsAlreadyClaimed = progress?.credits_claimed || false;
                    // Show if not completed OR completed but credits not claimed
                    return !isCompleted || (isCompleted && !creditsAlreadyClaimed);
                  })
                  .map((challenge) => {
                    const progress = getProgressForChallenge(challenge.id);
                    const Icon = getChallengeIcon(challenge.challenge_type);

                    return (
                      <Card key={challenge.id} className={cn(
                        progress?.completed && !progress?.credits_claimed && "border-primary bg-primary/5"
                      )}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5 text-primary" />
                              <h3 className="font-medium text-foreground">{challenge.name}</h3>
                              {progress?.completed && !progress?.credits_claimed && (
                                <Badge className="bg-primary text-primary-foreground animate-pulse">
                                  Completed! 
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {challenge.reward_credits} Credits
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-4">{challenge.description}</p>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">
                                {Math.min(progress?.current_progress || 0, challenge.target_value)}/{challenge.target_value}
                              </span>
                            </div>
                            <Progress 
                              value={(Math.min(progress?.current_progress || 0, challenge.target_value) / challenge.target_value) * 100} 
                              className="w-full"
                            />
                            <div className="pt-2">
                              {getChallengeActionButton(challenge, progress)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
              
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 w-full justify-start">
                    <ChevronDown className="h-4 w-4" />
                    <span>Completed Challenges ({challenges.filter(c => {
                      const progress = getProgressForChallenge(c.id);
                      return progress?.completed && progress?.credits_claimed;
                    }).length})</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  {challenges
                    .filter(challenge => {
                      const progress = getProgressForChallenge(challenge.id);
                      return progress?.completed && progress?.credits_claimed;
                    })
                    .map((challenge) => {
                      const progress = getProgressForChallenge(challenge.id);
                      const Icon = getChallengeIcon(challenge.challenge_type);

                      return (
                        <Card key={challenge.id} className="opacity-75">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-medium text-muted-foreground">{challenge.name}</h3>
                                <Badge variant="secondary" className="text-xs">
                                  ✓ Claimed
                                </Badge>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {challenge.reward_credits} Credits
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-4">{challenge.description}</p>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium text-muted-foreground">
                                  {challenge.target_value}/{challenge.target_value}
                                </span>
                              </div>
                              <Progress value={100} className="w-full" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </CollapsibleContent>
              </Collapsible>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Jump into activities that help you complete challenges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button onClick={() => navigate('/call-upload')} variant="outline" className="justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Call
                    </Button>
                    <Button onClick={() => navigate('/call-simulation')} className="justify-start">
                      <Phone className="h-4 w-4 mr-2" />
                      Start Call
                    </Button>
                    <Button onClick={() => navigate('/ai-replay')} variant="secondary" className="justify-start">
                      <Zap className="h-4 w-4 mr-2" />
                      AI Replay
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboard Sidebar */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Leaderboard
                  </CardTitle>
                  <CardDescription>
                    Top performers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboard.map((entry) => (
                      <div 
                        key={entry.user_id} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          entry.user_id === user?.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            entry.rank === 1 ? 'bg-yellow-500 text-white' :
                            entry.rank === 2 ? 'bg-gray-400 text-white' :
                            entry.rank === 3 ? 'bg-orange-500 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {entry.rank}
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {entry.user_id === user?.id ? 'You' : 
                               `${entry.profile?.first_name || 'User'} ${entry.profile?.last_initial || ''}`.trim()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.total_score} points
                            </div>
                          </div>
                        </div>
                        
                        {entry.rank <= 3 && (
                          <Trophy className={`h-4 w-4 ${
                            entry.rank === 1 ? 'text-yellow-500' :
                            entry.rank === 2 ? 'text-gray-400' :
                            'text-orange-500'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Challenges;