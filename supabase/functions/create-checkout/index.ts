import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  planId: 'lite' | 'pro' | 'business';
  billingPeriod: 'monthly' | 'yearly';
  userId: string;
  email: string;
  currency?: 'usd' | 'brl';
  successUrl?: string;
  cancelUrl?: string;
  referralCode?: string;
}

// Stripe price IDs for each plan
const STRIPE_PRICES = {
  lite: {
    monthly: 'price_1SmPgFDVjNx9wqKqGJ4103Eu',
    yearly: 'price_1SmPgnDVjNx9wqKqrpQttIE3',
  },
  essential: {
    monthly: 'price_1SmPgFDVjNx9wqKqGJ4103Eu',
    yearly: 'price_1SmPgnDVjNx9wqKqrpQttIE3',
  },
  pro: {
    monthly: 'price_1SmPhBDVjNx9wqKqkBLGG5r0',
    yearly: 'price_1SmPhMDVjNx9wqKqenU0ND0b',
  },
  business: {
    monthly: 'price_1SmPhZDVjNx9wqKqLNpe5zNZ',
    yearly: 'price_1SmPi5DVjNx9wqKqYITvpofT',
  },
};

const PLAN_NAMES: Record<string, string> = {
  lite: 'Lite',
  pro: 'Pro',
  business: 'Business',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe not configured. Please add your Stripe secret key.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      planId, 
      billingPeriod, 
      userId, 
      email, 
      currency, 
      successUrl, 
      cancelUrl,
      referralCode 
    }: CheckoutRequest = await req.json();

    logStep('Checkout request received', { planId, billingPeriod, userId, referralCode });

    if (!planId || !billingPeriod || !userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Stripe price ID
    const planPrices = STRIPE_PRICES[planId as keyof typeof STRIPE_PRICES];
    
    if (!planPrices) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceId = planPrices[billingPeriod as 'monthly' | 'yearly'];
    
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Invalid billing period' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build metadata
    const metadata: Record<string, string> = {
      plan_id: planId,
      billing_period: billingPeriod,
      user_id: userId,
    };

    // Add referral code if provided
    if (referralCode) {
      metadata.referral_code = referralCode.toUpperCase();
      logStep('Referral code attached', { referralCode: referralCode.toUpperCase() });
    }

    // Build form data for Stripe API
    const formData = new URLSearchParams({
      'mode': 'subscription',
      'customer_email': email,
      'client_reference_id': userId,
      'success_url': successUrl || `${req.headers.get('origin')}/subscription?success=true`,
      'cancel_url': cancelUrl || `${req.headers.get('origin')}/pricing?canceled=true`,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'allow_promotion_codes': 'true',
    });

    // Add metadata
    Object.entries(metadata).forEach(([key, value]) => {
      formData.append(`metadata[${key}]`, value);
      formData.append(`subscription_data[metadata][${key}]`, value);
    });

    // Enable Adaptive Pricing for automatic currency conversion
    formData.append('automatic_tax[enabled]', 'false');

    // Create Stripe checkout session
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const session = await response.json();

    if (session.error) {
      console.error('Stripe error:', session.error);
      return new Response(
        JSON.stringify({ error: session.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Checkout session created', { sessionId: session.id, planId });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
