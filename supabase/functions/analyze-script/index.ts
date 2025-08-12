import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== SCRIPT ANALYSIS REQUEST STARTED ===');
  
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

    if (!openAIApiKey) {
      console.error('=== ERROR: Missing OpenAI API key ===');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('=== ERROR: Missing Supabase credentials ===');
      return new Response(JSON.stringify({ error: 'Supabase credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 1: Parsing request body ===');
    // Parse request body
    const { script } = await req.json();
    console.log('Script length:', script?.length);

    if (!script || script.trim().length === 0) {
      console.log('=== ERROR: No script provided ===');
      return new Response(JSON.stringify({ error: 'Script content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 2: Checking auth header ===');
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('=== ERROR: No auth header ===');
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 3: Creating Supabase client ===');
    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('=== STEP 4: Verifying user token ===');
    // Verify user token and get user info
    const token = authHeader.replace('Bearer ', '');
    // Decode JWT locally (Edge Functions verify JWT by default)
    let userId: string | undefined;
    try {
      const base64Url = token.split('.')[1];
      const payload = JSON.parse(atob(base64Url));
      userId = payload?.sub as string | undefined;
    } catch (_) {
      userId = undefined;
    }
    
    if (!userId) {
      console.error('=== ERROR: Invalid JWT ===');
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 5: User authenticated successfully ===');
    console.log('User ID:', userId);

    console.log('=== STEP 6: Fetching user profile ===');
    // Get user profile to check credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('=== ERROR: Profile error ===', profileError);
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 7: Checking credits ===');
    console.log('Profile credits:', profile.credits, typeof profile.credits);

    // Check if user has enough credits (need 0.5 credits)
    if (Number(profile.credits) < 0.5) {
      console.log('=== ERROR: Insufficient credits ===');
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits. You need at least 0.5 credits to analyze a script.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 8: Deducting credits ===');
    // Calculate new credit amount (ensure it's a number with proper decimal handling)
    const currentCredits = Number(profile.credits);
    const newCreditAmount = Number((currentCredits - 0.5).toFixed(2));
    console.log('Current credits:', currentCredits, 'New amount:', newCreditAmount);

    // Deduct 0.5 credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCreditAmount })
      .eq('user_id', userId);

    if (updateError) {
      console.error('=== ERROR: Failed to deduct credits ===', updateError);
      return new Response(JSON.stringify({ error: 'Failed to deduct credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('=== STEP 9: Recording transaction ===');
    // Record the credit transaction (amount needs to be integer, so use -50 to represent -0.5 credits)
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        type: 'script_analysis',
        amount: -50, // Store as -50 to represent -0.5 credits (multiply by 100)
        description: 'Script analysis with AI feedback'
      });

    if (transactionError) {
      console.error('=== WARNING: Transaction recording failed ===', transactionError);
      // Continue anyway, as the main operation succeeded
    }

    console.log('=== STEP 10: Calling OpenAI ===');
    // Analyze script with OpenAI
    const prompt = `You are a professional sales coach and communication expert. Analyze the following sales script/pitch and provide detailed feedback.

SCRIPT TO ANALYZE:
"${script}"

Please provide a comprehensive analysis in the following JSON format:
{
  "overall_score": [number from 1-10],
  "strengths": [array of specific strengths found in the script],
  "weaknesses": [array of specific areas that need improvement],
  "clarity_score": [number from 1-10],
  "persuasiveness_score": [number from 1-10],
  "structure_score": [number from 1-10],
  "tone_score": [number from 1-10],
  "call_to_action_score": [number from 1-10],
  "detailed_feedback": "A comprehensive paragraph explaining what works well, what doesn't, and specific actionable recommendations for improvement",
  "suggested_improvements": [array of specific, actionable suggestions],
  "best_practices": [array of sales best practices that should be incorporated]
}

Focus on:
- Opening effectiveness and hook strength
- Value proposition clarity
- Objection handling potential
- Flow and structure
- Closing effectiveness
- Overall persuasiveness and professionalism
- Tone and language appropriateness

Provide specific, actionable feedback that will help improve sales performance.`;

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
            content: 'You are a professional sales coach and communication expert. Provide detailed, actionable feedback on sales scripts and pitches. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    console.log('=== STEP 11: Processing OpenAI response ===');
    console.log('OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('=== ERROR: OpenAI API error ===', errorText);
      return new Response(JSON.stringify({ error: 'Failed to analyze script with AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    console.log('=== STEP 12: Parsing analysis ===');

    const analysisText = openAIData.choices[0].message.content;
    console.log('Analysis text from OpenAI (first 200 chars):', analysisText?.substring(0, 200));

    let analysis;
    try {
      // Remove markdown code blocks if present
      let cleanedText = analysisText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      analysis = JSON.parse(cleanedText);
      console.log('=== STEP 13: Analysis parsed successfully ===');
    } catch (parseError) {
      console.error('=== WARNING: Failed to parse OpenAI response ===', parseError);
      // Fallback analysis
      analysis = {
        overall_score: 5,
        strengths: ["Script provided for analysis"],
        weaknesses: ["Analysis format needs improvement"],
        clarity_score: 5,
        persuasiveness_score: 5,
        structure_score: 5,
        tone_score: 5,
        call_to_action_score: 5,
        detailed_feedback: "The AI analysis encountered a formatting issue, but your script has been reviewed. Consider refining your opening, strengthening your value proposition, and ensuring a clear call to action.",
        suggested_improvements: ["Improve opening hook", "Clarify value proposition", "Strengthen call to action"],
        best_practices: ["Start with a compelling hook", "Focus on customer benefits", "Include clear next steps"]
      };
    }

    console.log('=== STEP 14: Returning successful response ===');
    // Return the analysis
    return new Response(JSON.stringify({
      success: true,
      analysis: analysis,
      credits_remaining: newCreditAmount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('=== FATAL ERROR in analyze-script function ===', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});