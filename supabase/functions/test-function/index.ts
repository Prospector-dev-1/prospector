import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Test function called');
    
    // Check environment variables
    const vapiApiKey = Deno.env.get('VAPI_API_KEY');
    const vapiPublicKey = Deno.env.get('VAPI_PUBLIC_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment variables check:', {
      vapiApiKey: vapiApiKey ? 'exists' : 'missing',
      vapiPublicKey: vapiPublicKey ? 'exists' : 'missing',
      supabaseUrl: supabaseUrl ? 'exists' : 'missing',
      supabaseServiceKey: supabaseServiceKey ? 'exists' : 'missing'
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Test function working',
      env_check: {
        vapiApiKey: vapiApiKey ? 'exists' : 'missing',
        vapiPublicKey: vapiPublicKey ? 'exists' : 'missing',
        supabaseUrl: supabaseUrl ? 'exists' : 'missing',
        supabaseServiceKey: supabaseServiceKey ? 'exists' : 'missing'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});