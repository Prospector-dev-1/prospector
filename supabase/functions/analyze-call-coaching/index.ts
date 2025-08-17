import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== ANALYZE CALL COACHING START ===');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { callId } = await req.json();
    if (!callId) {
      return new Response(JSON.stringify({ error: 'callId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Decode JWT to get user id
    const token = authHeader.replace('Bearer ', '');
    let userId: string | undefined;
    try {
      const base64Url = token.split('.')[1];
      const payload = JSON.parse(atob(base64Url));
      userId = payload?.sub as string | undefined;
    } catch (_) {
      userId = undefined;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch call transcript and validate ownership
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, user_id, transcript')
      .eq('id', callId)
      .single();

    if (callError || !call) {
      console.error('Call fetch error', callError);
      return new Response(JSON.stringify({ error: 'Call not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (call.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!call.transcript || call.transcript.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No transcript available for this call' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error', profileError);
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (Number(profile.credits) < 0.5) {
      return new Response(JSON.stringify({ error: 'Insufficient credits. You need 0.5 credits.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduct credits after successful AI analysis to avoid charging on failures
    // (moved deduction and transaction logging below, just before returning success)


    // Build OpenAI prompt
    const prompt = `You are a world-class sales coach. Analyze the following call transcript and extract concrete objection-coaching advice.

TRANSCRIPT:
"""
${call.transcript}
"""

Return ONLY valid JSON with this exact shape:
{
  "coaching": [
    {
      "assistant_said": "verbatim or close paraphrase of the prospect's objection or question",
      "your_response": "verbatim or close paraphrase of your reply",
      "issue": "what went wrong in your reply (1-2 sentences, address the person as 'You')",
      "better_response": "a concise, high-quality response you should say next time (2-4 sentences, natural phrasing)",
      "why_better": "brief reasoning why this works (1-2 sentences)",
      "category": "one of: pricing, timing, authority, fit, competition, clarity, trust, other"
    }
  ],
  "summary": "overall guidance in 2-3 sentences (address the person as 'You')",
  "tips": ["3 short bullet tips you should remember"]
}

Guidelines:
- Focus on your weaknesses and how to respond better next time.
- Use plain language; avoid jargon.
- Address the person directly as "You" throughout all feedback.
- If no clear objection exists, still identify weak spots and propose better phrasing.
- Keep responses human and natural, not robotic.`;

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          { role: 'system', content: 'You are a concise, practical sales coach. Always return strict JSON.' },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: 900,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('OpenAI error', errText);
      // Handle OpenAI rate limit gracefully
      if (aiRes.status === 429 || errText.includes('rate_limit_exceeded') || errText.includes('Rate limit')) {
        return new Response(JSON.stringify({ error: 'Rate limited by AI provider. Please try again shortly. No credits were deducted.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI analysis failed. No credits were deducted.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    let content: string = aiData.choices?.[0]?.message?.content ?? '';

    // Strip markdown fences if present
    content = content.trim();
    if (content.startsWith('```')) {
      content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }

    let coaching;
    try {
      coaching = JSON.parse(content);
    } catch (e) {
      console.warn('JSON parse failed, returning fallback');
      coaching = {
        coaching: [],
        summary: 'We reviewed your transcript and found areas to improve. Focus on clarifying value, acknowledging concerns, and closing with confidence.',
        tips: [
          'Acknowledge the objection before answering',
          'Lead with value tied to their role',
          'End with a crisp next step'
        ]
      };
    }

    // After successful AI analysis, deduct 0.5 credits and record transaction
    const currentCredits = Number(profile.credits);
    const newCreditAmount = Number((currentCredits - 0.5).toFixed(2));

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newCreditAmount })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to deduct credits after analysis', updateError);
      return new Response(JSON.stringify({ error: 'Analysis succeeded but credit deduction failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record transaction with allowed type 'deduction' (amount in hundredths)
    const { error: txnError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        type: 'deduction',
        amount: -50,
        description: `Objection coaching for call ${callId}`,
      });

    if (txnError) {
      console.warn('Transaction insert failed', txnError);
    }

    return new Response(JSON.stringify({ success: true, ...coaching, credits_remaining: newCreditAmount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('FATAL in analyze-call-coaching', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
