import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIST-INVOICES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    logStep('User authenticated', { userId, email: userEmail });

    // Get subscription to find Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      logStep('No Stripe customer found');
      return new Response(
        JSON.stringify({ invoices: [], paymentMethod: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customerId = subscription.stripe_customer_id;
    logStep('Found Stripe customer', { customerId });

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Fetch invoices
    const invoicesResponse = await stripe.invoices.list({
      customer: customerId,
      limit: 20,
    });

    const invoices = invoicesResponse.data.map((inv: Stripe.Invoice) => ({
      id: inv.id,
      number: inv.number,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      hosted_invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
    }));

    logStep('Fetched invoices', { count: invoices.length });

    // Fetch default payment method
    let paymentMethod = null;
    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      
      if (customer.invoice_settings?.default_payment_method) {
        const pmId = customer.invoice_settings.default_payment_method as string;
        const pm = await stripe.paymentMethods.retrieve(pmId);
        
        if (pm.card) {
          paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          };
          logStep('Found payment method', { brand: pm.card.brand, last4: pm.card.last4 });
        }
      }
    } catch (pmError) {
      logStep('Error fetching payment method', { error: String(pmError) });
    }

    return new Response(
      JSON.stringify({ invoices, paymentMethod }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
