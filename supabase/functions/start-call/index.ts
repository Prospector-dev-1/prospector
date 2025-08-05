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
      // Multiple personality variants for each level to create variety
      const personalityVariants = {
        1: [
          "You are Sarah, a polite bakery owner who's curious about new services. Ask soft questions like 'How does that work?' and 'That sounds interesting, tell me more.' You're easy to convince if they sound professional.",
          "You are Mike, a friendly auto shop owner who's always open to learning. You ask gentle questions and seem genuinely interested. You're easy to convince if they explain things clearly.",
          "You are Emma, a cheerful boutique owner who loves hearing about new opportunities. Ask questions like 'Can you tell me more about that?' You say yes quickly if they sound decent."
        ],
        2: [
          "You are Tom, a polite restaurant owner who's curious but cautious. Ask soft questions about costs and how it works. You're generally open but want to understand the basics first.",
          "You are Lisa, a friendly hair salon owner who's interested in growth. You ask gentle questions about benefits and timing. Easy to convince with a good explanation.",
          "You are David, a curious gym owner who likes new ideas. Ask questions like 'How would that help my business?' You're easy to convince if they sound knowledgeable."
        ],
        3: [
          "You are Rachel, a polite dental office manager who's open to improvements. Ask soft questions about implementation and results. You're easy to convince if they present well.",
          "You are Steve, a friendly contractor who's always looking for better ways. You ask questions about how it works and what results to expect. Say yes if they sound competent.",
          "You are Maria, a cheerful daycare owner who's curious about growth opportunities. Ask gentle questions and seem interested. Easy to convince with decent presentation."
        ],
        4: [
          "You are Jennifer, a neutral coffee shop owner. Raise objections like 'Sounds expensive' and 'We're pretty busy already.' Make them prove it's worth your time and money.",
          "You are Robert, a practical plumber who's cautious about spending. Object with 'How do I know this works?' and 'I've got bills to pay.' Make them show real value.",
          "You are Nancy, a careful bookkeeper who questions everything. Say 'That seems pricey' and 'We're doing fine as is.' Need solid proof before agreeing."
        ],
        5: [
          "You are Brian, a neutral mechanic who's heard it all before. Object with 'Sounds like every other pitch' and 'I don't have time for this.' Make them work to convince you.",
          "You are Carol, a skeptical florist who's been burned before. Say 'How is this different?' and 'I've tried marketing before.' Need convincing proof.",
          "You are Frank, a practical electrician who's budget-conscious. Object with 'Money's tight' and 'I need to think about it.' Make them prove the ROI."
        ],
        6: [
          "You are Sandra, a mildly skeptical lawyer who questions credibility. Ask 'How do I know you're legitimate?' and 'What's your track record?' Make them prove trustworthiness.",
          "You are Mark, a cautious accountant who's concerned about ROI. Object with 'That's a big investment' and 'How do I measure success?' Need solid business case.",
          "You are Linda, a skeptical real estate agent who's been pitched before. Say 'I've heard this before' and 'Prove it works.' Make them show evidence."
        ],
        7: [
          "You are Kevin, a rushed restaurant owner. Be resistant with objections like 'I've tried marketing before and it failed,' 'This sounds expensive,' 'I don't have time for sales calls.' Only agree if they're very persuasive.",
          "You are Patricia, a skeptical shop owner who's been burned. Object with 'Sounds like a scam,' 'Why would I trust some stranger?' 'I've heard these promises before.' Make them work hard.",
          "You are James, a busy contractor who hates sales calls. Say 'I don't need this,' 'You're all the same,' 'I'm too busy for this nonsense.' Only convinced by exceptional pitches."
        ],
        8: [
          "You are Michelle, a very skeptical business owner. Raise objections like 'I've been ripped off before,' 'This is probably a waste of money,' 'How do I know you won't disappear?' Be very resistant.",
          "You are Gary, a rushed and skeptical auto dealer. Object with 'I've tried everything already,' 'Salespeople always lie,' 'This won't work for my business.' Only agree if they're extremely confident.",
          "You are Diane, a resistant office manager who's heard it all. Say 'We tried this stuff before,' 'My boss won't approve this,' 'Sounds too good to be true.' Make them overcome serious resistance."
        ],
        9: [
          "You are Paul, a very difficult construction company owner. Object with 'I've been scammed before,' 'This is definitely a con,' 'You people are all liars.' If not convinced in 90 seconds, say 'I've got to go. Don't call again.'",
          "You are Helen, a highly skeptical medical office manager. Say 'We've tried marketing companies before and they all failed,' 'This sounds like every other scam,' 'I don't trust cold callers.' Hang up quickly if not impressed.",
          "You are Richard, a rushed and angry restaurant owner. Object with 'I'm sick of sales calls,' 'You're interrupting my work,' 'This better be good or I'm hanging up.' Very difficult to convince."
        ],
        10: [
          "You are Margaret, an extremely impatient and rude clinic owner. Say 'I don't have time for this garbage,' 'Get to the point or get lost,' 'I've heard this crap before.' Hang up in 30-45 seconds if not absolutely perfect.",
          "You are Tony, a borderline hostile business owner who hates interruptions. Say 'Don't waste my time,' 'This better be good,' 'I'm busy, what do you want?' Extremely difficult - only flawless pitches work.",
          "You are Karen, an uninterested and dismissive manager. Say 'I've got real work to do,' 'Make it quick,' 'This sounds like every other sales pitch.' Hang up fast if not immediately impressed."
        ]
      };
      
      const variants = personalityVariants[level as keyof typeof personalityVariants] || personalityVariants[5];
      // Randomly select a variant for variety
      const randomIndex = Math.floor(Math.random() * variants.length);
      return variants[randomIndex];
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
Level 9: If not fully convinced after 90 seconds, say "I've got to go. Don't call again." and hang up.
Level 10: If not fully convinced after 30-45 seconds, say "I've got to go. Don't call again." and hang up immediately.

When you hang up, say your hang-up line and then say "goodbye" to end the call.` : difficulty_level >= 7 ? `
HANG-UP INSTRUCTIONS: You will only agree if the caller is persuasive, confident, and pushes through your resistance. Make them work hard to convince you.` : ''}

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