import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting storage
const rateLimits = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
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
      max_completion_tokens: 4000,
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
      max_tokens: 4000,
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

async function analyzeWithFallback(prompt: string): Promise<{ result: string; provider: string }> {
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
    if (!checkRateLimit(user.id, 5, 60000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait before trying again.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transcript, callId } = await req.json();
    if (!transcript || !callId) {
      throw new Error('Missing transcript or callId');
    }

    // Log usage for monitoring
    await supabase.from('api_usage_logs').insert({
      user_id: user.id,
      endpoint: 'analyze-call-coaching-enhanced',
      timestamp: new Date().toISOString(),
      metadata: { call_id: callId }
    });

    const coachingPrompt = `Analyze this sales call transcript and provide detailed coaching feedback:

"${transcript}"

Return your analysis in this exact JSON format:
{
  "overall_score": 85,
  "successful_sale": true,
  "coaching": [
    {
      "category": "Opening",
      "issue": "Brief description of what could be improved",
      "context": "Specific quote from the transcript where this occurred",
      "improvement": "Specific actionable advice",
      "script_suggestion": "Exact words to use instead"
    }
  ],
  "strengths": ["strength1", "strength2"],
  "key_improvements": ["improvement1", "improvement2"],
  "next_steps": ["step1", "step2"]
}

Categories to use: Opening, Discovery, Presentation, Objection Handling, Closing, Communication Skills, Building Rapport`;

    const { result, provider } = await analyzeWithFallback(coachingPrompt);
    
    // Parse and store the result
    const coachingData = JSON.parse(result);
    
    const { error: updateError } = await supabase
      .from('call_uploads')
      .update({
        ai_analysis: result,
        overall_score: coachingData.overall_score,
        successful_sale: coachingData.successful_sale,
        call_status: 'completed'
      })
      .eq('id', callId);

    if (updateError) {
      throw new Error(`Failed to update call record: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: coachingData,
      provider_used: provider
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-call-coaching-enhanced:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});