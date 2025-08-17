import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUnclaimedChallenges = () => {
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUnclaimedCount = async () => {
    if (!user) {
      setUnclaimedCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_challenge_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .eq('credits_claimed', false);

      if (error) {
        console.error('Error fetching unclaimed challenges:', error);
        setUnclaimedCount(0);
      } else {
        setUnclaimedCount(data?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching unclaimed challenges:', error);
      setUnclaimedCount(0);
    } finally {
      setLoading(false);
    }
  };

  const refreshUnclaimedChallenges = () => {
    fetchUnclaimedCount();
  };

  useEffect(() => {
    fetchUnclaimedCount();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for challenge progress changes
    const channel = supabase
      .channel('unclaimed-challenges')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_challenge_progress',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnclaimedCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    unclaimedCount,
    loading,
    refreshUnclaimedChallenges
  };
};