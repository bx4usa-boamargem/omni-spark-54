import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LandingEvent {
  session_id: string;
  visitor_id?: string;
  event_type: string;
  event_data?: Record<string, unknown>;
  page_section?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  device?: string;
  browser?: string;
  country?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const event: LandingEvent = await req.json();

    // Validate required fields
    if (!event.session_id || !event.event_type) {
      return new Response(
        JSON.stringify({ error: "session_id and event_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Valid event types
    const validEventTypes = [
      "page_view",
      "section_view", 
      "cta_click",
      "pricing_view",
      "plan_hover",
      "plan_select",
      "signup_start",
      "signup_complete",
      "demo_view",
      "scroll_depth"
    ];

    if (!validEventTypes.includes(event.event_type)) {
      console.warn(`Unknown event type: ${event.event_type}`);
    }

    // Insert event into database
    const { error } = await supabase.from("landing_page_events").insert({
      session_id: event.session_id,
      visitor_id: event.visitor_id,
      event_type: event.event_type,
      event_data: event.event_data || {},
      page_section: event.page_section,
      source: event.source,
      utm_source: event.utm_source,
      utm_medium: event.utm_medium,
      utm_campaign: event.utm_campaign,
      device: event.device,
      browser: event.browser,
      country: event.country,
    });

    if (error) {
      console.error("Error inserting event:", error);
      throw error;
    }

    console.log(`Tracked event: ${event.event_type} for session ${event.session_id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in track-landing:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
