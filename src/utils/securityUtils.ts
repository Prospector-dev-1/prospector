import { supabase } from "@/integrations/supabase/client";

export class SecurityLogger {
  static async logSecurityEvent(
    action: string,
    details: Record<string, any>,
    targetId?: string
  ) {
    try {
      // Use server-side audit logging function for security
      const { error } = await supabase.rpc('log_security_event', {
        action_name: action,
        event_details: details,
        target_user_id: targetId || null
      });

      if (error) {
        console.warn('Security logging failed, continuing without audit log:', error);
        // Don't fallback to direct insert as it may cause permission issues
        // Security logging is important but should not block user operations
      }
    } catch (err) {
      console.error('Security logging error:', err);
    }
  }

  private static async getClientIP(): Promise<string> {
    try {
      // In production, this would be handled by your CDN/proxy
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }
}

export class RateLimiter {
  private static requests = new Map<string, { count: number; lastReset: number }>();

  static checkLimit(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || { count: 0, lastReset: now };

    // Reset if window expired
    if (now - userRequests.lastReset > windowMs) {
      userRequests.count = 0;
      userRequests.lastReset = now;
    }

    userRequests.count++;
    this.requests.set(key, userRequests);

    if (userRequests.count > maxRequests) {
      SecurityLogger.logSecurityEvent('rate_limit_exceeded', {
        key,
        count: userRequests.count,
        limit: maxRequests
      });
      return false;
    }

    return true;
  }
}

export const validateSensitiveFieldUpdate = async (
  targetUserId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      SecurityLogger.logSecurityEvent('unauthorized_sensitive_update_attempt', {
        target_user_id: targetUserId,
        attempted_fields: Object.keys(updates)
      });
      return { success: false, error: 'Admin privileges required' };
    }

    return { success: true };
  } catch (error) {
    console.error('Sensitive field validation error:', error);
    return { success: false, error: 'Validation failed' };
  }
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only audio files allowed.' };
  }

  return { valid: true };
};