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
  console.log('Attempting analysis with GPT-5...');
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
            content: 'You are an expert sales coach analyzing call performance. Provide detailed, actionable feedback in the requested JSON format. Be precise and follow the schema exactly.'
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
      const message = result?.choices?.[0]?.message;

      let analysis: any | null = null;
      // Prefer parsed object when using json_schema
      if (message?.parsed && typeof message.parsed === 'object') {
        analysis = message.parsed;
      } else if (typeof message?.content === 'string') {
        try {
          analysis = JSON.parse(message.content);
        } catch (e) {
          // Try to salvage JSON from any surrounding text
          const start = message.content.indexOf('{');
          const end = message.content.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            try { analysis = JSON.parse(message.content.slice(start, end + 1)); } catch {}
          }
        }
      }

      if (analysis && validateAnalysis(analysis)) {
        console.log('GPT-5 analysis successful and validated');
        return { analysis, fallbackUsed: false };
      }
      console.log('GPT-5 analysis missing/invalid, trying fallback...');
    } else {
      console.log('GPT-5 request failed, trying fallback...');
    }
  } catch (error) {
    console.error('GPT-5 analysis error:', error);
  }

  // Fallback to GPT-4.1
  console.log('Attempting analysis with GPT-4.1 fallback...');
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
            content: 'You are an expert sales coach analyzing call performance. Provide detailed, actionable feedback in valid JSON format only. No other text.'
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
      const message = result?.choices?.[0]?.message;

      let analysis: any | null = null;
      if (message?.parsed && typeof message.parsed === 'object') {
        analysis = message.parsed;
      } else if (typeof message?.content === 'string') {
        try {
          analysis = JSON.parse(message.content);
        } catch (e) {
          const start = message.content.indexOf('{');
          const end = message.content.lastIndexOf('}');
          if (start !== -1 && end !== -1 && end > start) {
            try { analysis = JSON.parse(message.content.slice(start, end + 1)); } catch {}
          }
        }
      }

      if (analysis && validateAnalysis(analysis)) {
        console.log('GPT-4.1 fallback analysis successful and validated');
        return { analysis, fallbackUsed: false };
      }
      console.log('GPT-4.1 analysis missing/invalid, using manual fallback...');
    } else {
      console.log('GPT-4.1 request failed, using manual fallback...');
    }
  } catch (error) {
    console.error('GPT-4.1 analysis error:', error);
  }

  // Manual fallback - create structured analysis
  console.log('Using manual analysis fallback');
  const fallbackAnalysis = {
    confidence_score: 50,
    objection_handling_scores: { 
      price: 50, 
      timing: 50, 
      trust: 50, 
      competitor: 50 
    },
    strengths: [
      'Demonstrated effort in engaging the prospect',
      'Showed persistence in the conversation'
    ],
    weaknesses: [
      'AI analysis failed - manual review recommended',
      'Technical parsing issues prevented detailed feedback'
    ],
    better_responses: {
      price_objection: "I hear you on price—can we look at the ROI and outcomes this enables over the next quarter?",
      timing_concern: "What milestones would make the timing feel right, and how can we align the rollout?"
    },
    psychological_insights: 'Fallback generated due to AI parsing issues. Focus on curiosity, validation, and value linking when objections arise. Consider re-analyzing this call.'
  };

  return { analysis: fallbackAnalysis, fallbackUsed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, originalFilename, fileType } = await req.json();
    
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

    console.log('Processing file for user:', user.id);

    // Get user profile and check credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    if (profile.credits < 1) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. You need 1 credit to analyze a call.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create call upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('call_uploads')
      .insert({
        user_id: user.id,
        original_filename: originalFilename,
        file_type: fileType,
        file_size: file.length,
        status: 'processing'
      })
      .select()
      .single();

    if (uploadError) {
      throw new Error('Failed to create upload record');
    }

    console.log('Created upload record:', uploadRecord.id);

    // Ensure OpenAI API key is available
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is missing in edge function environment');
      throw new Error('Server configuration error: AI service key missing. Please contact support.');
    }

    // Basic transcript validation - check for minimum length
    if (!file || file.length < 100) {
      throw new Error('File too small or empty. Please upload a valid audio/video file with speech content.');
    }

    // Convert base64 to binary for audio processing
    const binaryString = atob(file);
    const binaryAudio = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryAudio[i] = binaryString.charCodeAt(i);
    }
    
    // Step 1: Transcribe the audio
    console.log('Starting transcription...');
    const formData = new FormData();

    // Determine best content type from filename
    const lowerName = (originalFilename || '').toLowerCase();
    let contentType = 'audio/mpeg';
    if (lowerName.endsWith('.wav')) contentType = 'audio/wav';
    else if (lowerName.endsWith('.m4a')) contentType = 'audio/m4a';
    else if (lowerName.endsWith('.mp3')) contentType = 'audio/mpeg';
    else if (lowerName.endsWith('.mov')) contentType = 'video/quicktime';
    else if (lowerName.endsWith('.mp4')) contentType = 'video/mp4';
    else if (fileType === 'video') contentType = 'video/mp4';

    const audioBlob = new Blob([binaryAudio], { type: contentType });
    formData.append('file', audioBlob, originalFilename);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Explicit language hint for better accuracy

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Transcription error:', errorText);
      
      // Try to parse OpenAI error for user-friendly message
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 'insufficient_quota') {
          throw new Error('Transcription failed (quota): Please check OpenAI billing/limits.');
        } else if (errorData.error?.message) {
          throw new Error(`Transcription failed (${transcriptionResponse.status}): ${errorData.error.message}`);
        }
      } catch (parseError) {
        console.error('Could not parse OpenAI error:', parseError);
      }
      
      const snippet = (errorText || '').slice(0, 200);
      throw new Error(`Transcription failed (${transcriptionResponse.status}). Details: ${snippet}`);
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcript = transcriptionResult.text;

    // Basic transcript validation
    if (!transcript || transcript.trim().length < 50) {
      throw new Error('Transcript too short or empty. Please ensure your audio contains clear speech content.');
    }

    console.log('Transcription completed, analyzing...');

    // Step 2: Analyze with robust retry and fallback
    const { analysis, fallbackUsed } = await analyzeWithRetryAndFallback(transcript);

    console.log('Analysis completed, updating database...');

    // Step 3: Update the upload record with results
    const { error: updateError } = await supabase
      .from('call_uploads')
      .update({
        status: 'completed',
        transcript: transcript,
        ai_analysis: analysis,
        confidence_score: analysis.confidence_score,
        objection_handling_scores: analysis.objection_handling_scores,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        better_responses: analysis.better_responses,
        psychological_insights: analysis.psychological_insights,
        fallback_used: fallbackUsed
      })
      .eq('id', uploadRecord.id);

    if (updateError) {
      throw new Error('Failed to update upload record');
    }

    // Step 4: Deduct credit and log transaction
    const { error: creditError } = await supabase.rpc('deduct_credits', {
      user_id_param: user.id,
      amount_param: 1
    });

    if (creditError) {
      console.warn('Failed to deduct credit:', creditError);
    }

    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        type: 'debit',
        amount: 1,
        description: 'Call analysis review'
      });

    if (transactionError) {
      console.warn('Failed to log transaction:', transactionError);
    }

    // Get updated profile
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        uploadId: uploadRecord.id,
        remainingCredits: updatedProfile?.credits || 0,
        fallbackUsed: fallbackUsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload-call-analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error message:', errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});