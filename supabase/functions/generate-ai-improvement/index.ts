import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { callId, originalTranscript, callContext } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Generating AI improvements for call: ${callId}`);

    // Generate improved responses using GPT-5
    const prompt = `You are an expert sales coach analyzing a sales call to provide improved responses. 

ORIGINAL CALL TRANSCRIPT:
${originalTranscript}

CALL CONTEXT:
${JSON.stringify(callContext, null, 2)}

TASK: For each "You said:" segment in the transcript, generate an improved version that:
1. Maintains the same intent and information
2. Uses better sales techniques and language
3. Handles objections more effectively
4. Sounds more professional and persuasive
5. Follows best practices for sales conversations

For each improvement, provide:
- improved_response: The better version of what the user said
- rationale: Why this version is better (specific techniques used)
- improvement_score: 1-10 rating of how much better this is
- key_techniques: List of sales techniques applied

Format your response as JSON with this structure:
{
  "improvements": [
    {
      "original_index": 0,
      "original_text": "original user response",
      "improved_response": "improved version",
      "rationale": "explanation of improvements",
      "improvement_score": 8,
      "key_techniques": ["technique1", "technique2"]
    }
  ],
  "overall_assessment": "summary of main areas for improvement",
  "best_practices": ["practice1", "practice2"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'You are an expert sales coach providing detailed improvement analysis for sales calls.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 4000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const improvementText = data.choices[0].message.content;
    
    // Try to parse as JSON
    let improvements;
    try {
      improvements = JSON.parse(improvementText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback analysis
      improvements = {
        improvements: [],
        overall_assessment: "Analysis generated but parsing failed. Please try again.",
        best_practices: ["Practice active listening", "Ask more qualifying questions", "Handle objections with empathy"]
      };
    }

    console.log(`Generated ${improvements.improvements?.length || 0} improvements`);

    return new Response(JSON.stringify(improvements), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-improvement function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});