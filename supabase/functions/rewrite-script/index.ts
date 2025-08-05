import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== SCRIPT REWRITE REQUEST STARTED ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('=== CORS OPTIONS REQUEST ===');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables first
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('=== ENV CHECK ===');
    console.log('OpenAI key exists:', !!openAIApiKey);
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Supabase service key exists:', !!supabaseServiceKey);

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('=== ERROR: Missing required environment variables ===');
      return new Response(JSON.stringify({ error: 'Required environment variables not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 1: Parsing request body ===');
    const { originalScript, analysis } = await req.json();
    console.log('Original script length:', originalScript?.length);
    console.log('Analysis provided:', !!analysis);

    if (!originalScript || originalScript.trim().length === 0) {
      console.log('=== ERROR: No original script provided ===');
      return new Response(JSON.stringify({ error: 'Original script is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!analysis) {
      console.log('=== ERROR: No analysis provided ===');
      return new Response(JSON.stringify({ error: 'Analysis data is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 2: Checking auth header ===');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('=== ERROR: No auth header ===');
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 3: Creating Supabase client ===');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== STEP 4: Verifying user token ===');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('=== ERROR: Auth error ===', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 5: Fetching user profile ===');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('=== ERROR: Profile error ===', profileError);
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 6: Checking credits ===');
    if (Number(profile.credits) < 0.5) {
      console.log('=== ERROR: Insufficient credits ===');
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits. You need at least 0.5 credits to rewrite a script.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 7: Deducting credits ===');
    const currentCredits = Number(profile.credits);
    const newCreditAmount = Number((currentCredits - 0.5).toFixed(2));
    console.log('Current credits:', currentCredits, 'New amount:', newCreditAmount);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCreditAmount })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('=== ERROR: Failed to deduct credits ===', updateError);
      return new Response(JSON.stringify({ error: 'Failed to deduct credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 8: Recording transaction ===');
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        type: 'script_rewrite',
        amount: -0.5,
        description: 'Script rewrite with AI improvements'
      });

    if (transactionError) {
      console.error('=== WARNING: Transaction recording failed ===', transactionError);
    }

    console.log('=== STEP 9: Calling OpenAI for rewrite ===');
    
    // Create detailed prompt for script rewriting
    const prompt = `You are a professional sales coach and copywriter. I need you to rewrite a sales script based on detailed analysis feedback.

ORIGINAL SCRIPT:
"${originalScript}"

ANALYSIS FEEDBACK:
- Overall Score: ${analysis.overall_score}/10
- Weaknesses: ${analysis.weaknesses.join(', ')}
- Suggested Improvements: ${analysis.suggested_improvements.join(', ')}
- Best Practices to Implement: ${analysis.best_practices.join(', ')}
- Detailed Feedback: ${analysis.detailed_feedback}

REWRITE INSTRUCTIONS:
1. Address ALL the weaknesses identified in the analysis
2. Implement ALL the suggested improvements
3. Follow ALL the best practices mentioned
4. Maintain the core message and intent of the original script
5. Make it more persuasive, clear, and professional
6. Ensure it has a strong opening, clear value proposition, and compelling call to action
7. Use appropriate tone and language for sales conversations

Please provide ONLY the rewritten script without any additional commentary or explanation. The output should be a polished, professional sales script that addresses all the identified issues.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional sales coach and copywriter. Rewrite sales scripts to be more effective while maintaining the original intent. Respond with only the rewritten script, no additional commentary.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    console.log('=== STEP 10: Processing OpenAI response ===');
    console.log('OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('=== ERROR: OpenAI API error ===', errorText);
      return new Response(JSON.stringify({ error: 'Failed to rewrite script with AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    const rewrittenScript = openAIData.choices[0].message.content.trim();

    console.log('=== STEP 11: Returning rewritten script ===');
    console.log('Rewritten script length:', rewrittenScript.length);

    return new Response(JSON.stringify({
      success: true,
      rewritten_script: rewrittenScript,
      credits_remaining: newCreditAmount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== FATAL ERROR in rewrite-script function ===', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});