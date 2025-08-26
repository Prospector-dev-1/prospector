import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { timeframe = '7d' } = await req.json().catch(() => ({}));
    
    let dateFilter = new Date();
    switch (timeframe) {
      case '1d':
        dateFilter.setDate(dateFilter.getDate() - 1);
        break;
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 7);
    }

    // Get security audit data
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('created_at', dateFilter.toISOString())
      .order('created_at', { ascending: false });

    // Get failed login attempts (if available in auth logs)
    const { data: authEvents } = await supabase
      .from('auth_audit_logs')
      .select('*')
      .gte('created_at', dateFilter.toISOString())
      .in('event_type', ['sign_in_failed', 'sign_up_failed'])
      .order('created_at', { ascending: false })
      .limit(100)
      .catch(() => ({ data: [] }));

    // Analyze security events
    const securityEvents = {
      sensitive_field_updates: auditLogs?.filter(log => 
        log.action === 'profile_sensitive_field_update' || 
        log.action === 'admin_profile_update'
      ) || [],
      credit_deductions: auditLogs?.filter(log => 
        log.action === 'credits_deducted'
      ) || [],
      failed_auth_attempts: authEvents || [],
      suspicious_activities: []
    };

    // Detect suspicious patterns
    const userActivityMap = new Map();
    auditLogs?.forEach(log => {
      const key = log.user_id;
      if (!userActivityMap.has(key)) {
        userActivityMap.set(key, []);
      }
      userActivityMap.get(key).push(log);
    });

    // Flag users with high activity
    for (const [userId, activities] of userActivityMap.entries()) {
      if (activities.length > 50) { // Threshold for suspicious activity
        securityEvents.suspicious_activities.push({
          user_id: userId,
          activity_count: activities.length,
          types: [...new Set(activities.map((a: any) => a.action))],
          reason: 'High activity volume'
        });
      }
    }

    // Security metrics
    const metrics = {
      total_audit_events: auditLogs?.length || 0,
      failed_auth_attempts: authEvents?.length || 0,
      sensitive_updates: securityEvents.sensitive_field_updates.length,
      credit_operations: securityEvents.credit_deductions.length,
      suspicious_activities: securityEvents.suspicious_activities.length,
      unique_users_active: userActivityMap.size,
      timeframe
    };

    const report = {
      generated_at: new Date().toISOString(),
      generated_by: user.id,
      timeframe,
      metrics,
      events: securityEvents,
      recommendations: [
        ...(metrics.failed_auth_attempts > 10 ? ['Consider implementing additional rate limiting on auth endpoints'] : []),
        ...(metrics.suspicious_activities > 0 ? ['Review flagged users for potential security issues'] : []),
        ...(metrics.sensitive_updates > 20 ? ['Monitor admin activity for compliance'] : []),
        'Regularly review audit logs for unauthorized access attempts',
        'Ensure all sensitive operations are properly logged',
        'Consider implementing additional MFA for admin accounts'
      ]
    };

    console.log(`Security audit report generated by admin ${user.id} for timeframe ${timeframe}`);

    return new Response(
      JSON.stringify(report),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Security audit report error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate security report' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});