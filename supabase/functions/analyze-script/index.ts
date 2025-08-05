import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  console.log('=== SCRIPT ANALYSIS REQUEST ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { script } = await req.json();
    console.log('Script length:', script?.length);

    if (!script || script.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Script content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token and get user info
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User ID:', user.id);

    // Get user profile to check credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has enough credits (need 0.5 credits)
    if (profile.credits < 0.5) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient credits. You need at least 0.5 credits to analyze a script.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User has sufficient credits:', profile.credits);

    // Deduct 0.5 credits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: profile.credits - 0.5 })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error deducting credits:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to deduct credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record the credit transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        type: 'script_analysis',
        amount: -0.5,
        description: 'Script analysis with AI feedback'
      });

    if (transactionError) {
      console.error('Error recording transaction:', transactionError);
      // Continue anyway, as the main operation succeeded
    }

    console.log('Credits deducted successfully');

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

    console.log('Sending analysis prompt to OpenAI...');

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
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

    console.log('OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to analyze script with AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response received successfully');

    const analysisText = openAIData.choices[0].message.content;
    console.log('Analysis text from OpenAI:', analysisText);

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
      console.log('Parsed analysis successfully');
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
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

    // Return the analysis
    return new Response(JSON.stringify({
      success: true,
      analysis: analysis,
      credits_remaining: profile.credits - 0.5
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-script function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});