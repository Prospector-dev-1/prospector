import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getSuccessEvaluationPrompt } from "../_shared/success-evaluation-prompt.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let callRecordId: string | undefined;
  let userId: string | undefined;
  
  try {
    const requestBody = await req.json();
    callRecordId = requestBody.callRecordId;
    const transcript = requestBody.transcript;
    const duration = requestBody.duration;
    
    console.log('=== VAPI-SUCCESS-EVALUATION START ===');
    console.log('Call Record ID:', callRecordId);
    console.log('Transcript length:', transcript?.length || 0);
    console.log('Duration:', duration);
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Decode JWT locally
    try {
      const base64Url = token.split('.')[1];
      const payload = JSON.parse(atob(base64Url));
      userId = payload?.sub as string | undefined;
    } catch (_) {
      userId = undefined;
    }
    if (!userId) {
      throw new Error('Unauthorized');
    }

    // Get call record
    const { data: callRecord } = await supabaseService
      .from('calls')
      .select('*')
      .eq('id', callRecordId)
      .eq('user_id', userId)
      .single();

    if (!callRecord) {
      throw new Error('Call record not found');
    }

    // Check if analysis already exists
    if (callRecord.overall_score && callRecord.ai_feedback) {
      console.log('Analysis already exists, returning existing results');
      return new Response(JSON.stringify({ 
        success: true,
        source: 'existing',
        analysis: {
          confidence_score: callRecord.confidence_score,
          objection_handling_score: callRecord.objection_handling_score,
          clarity_score: callRecord.clarity_score,
          persuasiveness_score: callRecord.persuasiveness_score,
          tone_score: callRecord.tone_score,
          overall_pitch_score: callRecord.overall_pitch_score,
          closing_score: callRecord.closing_score,
          overall_score: callRecord.overall_score,
          successful_sale: callRecord.successful_sale,
          feedback: callRecord.ai_feedback
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const finalTranscript = transcript || callRecord.transcript;
    
    if (!finalTranscript) {
      throw new Error('No transcript available for analysis');
    }

    // Step 1: Try Vapi Success Evaluation first
    console.log('Attempting Vapi Success Evaluation...');
    let analysis;
    let source = 'vapi';
    
    try {
      const vapiApiKey = Deno.env.get('VAPI_API_KEY');
      if (!vapiApiKey) {
        throw new Error('VAPI_API_KEY not configured');
      }

      // Try to get Vapi call evaluation results with timeout
      const vapiTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Vapi evaluation timeout after 25 seconds')), 25000)
      );
      
      // This is where you would implement the actual Vapi Success Evaluation API call
      // For now, we'll immediately fall back to OpenAI as specified in the requirements
      // since Vapi Success Evaluation requires specific call ID integration
      throw new Error('Vapi Success Evaluation: Falling back to OpenAI (not yet fully integrated)');
      
    } catch (vapiError) {
      console.log('Vapi Success Evaluation failed:', vapiError.message);
      
      // Step 2: Fallback to existing OpenAI analysis
      console.log('Falling back to OpenAI analysis...');
      source = 'openai-fallback';
      
      // Call the existing end-call-analysis function directly
      const analysisPrompt = getSuccessEvaluationPrompt(finalTranscript);
      
      // Multiple fallback models for reliability (same as original)
      const models = ['gpt-4o-mini', 'gpt-4o'];
      let openAISuccess = false;

      for (const model of models) {
        try {
          console.log(`Attempting OpenAI model: ${model}`);
          
          const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { 
                  role: 'system', 
                  content: 'You are an expert sales coach. You MUST respond with valid JSON only. Analyze cold calling performance and provide specific, actionable feedback with quotes from the transcript.' 
                },
                { role: 'user', content: analysisPrompt }
              ],
              temperature: 0.2,
              max_tokens: 1000,
            }),
          });
          
          if (openAIResponse.ok) {
            const openAIData = await openAIResponse.json();
            const analysisText = openAIData.choices[0].message.content;
            
            try {
              analysis = JSON.parse(analysisText);
              console.log('OpenAI analysis successful with model:', model);
              openAISuccess = true;
              break;
            } catch (parseError) {
              console.log(`JSON parsing failed for ${model}, trying next model`);
              continue;
            }
          } else {
            const errorText = await openAIResponse.text();
            console.log(`OpenAI API error for ${model}:`, errorText);
            continue;
          }
        } catch (error) {
          console.log(`OpenAI request failed for ${model}:`, error.message);
          continue;
        }
      }

      if (!openAISuccess) {
        throw new Error('All OpenAI models failed during fallback');
      }
    }

    // Step 3: Persist results (idempotent - only save once)
    console.log('Persisting analysis results...');
    
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
        transcript: finalTranscript,
        ai_feedback: analysis.feedback,
        call_status: 'completed'
      })
      .eq('id', callRecordId);

    if (updateError) {
      console.error('Error updating call record:', updateError);
      throw new Error(`Failed to persist analysis results: ${updateError.message}`);
    }

    console.log('Analysis completed with source:', source);
    
    return new Response(JSON.stringify({ 
      success: true,
      source,
      analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vapi-success-evaluation function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      callRecordId
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});