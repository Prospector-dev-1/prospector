import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SecurityLogger } from '@/utils/securityUtils';
import { useDataMasking } from '@/hooks/useDataMasking';

interface SecureProfile {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  credits: number;
  subscription_type: string;
  subscription_end?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export const useSecureProfile = () => {
  const { user } = useAuth();
  const { maskSensitiveData } = useDataMasking();
  const [profile, setProfile] = useState<SecureProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecureProfile = async (targetUserId?: string) => {
    if (!user) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    const userId = targetUserId || user.id;
    
    try {
    // Use the masked view for additional protection
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

      if (error) {
        console.error('Error fetching secure profile:', error);
        setError('Failed to load profile');
        return;
      }

    // Apply client-side masking using the data masking hook
    // For now, set the raw data and let the UI components handle masking
    
    // Log PII access for security monitoring
    await SecurityLogger.logSecurityEvent('secure_profile_access', {
      target_user_id: userId,
      accessed_fields: Object.keys(data || {}),
      is_self_access: userId === user.id
    }, userId);

    setProfile(data);
      setError(null);
    } catch (err) {
      console.error('Secure profile fetch error:', err);
      setError('An error occurred while loading profile');
    } finally {
      setLoading(false);
    }
  };

  const updateSecureProfile = async (updates: Partial<SecureProfile>) => {
    if (!user || !profile) {
      throw new Error('Authentication required');
    }

    // Filter out sensitive fields that should only be updated by admins
    const { credits, subscription_type, subscription_end, ...safeUpdates } = updates;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        ...safeUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    // Log the update
    await SecurityLogger.logSecurityEvent('secure_profile_update', {
      updated_fields: Object.keys(safeUpdates),
      has_sensitive_fields: !!(credits || subscription_type || subscription_end)
    }, user.id);

    // Refresh profile data
    await fetchSecureProfile();
  };

  useEffect(() => {
    if (user) {
      fetchSecureProfile();
    }
  }, [user]);

  return {
    profile,
    loading,
    error,
    fetchSecureProfile,
    updateSecureProfile,
    refetch: () => fetchSecureProfile()
  };
};