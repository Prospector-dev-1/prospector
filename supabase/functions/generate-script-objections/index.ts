import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ObjectionRequest {
  businessType: string;
  productService: string;
  targetAudience: string;
  callObjective: string;
  keyBenefits: string;
  tonePreference: string;
  commonObjections: string;
  companyName: string;
  type: 'initial' | 'additional';
}

async function callOpenAI(prompt: string, model: string = 'gpt-4.1-2025-04-14'): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert sales coach who specializes in objection handling. Provide realistic objections customers might have and effective responses to overcome them.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(prompt: string): Promise<string> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anthropicApiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Claude API error:', errorData);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function generateWithFallback(prompt: string): Promise<{ result: string; provider: string }> {
  try {
    const result = await callOpenAI(prompt);
    return { result, provider: 'openai' };
  } catch (openaiError) {
    console.log('OpenAI failed, trying Claude...', openaiError);
    try {
      const result = await callClaude(prompt);
      return { result, provider: 'claude' };
    } catch (claudeError) {
      console.error('Both providers failed:', { openaiError, claudeError });
      throw new Error('Both AI providers are currently unavailable');
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '');
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    // Parse request
    const requestData: ObjectionRequest = await req.json();
    const { type, businessType, productService, targetAudience, callObjective, keyBenefits, tonePreference, commonObjections, companyName } = requestData;

    // Check and deduct credits for additional objections
    if (type === 'additional') {
      const { data: profile, error: profileError } = await supabaseService
        .from('profiles')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      if (profile.credits < 0.5) {
        return new Response(
          JSON.stringify({ error: 'Insufficient credits. You need 0.5 credits to generate additional objections.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct credits
      const { error: updateError } = await supabaseService
        .from('profiles')
        .update({ credits: profile.credits - 0.5 })
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error('Failed to deduct credits');
      }

      // Record transaction
      await supabaseService.from('credit_transactions').insert({
        user_id: user.id,
        type: 'deduction',
        amount: 0.5,
        description: 'Additional objections generation'
      });
    }

    // Generate objections
    const numberOfObjections = type === 'initial' ? 3 : 10;
    const prompt = `Based on the following business context, generate ${numberOfObjections} realistic customer objections and effective responses:

Business Type: ${businessType}
Product/Service: ${productService}
Target Audience: ${targetAudience}
Call Objective: ${callObjective}
Key Benefits: ${keyBenefits}
Tone Preference: ${tonePreference}
Company: ${companyName}
${commonObjections ? `Common Objections Already Known: ${commonObjections}` : ''}

Please generate ${numberOfObjections} realistic objections that prospects in this industry/audience might raise, along with effective responses. Format as JSON:

{
  "objections": [
    {
      "objection": "The specific objection the customer might say",
      "response": "The recommended response to overcome this objection"
    }
  ]
}

Make the objections specific to the business context and the responses persuasive but natural. Avoid generic objections and focus on what would be realistic for this specific scenario.`;

    const { result, provider } = await generateWithFallback(prompt);
    
    // Parse the response
    let objections;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        objections = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse objections JSON:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Get updated credits
    const { data: updatedProfile } = await supabaseService
      .from('profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    return new Response(JSON.stringify({
      objections: objections.objections,
      provider,
      creditsUsed: type === 'additional' ? 0.5 : 0,
      remainingCredits: updatedProfile?.credits || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-script-objections:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});