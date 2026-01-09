import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-TRIAL-EXPIRATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all trialing subscriptions with user info
    const { data: trials, error: trialsError } = await supabase
      .from('subscriptions')
      .select(`
        user_id,
        trial_ends_at,
        plan
      `)
      .eq('status', 'trialing')
      .not('trial_ends_at', 'is', null);

    if (trialsError) {
      throw new Error(`Failed to fetch trials: ${trialsError.message}`);
    }

    logStep('Fetched trialing subscriptions', { count: trials?.length || 0 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const results = { processed: 0, emails_sent: 0, errors: 0 };

    for (const trial of trials || []) {
      try {
        // Get user profile for email and name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', trial.user_id)
          .single();

        // Also get email from auth.users if not in profile
        const { data: authUser } = await supabase.auth.admin.getUserById(trial.user_id);
        
        const userEmail = profile?.email || authUser?.user?.email;
        const userName = profile?.full_name || 'Usuário';

        if (!userEmail) {
          logStep('No email found for user', { userId: trial.user_id });
          continue;
        }

        const trialEnd = new Date(trial.trial_ends_at);
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        logStep('Processing trial', { userId: trial.user_id, daysLeft, email: userEmail });

        // Determine which template to use
        let template: string | null = null;
        let templateKey: string | null = null;

        if (daysLeft === 3) {
          template = 'trial_expiring_3days';
          templateKey = 'trial_3days';
        } else if (daysLeft === 1) {
          template = 'trial_expiring_1day';
          templateKey = 'trial_1day';
        } else if (daysLeft <= 0) {
          template = 'trial_expired';
          templateKey = 'trial_expired';
        }

        if (!template || !templateKey) {
          logStep('No email needed for this trial', { daysLeft });
          results.processed++;
          continue;
        }

        // Check if we already sent this type of email today
        const { data: existingLog } = await supabase
          .from('email_logs')
          .select('id')
          .eq('user_id', trial.user_id)
          .eq('template', template)
          .gte('created_at', todayStart)
          .maybeSingle();

        if (existingLog) {
          logStep('Email already sent today', { userId: trial.user_id, template });
          results.processed++;
          continue;
        }

        // Send email via send-email function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: userEmail,
            toName: userName,
            template,
            language: 'pt-BR',
            userId: trial.user_id,
            variables: {
              userName,
              pricingUrl: 'https://app.omniseen.app/pricing',
              daysLeft: String(daysLeft),
              trialEndDate: trialEnd.toLocaleDateString('pt-BR'),
              planName: trial.plan || 'Pro',
            },
          },
        });

        if (emailError) {
          logStep('Failed to send email', { userId: trial.user_id, error: emailError.message });
          results.errors++;
        } else {
          logStep('Email sent successfully', { userId: trial.user_id, template });
          results.emails_sent++;
        }

        results.processed++;
      } catch (userError) {
        logStep('Error processing user', { userId: trial.user_id, error: String(userError) });
        results.errors++;
      }
    }

    logStep('Function completed', results);

    return new Response(
      JSON.stringify(results),
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
