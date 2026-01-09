import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function useCheckout() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const initiateCheckout = async (planId: string, period: 'monthly' | 'yearly' = 'yearly') => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          planId,
          billingPeriod: period,
          userId: user.id,
          email: user.email,
          fullName: user.user_metadata?.full_name || '',
          successUrl: `${window.location.origin}/app/subscription?success=true`,
          cancelUrl: `${window.location.origin}/pricing`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
        return { success: true };
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: t('common.error'),
        description: t('auth.errors.unexpectedError'),
        variant: 'destructive',
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    initiateCheckout,
    isLoading,
  };
}
