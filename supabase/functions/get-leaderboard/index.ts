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
    console.log('Get-leaderboard function called with avatar support + opt-in + current user rank');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing required environment variables');
    }

    // Service role client for wide reads
    const supabaseService = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );

    // Auth-aware client to read caller's user id from Authorization header
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr) console.warn('Unable to read current user from JWT:', userErr);
    const currentUserId = userData?.user?.id || null;

    const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Only include users who opted in to the leaderboard
    const { data: optInUsers, error: usersError } = await supabaseService
      .from('profiles')
      .select('user_id, first_name, last_name, avatar_url, show_on_leaderboard')
      .eq('show_on_leaderboard', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`Processing ${optInUsers?.length || 0} opted-in users for leaderboard`);

    const computeUserScore = async (userId: string) => {
      let totalScore = 0;

      // Challenge completion points (reward_credits from completed challenges in window)
      const { data: completedChallenges } = await supabaseService
        .from('user_challenge_progress')
        .select('challenge_id, challenges(reward_credits)')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', windowStart);

      const challengePoints = (completedChallenges || []).reduce((sum, cp: any) =>
        sum + (cp?.challenges?.reward_credits || 0), 0);

      // Performance points from calls (this week)
      const { data: callsData } = await supabaseService
        .from('calls')
        .select('overall_score, successful_sale, difficulty_level')
        .eq('user_id', userId)
        .eq('call_status', 'completed')
        .gte('created_at', windowStart);

      let performancePoints = 0;
      if (callsData && callsData.length > 0) {
        const avgScore = callsData.reduce((sum: number, call: any) => sum + (call.overall_score || 0), 0) / callsData.length;
        performancePoints += Math.round(avgScore * 10);

        const successfulSales = callsData.filter((call: any) => call.successful_sale).length;
        performancePoints += successfulSales * 50;

        performancePoints += callsData.length * 5; // Call completion bonus

        const difficultyBonus = callsData.reduce((sum: number, call: any) => sum + (call.difficulty_level || 0) * 5, 0);
        performancePoints += difficultyBonus;
      }

      // Upload activity points (this week)
      const { count: uploadsCount } = await supabaseService
        .from('call_uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', windowStart);

      const uploadPoints = (uploadsCount || 0) * 25; // 25 points per upload

      // AI Replay activity points (this week)
      const { count: replaysCount } = await supabaseService
        .from('ai_replays')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', windowStart);

      const replayPoints = (replaysCount || 0) * 15; // 15 points per replay

      totalScore = challengePoints + performancePoints + uploadPoints + replayPoints;
      return totalScore;
    };

    // Compute scores for opted-in users
    const leaderboardScores = await Promise.all((optInUsers || []).map(async (userProfile: any) => {
      const totalScore = await computeUserScore(userProfile.user_id);
      return {
        user_id: userProfile.user_id,
        total_score: totalScore,
        rank: 0, // Will be calculated after sorting
        profile: {
          first_name: userProfile.first_name || 'Anonymous',
          last_initial: userProfile.last_name ? userProfile.last_name.charAt(0) : '',
          avatar_url: userProfile.avatar_url
        }
      };
    }));

    // Sort by score and assign ranks among opted-in users
    const ranked = leaderboardScores
      .sort((a, b) => b.total_score - a.total_score)
      .map((user, index) => ({ ...user, rank: index + 1 }));

    const top = ranked.slice(0, 15);

    // Build current user entry (even if not opted-in or not in top)
    let currentUser: any = null;
    if (currentUserId) {
      const inRanked = ranked.find(u => u.user_id === currentUserId);
      if (inRanked) {
        currentUser = inRanked;
      } else {
        // Compute current user's score and relative rank vs opted-in users
        const currentScore = await computeUserScore(currentUserId);

        // Fetch current user's profile for name/avatar
        const { data: currentProfile } = await supabaseService
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('user_id', currentUserId)
          .maybeSingle();

        const higherCount = ranked.filter(u => u.total_score > currentScore).length;
        const relativeRank = higherCount + 1;

        currentUser = {
          user_id: currentUserId,
          total_score: currentScore,
          rank: relativeRank,
          profile: {
            first_name: currentProfile?.first_name || 'You',
            last_initial: currentProfile?.last_name ? currentProfile.last_name.charAt(0) : '',
            avatar_url: currentProfile?.avatar_url || null,
          }
        };
      }
    }

    console.log(`Returning ${top.length} users in leaderboard (opt-in), currentUser present: ${!!currentUser}`);

    return new Response(JSON.stringify({ top, currentUser }), {
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