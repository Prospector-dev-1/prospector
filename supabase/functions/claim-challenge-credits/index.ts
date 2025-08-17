import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { challengeId } = await req.json()

    if (!challengeId) {
      return new Response(
        JSON.stringify({ error: 'Challenge ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the challenge progress record
    const { data: progress, error: progressError } = await supabase
      .from('user_challenge_progress')
      .select('*, challenges(reward_credits)')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .eq('completed', true)
      .eq('credits_claimed', false)
      .single()

    if (progressError || !progress) {
      return new Response(
        JSON.stringify({ error: 'Challenge not found or already claimed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rewardCredits = progress.challenges?.reward_credits || 0

    // Start a transaction-like operation
    // 1. Update the challenge progress to mark credits as claimed
    const { error: updateError } = await supabase
      .from('user_challenge_progress')
      .update({
        credits_claimed: true,
        claimed_at: new Date().toISOString()
      })
      .eq('id', progress.id)

    if (updateError) {
      console.error('Error updating challenge progress:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to claim credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Add credits to user's profile
    const { error: creditsError } = await supabase
      .from('profiles')
      .update({
        credits: supabase.sql`credits + ${rewardCredits}`
      })
      .eq('user_id', user.id)

    if (creditsError) {
      console.error('Error updating user credits:', creditsError)
      // Rollback the challenge progress update
      await supabase
        .from('user_challenge_progress')
        .update({
          credits_claimed: false,
          claimed_at: null
        })
        .eq('id', progress.id)

      return new Response(
        JSON.stringify({ error: 'Failed to add credits to account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Log the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        type: 'earned',
        amount: rewardCredits,
        description: `Challenge reward claimed`
      })

    if (transactionError) {
      console.error('Error logging transaction:', transactionError)
      // Don't fail the operation for logging errors
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        creditsAwarded: rewardCredits,
        message: `Successfully claimed ${rewardCredits} credits!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in claim-challenge-credits function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})