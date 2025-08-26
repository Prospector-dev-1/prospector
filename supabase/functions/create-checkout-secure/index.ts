import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting helper
async function checkRateLimit(supabase: any, identifier: string, endpoint: string, maxRequests = 5, windowMs = 60000) {
  const windowStart = new Date(Date.now() - windowMs);
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is OK
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Fail open for availability
  }

  if (!data) {
    // First request, create new record
    await supabase
      .from('rate_limits')
      .insert({ identifier, endpoint, request_count: 1, window_start: new Date() });
    return { allowed: true };
  }

  const isInWindow = new Date(data.window_start) > windowStart;
  
  if (isInWindow && data.request_count >= maxRequests) {
    // Log rate limit violation
    await supabase.rpc('log_security_event', {
      action_name: 'rate_limit_violation',
      event_details: { endpoint, identifier, limit: maxRequests }
    });
    return { allowed: false };
  }

  if (isInWindow) {
    // Increment counter
    await supabase
      .from('rate_limits')
      .update({ request_count: data.request_count + 1 })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint);
  } else {
    // Reset window
    await supabase
      .from('rate_limits')
      .update({ request_count: 1, window_start: new Date() })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint);
  }

  return { allowed: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    const rateLimitResult = await checkRateLimit(supabase, clientIP, 'create-checkout', 3, 60000);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user ID from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Continue with the original create-checkout logic here...
    // This is a secure wrapper around the original functionality
    
    return new Response(
      JSON.stringify({ message: 'Secure checkout endpoint - implementation needed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-checkout-secure:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});