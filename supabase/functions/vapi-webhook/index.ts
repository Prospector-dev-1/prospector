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
    console.log('Vapi webhook called');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const body = await req.json();
    console.log('Webhook event:', body.type, body);

    // Handle end-of-call-report events
    if (body.type === 'end-of-call-report') {
      const { call, transcript } = body;
      
      if (!call?.metadata?.callRecordId) {
        console.log('No callRecordId in metadata, skipping');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const callRecordId = call.metadata.callRecordId;
      console.log('Processing end-of-call for:', callRecordId);

      // Update call record with final transcript
      const { error: updateError } = await supabase
        .from('calls')
        .update({
          transcript: transcript || '',
          call_status: 'completed',
          duration_seconds: call?.duration || 0
        })
        .eq('id', callRecordId);

      if (updateError) {
        console.error('Error updating call record:', updateError);
        throw updateError;
      }

      console.log('Successfully updated call record with final transcript');

      // Trigger analysis if transcript exists
      if (transcript && transcript.trim().length > 0) {
        try {
          console.log('Triggering analysis for call:', callRecordId);
          const { error: analysisError } = await supabase.functions.invoke('end-call-analysis', {
            body: {
              callRecordId,
              transcript,
              duration: call?.duration || 0
            }
          });

          if (analysisError) {
            console.error('Error triggering analysis:', analysisError);
          } else {
            console.log('Analysis triggered successfully');
          }
        } catch (analysisErr) {
          console.error('Failed to trigger analysis:', analysisErr);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});