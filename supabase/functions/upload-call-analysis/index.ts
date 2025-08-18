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
      .single();

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

    // Convert base64 to binary for audio processing (chunked to reduce memory usage)
    function processBase64Chunks(base64String: string, chunkSize = 32768) {
      const chunks: Uint8Array[] = [];
      let position = 0;
      while (position < base64String.length) {
        const slice = base64String.slice(position, position + chunkSize);
        const binary = atob(slice);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        chunks.push(bytes);
        position += chunkSize;
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const c of chunks) { result.set(c, offset); offset += c.length; }
      return result;
    }

    const binaryAudio = processBase64Chunks(file);
    
    // Step 1: Transcribe the audio
    console.log('Starting transcription...');
    const formData = new FormData();

    // Determine best content type from filename
    const lowerName = (originalFilename || '').toLowerCase();
    let contentType = 'audio/mpeg';
    if (lowerName.endsWith('.wav')) contentType = 'audio/wav';
    else if (lowerName.endsWith('.m4a')) contentType = 'audio/mp4';
    else if (lowerName.endsWith('.mp3')) contentType = 'audio/mpeg';
    else if (lowerName.endsWith('.mov')) contentType = 'video/quicktime';
    else if (lowerName.endsWith('.mp4')) contentType = 'video/mp4';
    else if (fileType === 'video') contentType = 'video/mp4';

    const audioBlob = new Blob([binaryAudio], { type: contentType });
    formData.append('file', audioBlob, originalFilename);
    formData.append('model', 'whisper-1');

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
      
      // Parse OpenAI error for user-friendly messages
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 'insufficient_quota') {
          throw new Error('AI transcription service is temporarily unavailable due to quota limits. Please try again later or contact support.');
        } else if (errorData.error?.message) {
          throw new Error(`Transcription failed: ${errorData.error.message}`);
        }
      } catch (parseError) {
        // If we can't parse the error, use a generic message
        console.error('Could not parse OpenAI error:', parseError);
      }
      
      throw new Error('Transcription service is temporarily unavailable. Please try again later.');
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcript = transcriptionResult.text;

    console.log('Transcription completed, analyzing...');

    // Step 2: Analyze with GPT-5
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

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert sales coach analyzing call performance. Provide detailed, actionable feedback in the requested JSON format.'
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

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('Analysis error:', errorText);
      
      // Parse OpenAI error for user-friendly messages
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.code === 'insufficient_quota') {
          throw new Error('AI analysis service is temporarily unavailable due to quota limits. Please try again later or contact support.');
        } else if (errorData.error?.message) {
          throw new Error(`Analysis failed: ${errorData.error.message}`);
        }
      } catch (parseError) {
        console.error('Could not parse OpenAI error:', parseError);
      }
      
      throw new Error('Analysis service is temporarily unavailable. Please try again later.');
    }

    const analysisResult = await analysisResponse.json();
    const analysis = JSON.parse(analysisResult.choices[0].message.content);

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
        psychological_insights: analysis.psychological_insights
      })
      .eq('id', uploadRecord.id);

    if (updateError) {
      throw new Error('Failed to update upload record');
    }

    // Step 4: Deduct credit and log transaction
    const { error: creditError } = await supabase.rpc('deduct_credits', {
      user_id: user.id,
      amount: 1
    });

    if (creditError) {
      console.warn('Failed to deduct credit:', creditError);
    }

    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: user.id,
        type: 'debit',
        amount: -1,
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
        remainingCredits: updatedProfile?.credits || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});