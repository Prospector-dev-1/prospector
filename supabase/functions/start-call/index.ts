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
    const { difficulty_level } = await req.json();
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Use service role to bypass RLS for credit checking
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: userData } = await supabaseService.auth.getUser(token);
    if (!userData.user) {
      throw new Error('Unauthorized');
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('credits, subscription_type')
      .eq('user_id', userData.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Check if user has credits or premium subscription
    if (profile.subscription_type !== 'premium' && profile.credits <= 0) {
      return new Response(JSON.stringify({ error: 'Insufficient credits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct credit if not premium
    if (profile.subscription_type !== 'premium') {
      await supabaseService
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('user_id', userData.user.id);

      // Log credit transaction
      await supabaseService
        .from('credit_transactions')
        .insert({
          user_id: userData.user.id,
          amount: -1,
          type: 'deduction',
          description: `AI practice call - Difficulty Level ${difficulty_level}`
        });
    }

    // Generate prospect personality based on difficulty
    const getProspectPersonality = (level: number) => {
      const personalities = {
        1: "You are Sarah, a friendly small business owner who is very interested in getting a website. You're eager to learn and ask clarifying questions. You have minimal objections and are easy to convince.",
        2: "You are Mike, a business owner who is somewhat interested but has basic concerns about cost. You ask a few questions about pricing but are generally open to the idea.",
        3: "You are Lisa, a business owner who is moderately interested but wants to understand the value. You ask about ROI and have some budget concerns.",
        4: "You are Tom, a business owner who is cautious about new investments. You have concerns about time commitment and whether you really need a website.",
        5: "You are Jennifer, a business owner who is neutral. You have standard objections about budget, timing, and whether websites actually help businesses.",
        6: "You are David, a business owner who is somewhat skeptical. You question the caller's credibility and have concerns about being scammed or wasting money.",
        7: "You are Rachel, a business owner who is quite resistant. You've had bad experiences with salespeople before and are defensive. You have strong price objections.",
        8: "You are Steve, a business owner who is very skeptical and resistant. You interrupt frequently, question everything, and have multiple strong objections about cost, time, and effectiveness.",
        9: "You are Karen, a business owner who is extremely difficult. You're rude, dismissive, and bring up every possible objection. You're convinced you don't need a website and are annoyed by the call.",
        10: "You are Frank, an extremely hostile and aggressive business owner. You HATE cold calls and immediately become furious when called. You interrupt constantly, yell, use phrases like 'I'M NOT INTERESTED!', 'STOP WASTING MY TIME!', 'GET OFF MY PHONE!', and 'DON'T CALL ME AGAIN!' You bring up aggressive objections like 'This is a SCAM!', 'You people are all the same!', 'I don't have time for this garbage!', and 'Websites are worthless!' You threaten to hang up within the first 30 seconds and will actually hang up if the caller doesn't immediately prove their worth. You are EXTREMELY rude, hostile, and nearly impossible to convince."
      };
      return personalities[level as keyof typeof personalities] || personalities[5];
    };

    // Create Vapi assistant for web call
    const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('VAPI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Cold Call Practice - Level ${difficulty_level}`,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `${getProspectPersonality(difficulty_level)} 

The caller is trying to sell you a website for your business. You should respond naturally and in character. Keep responses conversational and realistic. If they handle your objections well, you can gradually become more interested. The difficulty level is ${difficulty_level}/10.

Important: Stay in character throughout the entire call. Don't break character or mention that you're an AI.`
            }
          ]
        },
        voice: {
          provider: 'azure',
          voiceId: difficulty_level <= 5 ? 'en-US-JennyNeural' : 'en-US-DavisNeural'
        },
        firstMessage: difficulty_level <= 3 
          ? "Hello? Who is this?" 
          : difficulty_level <= 7 
            ? "Yeah, hello? What do you want?" 
            : "What? Who is this and why are you calling me?",
        endCallMessage: "Thanks for calling, goodbye.",
        endCallPhrases: ["goodbye", "hang up", "end call"],
        recordingEnabled: true,
        maxDurationSeconds: 600, // 10 minutes max
        silenceTimeoutSeconds: 30,
        responseDelaySeconds: 0.4
      }),
    });

    const vapiData = await vapiResponse.json();
    
    if (!vapiResponse.ok) {
      console.error('Vapi error response:', vapiData);
      throw new Error(`Vapi error: ${vapiData.message || JSON.stringify(vapiData)}`);
    }

    // Create call record in database
    const { data: callRecord, error: callError } = await supabaseService
      .from('calls')
      .insert({
        user_id: userData.user.id,
        difficulty_level,
        call_status: 'started'
      })
      .select()
      .single();

    if (callError) {
      console.error('Error creating call record:', callError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      assistantId: vapiData.id,
      callRecordId: callRecord?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in start-call function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});