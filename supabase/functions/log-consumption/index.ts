import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConsumptionRequest {
  user_id: string;
  blog_id?: string;
  action_type: "article_generation" | "ebook_generation" | "image_generation" | "seo_improvement" | "theme_suggestion" | "keyword_analysis";
  action_description?: string;
  model_used?: string;
  input_tokens?: number;
  output_tokens?: number;
  images_generated?: number;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ConsumptionRequest = await req.json();

    if (!body.user_id || !body.action_type) {
      return new Response(
        JSON.stringify({ error: "user_id and action_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pricing for the model used
    let costPerInputToken = 0;
    let costPerOutputToken = 0;
    let costPerImage = 0;

    if (body.model_used) {
      const { data: pricing } = await supabase
        .from("model_pricing")
        .select("cost_per_1k_input_tokens, cost_per_1k_output_tokens, cost_per_image")
        .eq("model_name", body.model_used)
        .eq("is_active", true)
        .maybeSingle();

      if (pricing) {
        costPerInputToken = pricing.cost_per_1k_input_tokens / 1000;
        costPerOutputToken = pricing.cost_per_1k_output_tokens / 1000;
        costPerImage = pricing.cost_per_image;
      }
    }

    // If no specific model pricing, use default Lovable AI pricing
    if (costPerInputToken === 0 && costPerOutputToken === 0) {
      // Default pricing for google/gemini-2.5-flash (Lovable AI default)
      costPerInputToken = 0.00000015; // $0.15 per 1M input tokens
      costPerOutputToken = 0.0000006; // $0.60 per 1M output tokens
      costPerImage = 0.02; // $0.02 per image
    }

    // Calculate estimated cost
    const inputCost = (body.input_tokens || 0) * costPerInputToken;
    const outputCost = (body.output_tokens || 0) * costPerOutputToken;
    const imageCost = (body.images_generated || 0) * costPerImage;
    const estimatedCost = inputCost + outputCost + imageCost;

    // Insert consumption log
    const { data: log, error: insertError } = await supabase
      .from("consumption_logs")
      .insert({
        user_id: body.user_id,
        blog_id: body.blog_id || null,
        action_type: body.action_type,
        action_description: body.action_description || null,
        model_used: body.model_used || "google/gemini-2.5-flash",
        input_tokens: body.input_tokens || 0,
        output_tokens: body.output_tokens || 0,
        images_generated: body.images_generated || 0,
        estimated_cost_usd: estimatedCost,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting consumption log:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log consumption", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Logged consumption for user ${body.user_id}: ${body.action_type}, cost: $${estimatedCost.toFixed(6)}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        log_id: log.id,
        estimated_cost_usd: estimatedCost 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in log-consumption:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
