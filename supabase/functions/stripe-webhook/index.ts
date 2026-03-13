import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts['t'];
  const expectedSignature = parts['v1'];

  if (!timestamp || !expectedSignature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === expectedSignature;
}

// Calculate payment due date based on business days
function calculatePaymentDueDate(startDate: Date, businessDays: number): Date {
  let daysAdded = 0;
  const current = new Date(startDate);
  
  while (daysAdded < businessDays) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return current;
}

// Fetch referral program settings
async function getReferralSettings(supabase: any): Promise<{ 
  commission_percentage: number; 
  payment_deadline_days: number; 
  is_program_active: boolean; 
} | null> {
  try {
    const { data, error } = await supabase
      .from('referral_settings')
      .select('commission_percentage, payment_deadline_days, is_program_active')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching referral settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getReferralSettings:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.text();
    const isValid = await verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET);
    
    if (!isValid) {
      console.error('Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = JSON.parse(payload);
    logStep('Received Stripe event', { type: event.type });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id || session.client_reference_id;
        const planId = session.metadata?.plan_id;
        const referralCode = session.metadata?.referral_code;
        const amountTotal = session.amount_total; // Amount in cents
        
        logStep('Processing checkout.session.completed', { 
          userId, 
          planId, 
          referralCode, 
          amountTotal 
        });
        
        if (!userId) {
          console.error('No user ID in session');
          break;
        }

        // Update subscription
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan: planId || 'essential',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trial_ends_at: null,
          }, { onConflict: 'user_id' });

        if (error) {
          console.error('Error updating subscription:', error);
        } else {
          logStep('Subscription activated for user', { userId });
        }

        // Handle referral conversion
        if (referralCode && amountTotal > 0) {
          logStep('Processing referral conversion', { referralCode });
          
          // Get referral program settings
          const settings = await getReferralSettings(supabase);
          
          if (!settings?.is_program_active) {
            logStep('Referral program is inactive, skipping conversion');
            break;
          }
          
          // Find the referral by code
          const { data: referral, error: refError } = await supabase
            .from('referrals')
            .select('id, referrer_user_id')
            .eq('referral_code', referralCode.toUpperCase())
            .eq('is_active', true)
            .maybeSingle();

          if (refError) {
            console.error('Error finding referral:', refError);
          } else if (referral) {
            // Make sure the referred user is not the referrer
            if (referral.referrer_user_id !== userId) {
              // Calculate commission using dynamic percentage from settings
              const commissionPercentage = settings.commission_percentage / 100;
              const commissionAmount = Math.round(amountTotal * commissionPercentage);
              const paymentDeadlineDays = settings.payment_deadline_days;
              const paymentDueDate = calculatePaymentDueDate(new Date(), paymentDeadlineDays);

              logStep('Calculating commission', { 
                percentage: settings.commission_percentage, 
                amount: commissionAmount,
                deadline: paymentDeadlineDays
              });

              // Create conversion record
              const { error: convError } = await supabase
                .from('referral_conversions')
                .insert({
                  referral_id: referral.id,
                  referred_user_id: userId,
                  subscription_id: session.subscription,
                  subscription_plan: planId || 'unknown',
                  subscription_amount_cents: amountTotal,
                  commission_amount_cents: commissionAmount,
                  status: 'pending',
                  payment_due_date: paymentDueDate.toISOString(),
                });

              if (convError) {
                console.error('Error creating referral conversion:', convError);
              } else {
                logStep('Referral conversion created', { 
                  referralId: referral.id, 
                  commission: commissionAmount,
                  dueDate: paymentDueDate.toISOString()
                });
              }
            } else {
              logStep('Self-referral prevented', { userId });
            }
          } else {
            logStep('Referral code not found or inactive', { referralCode });
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(invoice.period_start * 1000).toISOString(),
              current_period_end: new Date(invoice.period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('Error updating subscription on invoice.paid:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const planId = subscription.metadata?.plan_id;
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            plan: planId || 'essential',
            status: subscription.status === 'active' ? 'active' : subscription.status === 'canceled' ? 'canceled' : 'past_due',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error canceling subscription:', error);
        } else {
          logStep('Subscription canceled', { subscriptionId: subscription.id });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        logStep('Processing invoice.payment_failed', { subscriptionId });

        if (subscriptionId) {
          // Update subscription status to past_due
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('Error updating subscription on payment failure:', error);
          } else {
            logStep('Subscription marked as past_due', { subscriptionId });
          }
        }
        break;
      }

      default:
        logStep('Unhandled event type', { type: event.type });
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook handler failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
