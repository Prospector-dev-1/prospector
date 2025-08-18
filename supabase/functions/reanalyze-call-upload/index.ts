import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

// JSON Schema for validated analysis structure
const analysisSchema = {
  type: "object",
  properties: {
    confidence_score: { type: "integer", minimum: 0, maximum: 100 },
    objection_handling_scores: {
      type: "object",
      properties: {
        price: { type: "integer", minimum: 0, maximum: 100 },
        timing: { type: "integer", minimum: 0, maximum: 100 },
        trust: { type: "integer", minimum: 0, maximum: 100 },
        competitor: { type: "integer", minimum: 0, maximum: 100 }
      },
      required: ["price", "timing", "trust", "competitor"]
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 10
    },
    weaknesses: {
      type: "array", 
      items: { type: "string" },
      minItems: 1,
      maxItems: 10
    },
    better_responses: {
      type: "object",
      properties: {
        price_objection: { type: "string" },
        timing_concern: { type: "string" }
      },
      required: ["price_objection", "timing_concern"]
    },
    psychological_insights: { type: "string", minLength: 10 }
  },
  required: ["confidence_score", "objection_handling_scores", "strengths", "weaknesses", "better_responses", "psychological_insights"]
};

// Validate analysis against schema
function validateAnalysis(analysis: any): boolean {
  try {
    // Basic structure check
    if (!analysis || typeof analysis !== 'object') return false;
    
    // Check required fields
    const required = ["confidence_score", "objection_handling_scores", "strengths", "weaknesses", "better_responses", "psychological_insights"];
    for (const field of required) {
      if (!(field in analysis)) return false;
    }
    
    // Type and range checks
    const score = analysis.confidence_score;
    if (typeof score !== 'number' || score < 0 || score > 100) return false;
    
    const objScores = analysis.objection_handling_scores;
    if (!objScores || typeof objScores !== 'object') return false;
    for (const key of ['price', 'timing', 'trust', 'competitor']) {
      const val = objScores[key];
      if (typeof val !== 'number' || val < 0 || val > 100) return false;
    }
    
    // Array checks
    if (!Array.isArray(analysis.strengths) || analysis.strengths.length === 0) return false;
    if (!Array.isArray(analysis.weaknesses) || analysis.weaknesses.length === 0) return false;
    
    // Better responses check
    const responses = analysis.better_responses;
    if (!responses || typeof responses !== 'object') return false;
    if (!responses.price_objection || !responses.timing_concern) return false;
    
    // Insights check
    if (typeof analysis.psychological_insights !== 'string' || analysis.psychological_insights.length < 10) return false;
    
    return true;
  } catch (e) {
    console.error('Validation error:', e);
    return false;
  }
}

// Analyze with retry and fallback
async function analyzeWithRetryAndFallback(transcript: string): Promise<{ analysis: any, fallbackUsed: boolean }> {
  const analysisPrompt = `
Analyze this sales call transcript and provide a comprehensive review. Focus on:

1. What the salesperson did well (strengths)
2. What went wrong or could be improved (weaknesses)  
3. Objection handling grades for each category (Price, Timing, Trust, Competitor) - score 0-100
4. Better responses they could have used
5. Psychological insights into why their responses were weak

Transcript:
${transcript}

Provide your response in this JSON format:
{
  "confidence_score": 85,
  "objection_handling_scores": {
    "price": 75,
    "timing": 90,
    "trust": 80,
    "competitor": 85
  },
  "strengths": [
    "Built good rapport with the prospect",
    "Asked effective discovery questions"
  ],
  "weaknesses": [
    "Didn't address price objection effectively", 
    "Rushed to close without confirming value"
  ],
  "better_responses": {
    "price_objection": "When they said price was too high, you could have said: 'I understand price is important. Let me break down the ROI you'll see in the first 3 months...'",
    "timing_concern": "Instead of pushing for immediate decision, try: 'What would need to happen for this to make sense in your timeline?'"
  },
  "psychological_insights": "Your responses showed defensive behavior when faced with objections. This creates tension. Instead, embrace objections as buying signals and use them to dig deeper into their real concerns."
}`;

  // Try GPT-5 with JSON schema first
  console.log('Re-analyzing with GPT-5...');
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales coach re-analyzing call performance. Provide detailed, actionable feedback in the requested JSON format. Be precise and follow the schema exactly.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_completion_tokens: 2000,
        response_format: { 
          type: "json_schema",
          json_schema: {
            name: "call_analysis",
            schema: analysisSchema
          }
        }
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const content = result?.choices?.[0]?.message?.content;
      
      if (content) {
        const analysis = JSON.parse(content);
        if (validateAnalysis(analysis)) {
          console.log('GPT-5 re-analysis successful and validated');
          return { analysis, fallbackUsed: false };
        }
        console.log('GPT-5 re-analysis failed validation, trying fallback...');
      }
    } else {
      console.log('GPT-5 re-analysis request failed, trying fallback...');
    }
  } catch (error) {
    console.error('GPT-5 re-analysis error:', error);
  }

  // Fallback to GPT-4.1
  console.log('Re-analyzing with GPT-4.1 fallback...');
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales coach re-analyzing call performance. Provide detailed, actionable feedback in valid JSON format only. No other text.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (response.ok) {
      const result = await response.json();
      const content = result?.choices?.[0]?.message?.content;
      
      if (content) {
        const analysis = JSON.parse(content);
        if (validateAnalysis(analysis)) {
          console.log('GPT-4.1 re-analysis successful and validated');
          return { analysis, fallbackUsed: false };
        }
        console.log('GPT-4.1 re-analysis failed validation...');
      }
    } else {
      console.log('GPT-4.1 re-analysis request failed...');
    }
  } catch (error) {
    console.error('GPT-4.1 re-analysis error:', error);
  }

  throw new Error('Re-analysis failed with both GPT-5 and GPT-4.1. Please try again later.');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uploadId } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    console.log('Re-analyzing call for user:', user.id, 'uploadId:', uploadId);

    // Ensure OpenAI API key is available
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is missing');
      throw new Error('Server configuration error: AI service key missing.');
    }

    // Get existing call upload record
    const { data: uploadRecord, error: fetchError } = await supabase
      .from('call_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !uploadRecord) {
      throw new Error('Call upload not found');
    }

    if (!uploadRecord.transcript) {
      throw new Error('No transcript found for this call. Cannot re-analyze.');
    }

    // Update status to processing
    await supabase
      .from('call_uploads')
      .update({ status: 'processing' })
      .eq('id', uploadId);

    // Re-analyze with robust retry and fallback
    const { analysis, fallbackUsed } = await analyzeWithRetryAndFallback(uploadRecord.transcript);

    console.log('Re-analysis completed, updating database...');

    // Update the upload record with new results
    const { error: updateError } = await supabase
      .from('call_uploads')
      .update({
        status: 'completed',
        ai_analysis: analysis,
        confidence_score: analysis.confidence_score,
        objection_handling_scores: analysis.objection_handling_scores,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        better_responses: analysis.better_responses,
        psychological_insights: analysis.psychological_insights,
        fallback_used: fallbackUsed
      })
      .eq('id', uploadId);

    if (updateError) {
      throw new Error('Failed to update upload record');
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysis,
        fallbackUsed: fallbackUsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reanalyze-call-upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});