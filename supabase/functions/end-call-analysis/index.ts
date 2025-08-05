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

    console.log('=== ANALYSIS DEBUG ===');
    console.log('Transcript received:', transcript);
    console.log('Transcript length:', transcript.length);
    console.log('Duration:', duration);

    // Check if the transcript shows meaningful caller participation
    const transcriptLower = transcript.toLowerCase();
    const hasBasicParticipation = transcript.length > 30 && (
      transcriptLower.includes('hello') || 
      transcriptLower.includes('hi') || 
      transcriptLower.includes('website') ||
      transcriptLower.includes('business') ||
      transcriptLower.includes('call')
    );
    
    console.log('Has basic participation:', hasBasicParticipation);
    
    // If no participation at all, return zeros immediately
    if (!hasBasicParticipation) {
      console.log('No participation detected');
      const analysis = {
        confidence_score: 0,
        objection_handling_score: 0,
        clarity_score: 0,
        persuasiveness_score: 0,
        tone_score: 0,
        overall_pitch_score: 0,
        closing_score: 0,
        overall_score: 0,
        successful_sale: false,
        feedback: "No sales conversation detected. You need to actively participate in the call by speaking to the prospect."
      };
      
      console.log('Using zero scores for no participation');
      
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
          overall_pitch_score: analysis.overall_pitch_score,
          closing_score: analysis.closing_score,
          overall_score: analysis.overall_score,
          successful_sale: analysis.successful_sale,
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
    }

    // For any participation, use AI analysis for rigorous scoring
    console.log('Participation detected, proceeding with rigorous AI analysis');
    const analysisPrompt = `
Analyze this cold calling transcript and provide scores (1-10) for each category. The caller was trying to sell a website to a business owner.

IMPORTANT: Only analyze and score if the CALLER (salesperson) actually spoke and made a sales pitch. If the transcript shows only the prospect speaking or very minimal caller participation, return all scores as 0 and indicate insufficient data.

Transcript:
${transcript}

Please analyze WHO is speaking in this transcript:
- The CALLER (salesperson) - this is who we're evaluating
- The PROSPECT (business owner) - this is who the caller is trying to sell to

If the caller didn't make a meaningful sales attempt (less than 20 words of sales content), return all scores as 0 with feedback explaining insufficient sales attempt.

If there IS a meaningful sales conversation from the caller, provide scores and brief feedback for:
1. ❓ Objection Handling (objection_handling_score) - Did they turn around the objection or ignore it?
2. 🧠 Confidence (confidence_score) - Was their tone assertive or hesitant?
3. 🎯 Clarity (clarity_score) - Was their message focused?
4. 💡 Persuasion (persuasiveness_score) - Did they appeal emotionally or logically?
5. 👂 Listening & Response (tone_score) - Did they tailor answers or script-dump?
6. 📋 Overall Pitch / Script (overall_pitch_score) - How well structured and delivered was their overall pitch?
7. Closing Ability (closing_score) - How effectively did they attempt to close or advance the sale?
8. Sale Success - Did the prospect agree to buy, schedule a meeting, or show strong interest? (true/false)

Respond in JSON format:
{
  "confidence_score": number,
  "objection_handling_score": number,
  "clarity_score": number,
  "persuasiveness_score": number,
  "tone_score": number,
  "overall_pitch_score": number,
  "closing_score": number,
  "overall_score": number,
  "successful_sale": boolean,
  "feedback": "Detailed feedback with specific examples and suggestions for improvement. If insufficient data, explain that the caller needs to actually participate in the conversation to receive meaningful feedback."
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
            content: 'You are an expert sales coach who analyzes cold calling performance. You MUST respond with valid JSON only. Provide honest, constructive feedback with specific examples from the transcript.' 
          },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1,
      }),
    });

    console.log('OpenAI response status:', openAIResponse.status);
    if (!openAIResponse.ok) {
      console.log('OpenAI API error:', await openAIResponse.text());
      throw new Error(`OpenAI API failed with status ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response:', openAIData);
    const analysisText = openAIData.choices[0].message.content;
    console.log('Analysis text from OpenAI:', analysisText);
    
    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
      console.log('Parsed analysis:', analysis);
    } catch (e) {
      console.log('JSON parsing failed, using rigorous manual analysis. Error:', e);
      console.log('Raw OpenAI response that failed to parse:', analysisText);
      
      // Rigorous manual analysis based on actual sales performance
      const transcriptLower = transcript.toLowerCase();
      
      // Check for proper introduction (professional opening)
      const hasProperIntro = transcriptLower.includes('this is') || transcriptLower.includes('my name is') || transcriptLower.includes('calling from');
      
      // Check for clear value proposition (not just mentioning website)
      const hasValueProp = (transcriptLower.includes('better') && transcriptLower.includes('website')) || 
                          transcriptLower.includes('improve your') || 
                          transcriptLower.includes('help you') ||
                          transcriptLower.includes('save you');
      
      // Check for objection handling (responding to resistance)
      const hasObjectionHandling = transcriptLower.includes('understand') || 
                                  transcriptLower.includes('but what if') || 
                                  transcriptLower.includes('let me explain');
      
      // Check for closing attempt (asking for next step)
      const hasClosing = transcriptLower.includes('would you be interested') || 
                        transcriptLower.includes('can we schedule') || 
                        transcriptLower.includes('when would be good');
      
      // Harsh but fair scoring - most people should get 1-3 on their first tries
      const introScore = hasProperIntro ? 4 : 1;
      const pitchScore = hasValueProp ? 5 : 2;
      const objectionScore = hasObjectionHandling ? 6 : 1;
      const closingScore = hasClosing ? 6 : 1;
      const overallScore = Math.round((introScore + pitchScore + objectionScore + closingScore) / 4);
      
      analysis = {
        confidence_score: introScore,
        objection_handling_score: objectionScore,
        clarity_score: pitchScore,
        persuasiveness_score: hasValueProp ? 4 : 1,
        tone_score: 2, // Default low since we can't assess tone from text
        overall_pitch_score: pitchScore,
        closing_score: closingScore,
        overall_score: overallScore,
        successful_sale: false,
        feedback: `Sales Performance Analysis:
INTRODUCTION: ${hasProperIntro ? 'Good - You introduced yourself professionally' : 'Poor - No professional introduction detected'}
VALUE PROPOSITION: ${hasValueProp ? 'Fair - You mentioned improvements' : 'Poor - No clear value proposition offered'}
OBJECTION HANDLING: ${hasObjectionHandling ? 'Good - You addressed concerns' : 'Poor - No objection handling detected'}
CLOSING: ${hasClosing ? 'Good - You attempted to advance the sale' : 'Poor - No closing attempt detected'}

${overallScore < 3 ? 'This was a weak sales call. Focus on: 1) Professional introduction 2) Clear value proposition 3) Asking for next steps' : 
  overallScore < 6 ? 'This was an average attempt. Improve your objection handling and closing technique.' : 
  'Solid performance! Keep refining your approach.'}`
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
        overall_pitch_score: analysis.overall_pitch_score,
        closing_score: analysis.closing_score,
        overall_score: analysis.overall_score,
        successful_sale: analysis.successful_sale,
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