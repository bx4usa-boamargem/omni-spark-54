import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CacheRequest {
  cache_type: 'article' | 'image' | 'seo';
  prompt_text: string;
  blog_id?: string;
}

// Generate a normalized hash for cache lookup
function generateHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cache_type, prompt_text, blog_id }: CacheRequest = await req.json();

    if (!cache_type || !prompt_text) {
      return new Response(
        JSON.stringify({ error: 'cache_type and prompt_text are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentHash = generateHash(prompt_text);
    console.log(`Checking cache for type: ${cache_type}, hash: ${contentHash}`);

    // Check for exact match
    const { data: cacheHit, error } = await supabase
      .from("ai_content_cache")
      .select("*")
      .eq("cache_type", cache_type)
      .eq("content_hash", contentHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("Cache lookup error:", error);
      return new Response(
        JSON.stringify({ hit: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (cacheHit) {
      console.log(`Cache HIT for ${cache_type}: ${contentHash}`);
      
      // Increment hit counter
      await supabase
        .from("ai_content_cache")
        .update({ hits: (cacheHit.hits || 0) + 1 })
        .eq("id", cacheHit.id);

      return new Response(
        JSON.stringify({
          hit: true,
          cache_id: cacheHit.id,
          response_data: cacheHit.response_data,
          model_used: cacheHit.model_used,
          tokens_saved: cacheHit.tokens_saved,
          cost_saved_usd: cacheHit.cost_saved_usd,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cache MISS for ${cache_type}: ${contentHash}`);
    return new Response(
      JSON.stringify({ hit: false, content_hash: contentHash }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in check-cache:', error);
    const message = error instanceof Error ? error.message : 'Cache check failed';
    return new Response(
      JSON.stringify({ error: message, hit: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
