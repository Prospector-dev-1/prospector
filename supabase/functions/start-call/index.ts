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
    console.log('Start-call function called');
    
    // Check if required environment variables exist
    const vapiApiKey = Deno.env.get('VAPI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      vapiApiKey: vapiApiKey ? 'exists' : 'missing',
      supabaseUrl: supabaseUrl ? 'exists' : 'missing',
      supabaseServiceKey: supabaseServiceKey ? 'exists' : 'missing'
    });

    if (!vapiApiKey) {
      throw new Error('VAPI_API_KEY not configured');
    }

    const { difficulty_level } = await req.json();
    console.log('Difficulty level:', difficulty_level);
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Use service role to bypass RLS for credit checking
    const supabaseService = createClient(
      supabaseUrl ?? '',
      supabaseServiceKey ?? '',
      { auth: { persistSession: false } }
    );

    console.log('Getting user data...');
    const { data: userData } = await supabaseService.auth.getUser(token);
    if (!userData.user) {
      console.error('User not found');
      throw new Error('Unauthorized');
    }
    console.log('User authenticated:', userData.user.id);

    // Check user credits
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('credits, subscription_type')
      .eq('user_id', userData.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('Profile not found');
    }

    console.log('User profile:', profile);

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

    // Get voice based on difficulty - progressively more aggressive
    const getVoiceForDifficulty = (level: number) => {
      const voices = {
        1: 'en-US-JennyNeural',      // Very friendly female
        2: 'en-US-AriaNeural',       // Friendly female  
        3: 'en-US-SaraNeural',       // Pleasant female
        4: 'en-US-DavisNeural',      // Professional male
        5: 'en-US-BrianNeural',      // Neutral male
        6: 'en-US-ChristopherNeural', // Slightly stern male
        7: 'en-US-EricNeural',       // More serious male
        8: 'en-US-GuyNeural',        // Stern/aggressive male
        9: 'en-US-TonyNeural',       // Very aggressive male
        10: 'en-US-RyanNeural'       // Most aggressive/hostile male
      };
      return voices[level as keyof typeof voices] || voices[5];
    };

    // Generate prospect personality based on difficulty
    const getProspectPersonality = (level: number) => {
      const personalities = {
        1: "You are Sarah, a friendly small business owner who is very interested in what the caller is offering. You're eager to learn and ask clarifying questions. You have minimal objections and are easy to convince.",
        2: "You are Mike, a business owner who is somewhat interested but has basic concerns about cost. You ask a few questions about pricing but are generally open to the idea.",
        3: "You are Lisa, a business owner who is moderately interested but wants to understand the value. You ask about ROI and have some budget concerns.",
        4: "You are Tom, a business owner who is cautious about new investments. You have concerns about time commitment and whether you really need what they're selling.",
        5: "You are Jennifer, a business owner who is neutral. You have standard objections about budget, timing, and whether this product/service actually helps businesses.",
        6: "You are David, a business owner who is somewhat skeptical. You question the caller's credibility and have concerns about being scammed or wasting money.",
        7: "You are Rachel, a business owner who is quite resistant. You've had bad experiences with salespeople before and are defensive. You have strong price objections. If the caller uses pushy sales tactics, sounds unprofessional, or can't answer your questions properly, you will hang up after giving them one warning.",
        8: "You are Steve, a business owner who is very skeptical and resistant. You interrupt frequently, question everything, and have multiple strong objections about cost, time, and effectiveness. If the caller sounds like a scammer, uses high-pressure tactics, or wastes your time with a poor pitch, you will hang up. You have no patience for bad salespeople.",
        9: "You are Karen, a business owner who is extremely difficult. You're rude, dismissive, and bring up every possible objection. You're convinced you don't need what they're selling and are annoyed by the call. If the caller stutters, sounds nervous, uses bad grammar, or can't immediately prove their value, you will hang up within the first minute. You hang up by saying something like 'This is a waste of my time, don't call me again!' and then end the call.",
        10: "You are Frank, an extremely hostile and aggressive business owner. You HATE cold calls and immediately become furious when called. You interrupt constantly, yell, use phrases like 'I'M NOT INTERESTED!', 'STOP WASTING MY TIME!', 'GET OFF MY PHONE!', and 'DON'T CALL ME AGAIN!' If the caller doesn't immediately hook you with a PERFECT opening (within 15-20 seconds), if they sound scripted, nervous, or unprofessional, or if they can't handle your aggressive objections expertly, you will hang up immediately. You hang up by shouting something like 'I'M DONE WITH THIS GARBAGE!' or 'NEVER CALL ME AGAIN!' and then end the call. You are EXTREMELY rude, hostile, and nearly impossible to convince."
      };
      return personalities[level as keyof typeof personalities] || personalities[5];
    };

    // Create Vapi assistant for web call
    console.log('Creating Vapi assistant...');
    
    const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
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

You are receiving a cold call from a salesperson, but you don't know what they're selling yet. They will reveal what they're offering during the conversation. Respond naturally and in character based on how they present themselves and what they're selling. Keep responses conversational and realistic. If they handle your objections well, you can gradually become more interested. The difficulty level is ${difficulty_level}/10.

${difficulty_level >= 7 ? `
IMPORTANT HANG-UP INSTRUCTIONS: When you decide to hang up (based on your personality), say your final hang-up line and then immediately say "goodbye" to end the call. Examples:
- "This is a waste of my time, don't call me again! Goodbye."
- "I'm done with this garbage! Goodbye."
- "Never call me again! Goodbye."

You WILL hang up if the caller:
- Sounds nervous, unprofessional, or scripted
- Uses pushy or high-pressure tactics
- Can't answer your questions properly
- Wastes your time with a poor pitch
- Takes too long to get to the point (Level 9-10: within 60 seconds, Level 7-8: within 2 minutes)` : ''}

Important: Stay in character throughout the entire call. You don't know what they're selling until they tell you. React naturally to whatever they're offering. Don't break character or mention that you're an AI.`
            }
          ]
        },
        voice: {
          provider: 'azure',
          voiceId: getVoiceForDifficulty(difficulty_level)
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

    console.log('Vapi response status:', vapiResponse.status);
    const vapiData = await vapiResponse.json();
    console.log('Vapi response data:', vapiData);
    
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

    console.log('Call record created:', callRecord?.id);

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