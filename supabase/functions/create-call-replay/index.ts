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
    const { callId, replayType = 'playback', settings = {} } = await req.json();
    
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

    console.log(`Creating ${replayType} replay for call: ${callId}`);

    // Get the original call data
    const { data: call, error: callError } = await supabaseClient
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', user.id)
      .single();

    if (callError || !call) {
      throw new Error('Call not found or access denied');
    }

    // Check if replay already exists
    let { data: existingReplay, error: replayError } = await supabaseClient
      .from('call_replays')
      .select('*')
      .eq('call_id', callId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (replayError && replayError.code !== 'PGRST116') {
      throw new Error('Error checking existing replay');
    }

    // Parse transcript to extract timestamped utterances
    const transcript = call.transcript || '';
    const timestampedTranscript = parseTranscriptWithTimestamps(transcript);

    const replayData = {
      call_id: callId,
      user_id: user.id,
      per_utterance_timestamps: timestampedTranscript,
      replay_settings: {
        type: replayType,
        ...settings
      }
    };

    if (existingReplay) {
      // Update existing replay
      const { data: updatedReplay, error: updateError } = await supabaseClient
        .from('call_replays')
        .update(replayData)
        .eq('id', existingReplay.id)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to update replay');
      }

      console.log(`Updated replay: ${updatedReplay.id}`);
      return new Response(JSON.stringify({
        replayId: updatedReplay.id,
        callId: callId,
        type: replayType,
        timestampedTranscript
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Create new replay
      const { data: newReplay, error: insertError } = await supabaseClient
        .from('call_replays')
        .insert(replayData)
        .select()
        .single();

      if (insertError) {
        throw new Error('Failed to create replay');
      }

      console.log(`Created new replay: ${newReplay.id}`);
      return new Response(JSON.stringify({
        replayId: newReplay.id,
        callId: callId,
        type: replayType,
        timestampedTranscript
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in create-call-replay function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseTranscriptWithTimestamps(transcript: string) {
  const lines = transcript.split('\n').filter(line => line.trim());
  const timestamped = [];
  let currentTime = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Prospect said:') || line.startsWith('You said:')) {
      const speaker = line.startsWith('Prospect said:') ? 'prospect' : 'user';
      const text = line.replace(/^(Prospect said:|You said:)\s*/, '');
      
      timestamped.push({
        index: i,
        speaker,
        text,
        timestamp: currentTime,
        duration: Math.max(2, text.length * 0.05) // Estimate duration based on text length
      });
      
      currentTime += timestamped[timestamped.length - 1].duration + 0.5; // Add small gap
    }
  }
  
  return timestamped;
}