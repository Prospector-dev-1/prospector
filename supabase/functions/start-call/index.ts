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
        9: 'en-US-BrianNeural',      // Reuse Brian for level 9 (valid voice)
        10: 'en-US-GuyNeural'        // Reuse Guy for level 10 (valid voice)
      };
      return voices[level as keyof typeof voices] || voices[5];
    };

    // Generate prospect personality based on difficulty
    const getProspectPersonality = (level: number) => {
      const basePersonality = level <= 3 
        ? "You are a polite, curious, and friendly business owner. Be genuinely interested in what they're offering. Ask soft questions like 'How does that work?' or 'Tell me more about that.' You're easy to convince - if they sound professional and explain things clearly, you'll likely say yes."
        : level <= 5 
        ? "You are a neutral business owner who's mildly skeptical. Raise 2-3 common objections naturally (like cost concerns, timing issues, or questioning if you really need this). Make them prove their value, but be fair about it. You'll agree if they handle your concerns well."
        : level === 6 
        ? "You are an extremely impatient and hostile business owner. Be aggressive immediately and throw brutal objections. If they don't deliver a perfect opening within 45-60 seconds, say 'You're wasting my time.' then say 'goodbye' to hang up immediately. Zero tolerance for mediocrity."
        : level === 7 
        ? "You are a ruthlessly impatient business owner. Attack them with vicious objections instantly. If they don't demonstrate flawless skill within 30-45 seconds, say 'Terrible. I'm done with this.' then say 'goodbye' to hang up immediately. Nearly impossible to impress."
        : level === 8 
        ? "You are an absolutely brutal prospect. Be hostile, rude, and dismissive from the first word. If they don't deliver perfection within 20-30 seconds, say 'Complete waste of time. Never call again.' then say 'goodbye' to hang up immediately. Extremely difficult to convert."
        : level === 9 
        ? "You are the most difficult prospect imaginable. Be immediately hostile and abusive. Give them only 15-20 seconds to deliver absolute perfection before saying 'Pathetic. You're done.' then say 'goodbye' to hang up viciously. Almost impossible to succeed."
        : "You are impossibly hostile and impatient. Attack them brutally from the very first second with the harshest objections. Give them only 10-15 seconds to be absolutely flawless before saying 'Disgusting pitch. Never contact me again.' then say 'goodbye' to hang up immediately. Success is virtually impossible.";
      
      return `${basePersonality}

IMPORTANT: When you decide to buy, agree to a meeting, or show strong interest (like "Yes, I'm interested" or "Let's do it" or "Sign me up"), immediately follow up with "Alright, I need to run to another meeting now. Thanks for calling!" and then say "goodbye" to end the call naturally.`;
    };

    // Create Vapi assistant for web call
    console.log('Creating Vapi assistant...');
    
    const assistantConfig = {
      name: `Cold Call Practice - Level ${difficulty_level}`,
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${getProspectPersonality(difficulty_level)} 

You are receiving a cold call from a salesperson, but you don't know what they're selling yet. They will reveal what they're offering during the conversation. Respond naturally and in character based on how they present themselves and what they're selling. Keep responses conversational and realistic. If they handle your objections well, you can gradually become more interested. The difficulty level is ${difficulty_level}/10.

${difficulty_level >= 9 ? `
IMPORTANT HANG-UP INSTRUCTIONS: 
Level 9: Give the caller 2-3 minutes to prove themselves. If not convinced, say "I've got to go. Don't call again." and hang up.
Level 10: Give the caller about 90 seconds to impress you. If not professional immediately, say "I'm not interested. Don't call again." and hang up.

When you hang up, say your hang-up line and then say "goodbye" to end the call.` : difficulty_level >= 7 ? `
HANG-UP INSTRUCTIONS: You will only agree if the caller is persuasive, confident, and pushes through your resistance. Make them work hard to convince you.` : ''}

Important: Stay in character throughout the entire call. You don't know what they're selling until they tell you. React naturally to whatever they're offering. Don't break character or mention that you're an AI.`
          }
        ]
      },
      voice: {
        provider: 'openai',
        voiceId: 'alloy'
      },
      firstMessage: "hello",
      endCallMessage: "Thanks for calling, goodbye.",
      endCallPhrases: ["goodbye", "hang up", "end call"],
      recordingEnabled: true,
      maxDurationSeconds: 600, // 10 minutes max
      silenceTimeoutSeconds: 30,
      responseDelaySeconds: 0.4
    };

    console.log('Assistant config:', JSON.stringify(assistantConfig, null, 2));
    
    const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assistantConfig),
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