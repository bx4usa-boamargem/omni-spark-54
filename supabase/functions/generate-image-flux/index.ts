import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FluxImageRequest {
  prompt: string;
  model?: "FLUX.1-schnell" | "FLUX.1-dev";
  context?: string;
  articleTheme?: string;
  user_id?: string;
  blog_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hfToken = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    
    if (!hfToken) {
      console.error("HUGGING_FACE_ACCESS_TOKEN not configured");
      return new Response(
        JSON.stringify({ 
          error: "Hugging Face API not configured",
          details: "Please configure HUGGING_FACE_ACCESS_TOKEN in your secrets"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: FluxImageRequest = await req.json();
    const { prompt, model = "FLUX.1-schnell", context, articleTheme, user_id, blog_id } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating FLUX image with model: ${model}`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);

    const hf = new HfInference(hfToken);

    const modelName = model === "FLUX.1-dev" 
      ? "black-forest-labs/FLUX.1-dev" 
      : "black-forest-labs/FLUX.1-schnell";

    // Enhance prompt with context if provided
    let enhancedPrompt = prompt;
    if (context) {
      enhancedPrompt = `${prompt}. Context: ${context}`;
    }
    if (articleTheme) {
      enhancedPrompt = `${enhancedPrompt}. Theme: ${articleTheme}`;
    }

    const startTime = Date.now();
    
    const image = await hf.textToImage({
      inputs: enhancedPrompt,
      model: modelName,
    });

    const generationTime = Date.now() - startTime;
    console.log(`Image generated in ${generationTime}ms`);

    // Convert blob to base64
    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const imageData = `data:image/png;base64,${base64}`;

    // Log consumption if user_id is provided
    if (user_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch pricing for FLUX model
        const { data: pricing } = await supabase
          .from("model_pricing")
          .select("cost_per_image")
          .eq("model_name", modelName)
          .eq("is_active", true)
          .maybeSingle();

        const costPerImage = pricing?.cost_per_image || (model === "FLUX.1-dev" ? 0.025 : 0.003);

        await supabase.from("consumption_logs").insert({
          user_id,
          blog_id: blog_id || null,
          action_type: "image_generation",
          action_description: `FLUX image generation (${model})`,
          model_used: modelName,
          input_tokens: 0,
          output_tokens: 0,
          images_generated: 1,
          estimated_cost_usd: costPerImage,
          metadata: {
            provider: "huggingface",
            model: model,
            generation_time_ms: generationTime,
            prompt_length: prompt.length,
          },
        });

        console.log(`Logged FLUX consumption for user ${user_id}: $${costPerImage}`);
      } catch (logError) {
        console.error("Error logging consumption:", logError);
        // Don't fail the request if logging fails
      }
    }

    return new Response(
      JSON.stringify({ 
        image: imageData,
        model: modelName,
        generation_time_ms: generationTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating FLUX image:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
