import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PlatformAdminCheckResult {
  isPlatformAdmin: boolean;
  loading: boolean;
}

export function usePlatformAdminCheck(): PlatformAdminCheckResult {
  const { user } = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsPlatformAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Use the secure has_role function to check admin status
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'platform_admin'])
          .maybeSingle();

        if (error) {
          console.error('Error checking admin status:', error);
          setIsPlatformAdmin(false);
        } else {
          setIsPlatformAdmin(!!data);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsPlatformAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isPlatformAdmin, loading };
}
