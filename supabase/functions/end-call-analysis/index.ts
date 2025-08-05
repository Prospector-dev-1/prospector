import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { callRecordId, transcript, duration } = await req.json();
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: userData } = await supabaseService.auth.getUser(token);
    if (!userData.user) {
      throw new Error('Unauthorized');
    }

    // Get call record
    const { data: callRecord } = await supabaseService
      .from('calls')
      .select('*')
      .eq('id', callRecordId)
      .eq('user_id', userData.user.id)
      .single();

    if (!callRecord) {
      throw new Error('Call record not found');
    }

    // Analyze the call transcript using OpenAI
    const analysisPrompt = `
Analyze this cold calling transcript and provide scores (1-10) for each category. The caller was trying to sell a website to a business owner.

Transcript:
${transcript}

Please provide scores and brief feedback for:
1. Confidence - How confident and professional did the caller sound?
2. Objection Handling - How well did they handle prospect objections?
3. Clarity - How clear and articulate was their communication?
4. Persuasiveness - How compelling were their arguments and value propositions?
5. Tone - How appropriate and engaging was their tone?
6. Closing Ability - How effectively did they attempt to close or advance the sale?

Respond in JSON format:
{
  "confidence_score": number,
  "objection_handling_score": number,
  "clarity_score": number,
  "persuasiveness_score": number,
  "tone_score": number,
  "closing_score": number,
  "overall_score": number,
  "feedback": "Detailed feedback with specific examples and suggestions for improvement"
}`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert sales coach who analyzes cold calling performance. Provide honest, constructive feedback with specific examples from the transcript.' 
          },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
      }),
    });

    const openAIData = await openAIResponse.json();
    const analysisText = openAIData.choices[0].message.content;
    
    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      // Fallback if JSON parsing fails
      analysis = {
        confidence_score: 5,
        objection_handling_score: 5,
        clarity_score: 5,
        persuasiveness_score: 5,
        tone_score: 5,
        closing_score: 5,
        overall_score: 5,
        feedback: "Analysis could not be completed. Please try again."
      };
    }

    // Update call record with analysis
    const { error: updateError } = await supabaseService
      .from('calls')
      .update({
        duration_seconds: duration,
        confidence_score: analysis.confidence_score,
        objection_handling_score: analysis.objection_handling_score,
        clarity_score: analysis.clarity_score,
        persuasiveness_score: analysis.persuasiveness_score,
        tone_score: analysis.tone_score,
        closing_score: analysis.closing_score,
        overall_score: analysis.overall_score,
        transcript: transcript,
        ai_feedback: analysis.feedback,
        call_status: 'completed'
      })
      .eq('id', callRecordId);

    if (updateError) {
      console.error('Error updating call record:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: analysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in end-call-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});