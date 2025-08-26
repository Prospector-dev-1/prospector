import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(ip: string, maxRequests = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip) || { count: 0, lastReset: now };
  
  // Reset if window expired
  if (now - userLimit.lastReset > windowMs) {
    userLimit.count = 0;
    userLimit.lastReset = now;
  }
  
  userLimit.count++;
  rateLimitMap.set(ip, userLimit);
  
  return userLimit.count <= maxRequests;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    const isAdmin = !!roleData;

    if (!isAdmin) {
      console.log(`Non-admin user ${user.id} attempted sensitive profile update`);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetUserId, updates } = await req.json();

    // Validate that only allowed fields are being updated
    const allowedSensitiveFields = ['credits', 'subscription_type', 'subscription_end'];
    const sensitiveUpdates: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedSensitiveFields.includes(key)) {
        sensitiveUpdates[key] = value;
      }
    }

    if (Object.keys(sensitiveUpdates).length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid sensitive fields to update' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform the update using service role
    const { data, error } = await supabase
      .from('profiles')
      .update(sensitiveUpdates)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (error) {
      console.log('Profile update error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the admin action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'admin_profile_update',
      target_id: targetUserId,
      details: {
        updated_fields: sensitiveUpdates,
        admin_user_id: user.id,
        client_ip: clientIP
      },
      ip_address: clientIP,
      user_agent: req.headers.get('user-agent')
    });

    console.log(`Admin ${user.id} updated profile for ${targetUserId}:`, sensitiveUpdates);

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Secure profile update error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});