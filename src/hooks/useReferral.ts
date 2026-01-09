import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Referral {
  id: string;
  referrer_user_id: string;
  referral_code: string;
  click_count: number;
  is_active: boolean;
  created_at: string;
}

interface ReferralConversion {
  id: string;
  referral_id: string;
  referred_user_id: string;
  subscription_id: string | null;
  subscription_plan: string | null;
  subscription_amount_cents: number;
  commission_amount_cents: number;
  status: string;
  converted_at: string;
  payment_due_date: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

interface ReferralStats {
  totalClicks: number;
  totalConversions: number;
  totalPending: number;
  totalPaid: number;
  pendingAmount: number;
  paidAmount: number;
}

interface UseReferralResult {
  referral: Referral | null;
  conversions: ReferralConversion[];
  stats: ReferralStats;
  loading: boolean;
  error: string | null;
  generateCode: () => Promise<string | null>;
  getReferralLink: () => string;
  refreshData: () => Promise<void>;
}

// Generate a random 6-character alphanumeric code
function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useReferral(): UseReferralResult {
  const { user } = useAuth();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [conversions, setConversions] = useState<ReferralConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferralData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user's referral
      const { data: referralData, error: refError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user.id)
        .maybeSingle();

      if (refError) throw refError;
      setReferral(referralData);

      // Fetch conversions if referral exists
      if (referralData) {
        const { data: conversionsData, error: convError } = await supabase
          .from('referral_conversions')
          .select('*')
          .eq('referral_id', referralData.id)
          .order('converted_at', { ascending: false });

        if (convError) throw convError;
        setConversions(conversionsData || []);
      }
    } catch (err) {
      console.error('Error fetching referral data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch referral data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  const generateCode = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      setError(null);
      
      // Check if user already has a referral
      if (referral) {
        return referral.referral_code;
      }

      // Generate unique code
      let code = generateRandomCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from('referrals')
          .select('id')
          .eq('referral_code', code)
          .maybeSingle();

        if (!existing) break;
        code = generateRandomCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Could not generate unique code');
      }

      // Insert new referral
      const { data: newReferral, error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_user_id: user.id,
          referral_code: code,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setReferral(newReferral);
      return newReferral.referral_code;
    } catch (err) {
      console.error('Error generating referral code:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate code');
      return null;
    }
  }, [user, referral]);

  const getReferralLink = useCallback((): string => {
    if (!referral) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/?ref=${referral.referral_code}`;
  }, [referral]);

  // Calculate stats
  const stats: ReferralStats = {
    totalClicks: referral?.click_count || 0,
    totalConversions: conversions.length,
    totalPending: conversions.filter(c => c.status === 'pending').length,
    totalPaid: conversions.filter(c => c.status === 'paid').length,
    pendingAmount: conversions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.commission_amount_cents, 0),
    paidAmount: conversions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commission_amount_cents, 0),
  };

  return {
    referral,
    conversions,
    stats,
    loading,
    error,
    generateCode,
    getReferralLink,
    refreshData: fetchReferralData,
  };
}

// Hook to capture referral code from URL
export function useCaptureReferral() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Store in localStorage
      localStorage.setItem('referral_code', refCode.toUpperCase());
      console.log('Referral code captured:', refCode.toUpperCase());
      
      // Clean URL without refreshing
      const newUrl = window.location.pathname + 
        (window.location.search.replace(/[?&]ref=[^&]+/, '').replace(/^\?$/, ''));
      window.history.replaceState({}, '', newUrl || '/');
    }
  }, []);
}

// Get stored referral code
export function getStoredReferralCode(): string | null {
  return localStorage.getItem('referral_code');
}

// Clear stored referral code (call after successful checkout)
export function clearStoredReferralCode(): void {
  localStorage.removeItem('referral_code');
}
