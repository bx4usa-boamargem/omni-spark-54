import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METRIC_LABELS: Record<string, string> = {
  scroll_depth: "Profundidade de Scroll",
  read_rate: "Taxa de Leitura Completa",
  time_on_page: "Tempo na Página",
  cta_rate: "Taxa de Cliques em CTA",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all active reading goals
    const { data: goals, error: goalsError } = await supabase
      .from("reading_goals")
      .select("*")
      .eq("is_active", true);

    if (goalsError) throw goalsError;
    if (!goals || goals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active goals to check" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const alertsCreated: string[] = [];

    // Group goals by blog
    const goalsByBlog: Record<string, typeof goals> = {};
    for (const goal of goals) {
      if (!goalsByBlog[goal.blog_id]) goalsByBlog[goal.blog_id] = [];
      goalsByBlog[goal.blog_id].push(goal);
    }

    // Check each blog's goals
    for (const blogId of Object.keys(goalsByBlog)) {
      const blogGoals = goalsByBlog[blogId];
      // Fetch recent analytics (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get scroll depth data
      const { data: scrollData } = await supabase
        .from("article_analytics")
        .select("scroll_depth, time_on_page")
        .eq("blog_id", blogId)
        .gte("created_at", yesterday);

      // Get funnel events for CTA and read rates
      const { data: funnelData } = await supabase
        .from("funnel_events")
        .select("event_type")
        .eq("blog_id", blogId)
        .gte("created_at", yesterday);

      // Calculate metrics
      let scrollDepthAvg = 0;
      let timeOnPageAvg = 0;
      let ctaRate = 0;
      let readRate = 0;

      if (scrollData && scrollData.length > 0) {
        const depths = scrollData.map((s) => s.scroll_depth || 0);
        scrollDepthAvg = depths.reduce((a, b) => a + b, 0) / depths.length;

        const times = scrollData.map((s) => s.time_on_page || 0).filter((t) => t > 0);
        if (times.length > 0) {
          timeOnPageAvg = times.reduce((a, b) => a + b, 0) / times.length;
        }
      }

      if (funnelData && funnelData.length > 0) {
        const pageEnters = funnelData.filter((e) => e.event_type === "page_enter").length;
        const ctaClicks = funnelData.filter((e) => e.event_type === "cta_click").length;
        const scroll100 = funnelData.filter((e) => e.event_type === "scroll_100").length;

        if (pageEnters > 0) {
          ctaRate = (ctaClicks / pageEnters) * 100;
          readRate = (scroll100 / pageEnters) * 100;
        }
      }

      const metricValues: Record<string, number> = {
        scroll_depth: scrollDepthAvg,
        read_rate: readRate,
        time_on_page: timeOnPageAvg,
        cta_rate: ctaRate,
      };

      // Check each goal
      for (const goal of blogGoals) {
        const currentValue = metricValues[goal.metric_type];

        // Check if below threshold
        if (currentValue < goal.alert_threshold) {
          // Check if we already created an alert today
          const today = new Date().toISOString().split("T")[0];
          const { data: existingAlerts } = await supabase
            .from("reading_goal_alerts")
            .select("id")
            .eq("goal_id", goal.id)
            .gte("created_at", today);

          if (existingAlerts && existingAlerts.length > 0) {
            continue; // Already alerted today
          }

          // Create alert
          const message = `⚠️ ${METRIC_LABELS[goal.metric_type]} caiu para ${Math.round(currentValue)}% (meta: ${goal.target_value}%, alerta: ${goal.alert_threshold}%)`;

          await supabase.from("reading_goal_alerts").insert({
            goal_id: goal.id,
            user_id: goal.user_id,
            current_value: Math.round(currentValue),
            message,
          });

          // Create in-app notification if enabled
          if (goal.notify_in_app) {
            await supabase.from("opportunity_notification_history").insert({
              user_id: goal.user_id,
              blog_id: blogId,
              opportunity_id: blogId, // Placeholder
              notification_type: "reading_goal",
              title: `Meta de ${METRIC_LABELS[goal.metric_type]} não atingida`,
              message,
            });
          }

          alertsCreated.push(`${METRIC_LABELS[goal.metric_type]} for blog ${blogId}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertsCreated,
        goalsChecked: goals.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking reading goals:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
