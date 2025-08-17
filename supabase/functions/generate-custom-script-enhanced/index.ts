import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting storage
const rateLimits = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(userId: string, limit: number = 3, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId) || { count: 0, lastReset: now };
  
  if (now - userLimit.lastReset > windowMs) {
    userLimit.count = 0;
    userLimit.lastReset = now;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  rateLimits.set(userId, userLimit);
  return true;
}

async function callOpenAI(prompt: string, model: string = 'gpt-4.1-2025-04-14'): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) throw new Error('OpenAI API key not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callClaude(prompt: string): Promise<string> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicApiKey) throw new Error('Anthropic API key not configured');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function generateWithFallback(prompt: string): Promise<{ result: string; provider: string }> {
  try {
    const result = await callOpenAI(prompt);
    return { result, provider: 'openai' };
  } catch (error) {
    console.log('OpenAI failed, trying Claude:', error.message);
    try {
      const result = await callClaude(prompt);
      return { result, provider: 'claude' };
    } catch (claudeError) {
      console.error('Both OpenAI and Claude failed:', claudeError.message);
      throw new Error('Both AI providers are unavailable. Please try again later.');
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Rate limiting
    if (!checkRateLimit(user.id, 3, 60000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Custom script generation is limited to 3 requests per minute.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { productType, targetAudience, scriptLength, tone, specificRequests } = await req.json();

    // Check user credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.credits < 2) {
      return new Response(JSON.stringify({ error: 'Insufficient credits. Custom script generation requires 2 credits.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log usage for monitoring
    await supabase.from('api_usage_logs').insert({
      user_id: user.id,
      endpoint: 'generate-custom-script-enhanced',
      timestamp: new Date().toISOString(),
      metadata: { product_type: productType, credits_used: 2 }
    });

    const prompt = `Generate a sales script for the following parameters:

Product/Service: ${productType}
Target Audience: ${targetAudience}
Script Length: ${scriptLength}
Tone: ${tone}
Specific Requests: ${specificRequests || 'None'}

Create a professional sales script that includes:
1. Opening (attention-grabbing introduction)
2. Discovery questions to understand needs
3. Product presentation highlighting benefits
4. Handling common objections
5. Strong closing techniques

The script should be natural, conversational, and tailored to the specified audience and product. Include specific dialogue examples and transition phrases.

Format the response as a structured script with clear sections and specific words/phrases to use.`;

    const { result, provider } = await generateWithFallback(prompt);

    // Deduct credits
    await supabase.rpc('deduct_credits', {
      user_id_param: user.id,
      amount_param: 2
    });

    // Log transaction
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      credits_used: 2,
      transaction_type: 'custom_script_generation',
      description: 'Custom script generation'
    });

    return new Response(JSON.stringify({
      success: true,
      script: result,
      provider_used: provider,
      credits_used: 2
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-custom-script-enhanced:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});