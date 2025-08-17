import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Trophy, Target, Clock, Users, Crown, Upload, Zap, Phone, Star, TrendingUp, Calendar, Flame, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

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
}

interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  rank: number;
  profile?: {
    first_name?: string;
    last_name?: string;
  };
}

const Challenges = () => {
  const { user, profile } = useAuth();
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

  const fetchChallengesData = async () => {
    try {
      // Fetch active challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (challengesError) throw challengesError;

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', user?.id);

      if (progressError) throw progressError;

      // Calculate actual progress for each challenge type
      const updatedProgress = await Promise.all((challengesData || []).map(async (challenge) => {
        let actualProgress = 0;

        if (challenge.challenge_type === 'upload_calls') {
          const { count } = await supabase
            .from('call_uploads')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('status', 'completed')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'complete_replays') {
          const { count } = await supabase
            .from('ai_replays')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'improve_score') {
          // For improvement challenges, check the difference between first and last call this week
          const { data: calls } = await supabase
            .from('call_uploads')
            .select('confidence_score, created_at')
            .eq('user_id', user?.id)
            .eq('status', 'completed')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: true });

          if (calls && calls.length >= 2) {
            const improvement = calls[calls.length - 1].confidence_score - calls[0].confidence_score;
            actualProgress = Math.max(0, improvement);
          }
        } else if (challenge.challenge_type === 'live_calls') {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'difficulty_calls') {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .gte('difficulty_level', 5)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'rookie_calls') {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .gte('difficulty_level', 1)
            .lte('difficulty_level', 3)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'pro_calls') {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .gte('difficulty_level', 7)
            .lte('difficulty_level', 10)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'master_closes') {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .eq('successful_sale', true)
            .gte('difficulty_level', 8)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'successful_closes') {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .eq('successful_sale', true)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'objection_expert') {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .gte('objection_handling_score', 80)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'tone_master') {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .gte('tone_score', 85)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        } else if (challenge.challenge_type === 'daily_calls') {
          // Count unique days with at least 1 call
          const { data: dailyStats } = await supabase
            .from('user_daily_stats')
            .select('date')
            .eq('user_id', user?.id)
            .gte('calls_completed', 1)
            .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
          
          actualProgress = dailyStats?.length || 0;
        } else if (challenge.challenge_type === 'closing_streak') {
          // This would need a more complex query to track consecutive successful sales
          const { data: successfulCalls } = await supabase
            .from('calls')
            .select('successful_sale, created_at')
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .eq('successful_sale', true)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: true });
          
          // Calculate longest streak of consecutive successful calls
          let maxStreak = 0;
          let currentStreak = 0;
          
          successfulCalls?.forEach(() => {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          });
          
          actualProgress = maxStreak;
        } else if (challenge.challenge_type === 'mixed_challenge') {
          // Upload 2 calls + Complete 3 live calls + 1 AI replay
          const [uploadsCount, liveCalls, replays] = await Promise.all([
            supabase.from('call_uploads').select('*', { count: 'exact', head: true })
              .eq('user_id', user?.id).eq('status', 'completed')
              .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
            supabase.from('calls').select('*', { count: 'exact', head: true })
              .eq('user_id', user?.id).eq('call_status', 'completed')
              .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
            supabase.from('ai_replays').select('*', { count: 'exact', head: true })
              .eq('user_id', user?.id)
              .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          ]);
          
          const uploadProgress = Math.min(2, uploadsCount.count || 0);
          const liveCallProgress = Math.min(3, liveCalls.count || 0);
          const replayProgress = Math.min(1, replays.count || 0);
          
          actualProgress = uploadProgress + liveCallProgress + replayProgress;
        } else if (challenge.challenge_type === 'skills_showcase') {
          const { count } = await supabase
            .from('calls')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('call_status', 'completed')
            .gte('tone_score', 75)
            .gte('objection_handling_score', 75)
            .gte('closing_score', 75)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          actualProgress = count || 0;
        }

        // Update progress in database
        const existingProgress = progressData?.find(p => p.challenge_id === challenge.id);
        const isCompleted = actualProgress >= challenge.target_value;

        if (existingProgress) {
          if (existingProgress.current_progress !== actualProgress || (isCompleted && !existingProgress.completed)) {
            await supabase
              .from('user_challenge_progress')
              .update({
                current_progress: actualProgress,
                completed: isCompleted,
                completed_at: isCompleted ? new Date().toISOString() : null
              })
              .eq('id', existingProgress.id);
          }
        } else {
          await supabase
            .from('user_challenge_progress')
            .insert({
              user_id: user?.id,
              challenge_id: challenge.id,
              current_progress: actualProgress,
              completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : null
            });
        }

        return {
          challenge_id: challenge.id,
          current_progress: actualProgress,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        };
      }));

      // Generate mock leaderboard data (in a real app, this would come from the database)
      const mockLeaderboard = [
        { user_id: 'user1', total_score: 1250, rank: 1, profile: { first_name: 'Alex', last_name: 'Chen' } },
        { user_id: 'user2', total_score: 1180, rank: 2, profile: { first_name: 'Sarah', last_name: 'Johnson' } },
        { user_id: 'user3', total_score: 1050, rank: 3, profile: { first_name: 'Mike', last_name: 'Davis' } },
        { user_id: user?.id || 'current', total_score: 890, rank: 12, profile: { first_name: profile?.first_name, last_name: profile?.last_name } },
        { user_id: 'user5', total_score: 820, rank: 15, profile: { first_name: 'Emma', last_name: 'Wilson' } },
      ];

      setChallenges(challengesData || []);
      setUserProgress(updatedProgress);
      setLeaderboard(mockLeaderboard);
      setUserRank(12); // Mock rank

    } catch (error) {
      console.error('Error fetching challenges data:', error);
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const getProgressForChallenge = (challengeId: string) => {
    return userProgress.find(p => p.challenge_id === challengeId);
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'upload_calls': return Upload;
      case 'improve_score': return Target;
      case 'complete_replays': return Zap;
      case 'live_calls': return Phone;
      case 'difficulty_calls': return TrendingUp;
      case 'rookie_calls': return Star;
      case 'pro_calls': return Shield;
      case 'master_closes': return Crown;
      case 'successful_closes': return Trophy;
      case 'objection_expert': return Target;
      case 'tone_master': return Star;
      case 'daily_calls': return Calendar;
      case 'closing_streak': return Flame;
      case 'mixed_challenge': return Users;
      case 'skills_showcase': return Crown;
      default: return Trophy;
    }
  };

  const getChallengeActionButton = (challenge: Challenge) => {
    const difficulty = challenge.challenge_type === 'rookie_calls' ? 2 : 
                      challenge.challenge_type === 'pro_calls' ? 8 :
                      challenge.challenge_type === 'master_closes' ? 9 : 5;

    switch (challenge.challenge_type) {
      case 'live_calls':
      case 'difficulty_calls':
      case 'rookie_calls':
      case 'pro_calls':
      case 'master_closes':
      case 'successful_closes':
      case 'objection_expert':
      case 'tone_master':
      case 'closing_streak':
      case 'skills_showcase':
        return (
          <Button 
            size="sm" 
            onClick={() => navigate(`/call-simulation?difficulty=${difficulty}`)}
            className="mt-2"
          >
            <Phone className="h-3 w-3 mr-1" />
            Start Call (Difficulty {difficulty})
          </Button>
        );
      case 'mixed_challenge':
        return (
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/call-upload')}
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate('/call-simulation')}
            >
              <Phone className="h-3 w-3 mr-1" />
              Live Call
            </Button>
          </div>
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
    <>
      <SEO 
        title="Challenges | Prospector"
        description="Complete weekly challenges to improve your sales skills and earn rewards."
        canonicalPath="/challenges"
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
                  Weekly Challenges
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
                    🎯 You're in the top 12% this week!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Keep pushing forward - you're doing amazing work improving your sales skills.
                  </p>
                </div>
                <Trophy className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Challenges */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">This Week's Challenges</h2>
                <div className="space-y-4">
                  {challenges.map((challenge) => {
                    const progress = getProgressForChallenge(challenge.id);
                    const Icon = getChallengeIcon(challenge.challenge_type);
                    const progressPercentage = Math.min(100, ((progress?.current_progress || 0) / challenge.target_value) * 100);

                    return (
                      <Card key={challenge.id} className={progress?.completed ? 'border-success bg-success/5' : ''}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-primary" />
                              <div>
                                <CardTitle className="text-base">{challenge.name}</CardTitle>
                                <CardDescription>{challenge.description}</CardDescription>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                +{challenge.reward_credits} credits
                              </Badge>
                              {progress?.completed && (
                                <Badge variant="default" className="text-xs">
                                  ✓ Complete
                                </Badge>
                              )}
                              
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress: {progress?.current_progress || 0} / {challenge.target_value}</span>
                              <span>{Math.round(progressPercentage)}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              Ends {new Date(challenge.end_date).toLocaleDateString()}
                            </p>
                            {!progress?.completed && getChallengeActionButton(challenge)}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

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
                    <Button onClick={() => navigate('/call-upload')} className="justify-start">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Call
                    </Button>
                    <Button onClick={() => navigate('/call-simulation?difficulty=3')} className="justify-start">
                      <Phone className="h-4 w-4 mr-2" />
                      Easy Call
                    </Button>
                    <Button onClick={() => navigate('/call-simulation?difficulty=7')} className="justify-start">
                      <Phone className="h-4 w-4 mr-2" />
                      Hard Call
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Button variant="outline" onClick={() => navigate('/ai-replay')} className="w-full justify-start">
                      <Zap className="h-4 w-4 mr-2" />
                      AI Replay Practice
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
                    <Crown className="h-5 w-5" />
                    Leaderboard
                  </CardTitle>
                  <CardDescription>
                    This week's top performers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => (
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
                               `${entry.profile?.first_name || 'User'} ${entry.profile?.last_name || ''}`.trim()}
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
                  
                  <div className="mt-4 p-3 bg-primary/5 rounded-lg text-center">
                    <div className="text-sm font-medium text-primary">
                      🎉 You're in the top 12%!
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Keep going to climb higher
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Challenges;