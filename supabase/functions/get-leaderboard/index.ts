import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Get-leaderboard function called');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Use service role to read all profiles for leaderboard calculation
    const supabaseService = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );

    // Get all users with only non-sensitive data needed for leaderboard
    const { data: allUsers, error: usersError } = await supabaseService
      .from('profiles')
      .select('user_id, first_name, last_name');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Processing ${allUsers?.length || 0} users for leaderboard`);

    const leaderboardScores = await Promise.all((allUsers || []).map(async (userProfile) => {
      let totalScore = 0;

      // Challenge completion points (reward_credits from completed challenges)
      const { data: completedChallenges } = await supabaseService
        .from('user_challenge_progress')
        .select('challenge_id, challenges(reward_credits)')
        .eq('user_id', userProfile.user_id)
        .eq('completed', true)
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const challengePoints = completedChallenges?.reduce((sum, cp) => 
        sum + (cp.challenges?.reward_credits || 0), 0) || 0;

      // Performance points from calls (this week)
      const { data: callsData } = await supabaseService
        .from('calls')
        .select('overall_score, successful_sale, difficulty_level')
        .eq('user_id', userProfile.user_id)
        .eq('call_status', 'completed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      let performancePoints = 0;
      if (callsData && callsData.length > 0) {
        // Average score multiplied by 10
        const avgScore = callsData.reduce((sum, call) => sum + (call.overall_score || 0), 0) / callsData.length;
        performancePoints += Math.round(avgScore * 10);

        // Successful sales bonus (50 points each)
        const successfulSales = callsData.filter(call => call.successful_sale).length;
        performancePoints += successfulSales * 50;

        // Call completion bonus (5 points per call)
        performancePoints += callsData.length * 5;

        // Difficulty bonus (higher difficulty = more points)
        const difficultyBonus = callsData.reduce((sum, call) => 
          sum + (call.difficulty_level || 0) * 5, 0);
        performancePoints += difficultyBonus;
      }

      // Upload activity points (this week)
      const { count: uploadsCount } = await supabaseService
        .from('call_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.user_id)
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const uploadPoints = (uploadsCount || 0) * 25; // 25 points per upload

      // AI Replay activity points (this week)
      const { count: replaysCount } = await supabaseService
        .from('ai_replays')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.user_id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const replayPoints = (replaysCount || 0) * 15; // 15 points per replay

      totalScore = challengePoints + performancePoints + uploadPoints + replayPoints;

      return {
        user_id: userProfile.user_id,
        score: totalScore,
        rank: 0, // Will be calculated after sorting
        profile: {
          // Only expose first name and last initial for privacy
          first_name: userProfile.first_name,
          last_initial: userProfile.last_name ? userProfile.last_name.charAt(0) : ''
        }
      };
    }));

    // Sort by score and assign ranks
    const allUsersWithScores = leaderboardScores
      .sort((a, b) => b.score - a.score)
      .map((user, index) => ({ ...user, rank: index + 1 }));

    // Return top 15 users
    const topUsers = allUsersWithScores.slice(0, 15);

    console.log(`Returning ${topUsers.length} users in leaderboard`);

    return new Response(JSON.stringify(topUsers), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in get-leaderboard function:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});