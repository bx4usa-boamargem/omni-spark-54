import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[START-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error(`Authentication error: ${userError?.message || 'User not found'}`);
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    logStep("User authenticated", { userId, userEmail });

    // Parse request body
    const { planId, billingPeriod } = await req.json();
    logStep("Request body parsed", { planId, billingPeriod });

    if (!planId) {
      throw new Error("Plan ID is required");
    }

    // Check if user already has an active subscription
    const { data: existingSub } = await supabaseClient
      .from('subscriptions')
      .select('id, status, plan')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSub) {
      logStep("Existing subscription found", { 
        id: existingSub.id, 
        status: existingSub.status, 
        plan: existingSub.plan 
      });
      
      // If already has active or trialing subscription, don't overwrite
      if (existingSub.status === 'active' || existingSub.status === 'trialing') {
        logStep("User already has active subscription, skipping trial creation");
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User already has active subscription',
            existing: true,
            plan: existingSub.plan
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Calculate trial end date (7 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Upsert subscription with trial status
    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: planId,
        status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
        billing_required: true,
        account_type: 'self_registered',
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });

    if (subscriptionError) {
      logStep("Error upserting subscription", { error: subscriptionError.message });
      throw new Error(`Failed to start trial: ${subscriptionError.message}`);
    }

    logStep("Trial started successfully", { 
      userId, 
      planId, 
      trialEndsAt: trialEndsAt.toISOString() 
    });

    // Get user's full name from profile for welcome email
    let userName = 'usuário';
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileData?.full_name) {
      userName = profileData.full_name.split(' ')[0]; // First name only
    }

    // Send welcome email with trial info
    if (userEmail) {
      try {
        logStep("Sending welcome email", { userEmail, userName });
        
        const planNames: Record<string, string> = {
          lite: 'Lite',
          pro: 'Pro',
          business: 'Business'
        };
        
        const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
          body: {
            to: userEmail,
            toName: userName,
            template: 'welcome',
            language: 'pt-BR',
            variables: {
              name: userName,
              planName: planNames[planId] || planId,
              trialDays: '7',
              trialEndDate: trialEndsAt.toLocaleDateString('pt-BR'),
              ctaUrl: 'https://app.omniseen.app/app/dashboard'
            },
            userId
          }
        });

        if (emailError) {
          logStep("Error sending welcome email (non-blocking)", { error: emailError.message });
        } else {
          logStep("Welcome email sent successfully");
        }
      } catch (emailErr) {
        logStep("Error sending welcome email (non-blocking)", { error: String(emailErr) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        trialEndsAt: trialEndsAt.toISOString(),
        plan: planId,
        daysRemaining: 7
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
