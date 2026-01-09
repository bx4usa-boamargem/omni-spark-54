import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveCacheRequest {
  cache_type: 'article' | 'image' | 'seo';
  content_hash: string;
  prompt_text: string;
  response_data: unknown;
  model_used: string;
  tokens_used?: number;
  estimated_cost_usd?: number;
  blog_id?: string;
  user_id?: string;
}

// Define expiration based on cache type
function getExpiration(cacheType: string): Date {
  const now = new Date();
  switch (cacheType) {
    case 'article':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    case 'image':
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    case 'seo':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      cache_type,
      content_hash,
      prompt_text,
      response_data,
      model_used,
      tokens_used = 0,
      estimated_cost_usd = 0,
      blog_id,
      user_id,
    }: SaveCacheRequest = await req.json();

    if (!cache_type || !content_hash || !response_data) {
      return new Response(
        JSON.stringify({ error: 'cache_type, content_hash, and response_data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresAt = getExpiration(cache_type);
    console.log(`Saving cache for type: ${cache_type}, hash: ${content_hash}, expires: ${expiresAt.toISOString()}`);

    // Upsert cache entry
    const { data, error } = await supabase
      .from("ai_content_cache")
      .upsert({
        cache_type,
        content_hash,
        prompt_text,
        response_data,
        model_used,
        tokens_saved: tokens_used,
        cost_saved_usd: estimated_cost_usd,
        blog_id: blog_id || null,
        user_id: user_id || null,
        expires_at: expiresAt.toISOString(),
        hits: 0,
      }, {
        onConflict: 'cache_type,content_hash',
      })
      .select()
      .single();

    if (error) {
      console.error("Cache save error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cache saved successfully: ${data.id}`);
    return new Response(
      JSON.stringify({
        success: true,
        cache_id: data.id,
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in save-cache:', error);
    const message = error instanceof Error ? error.message : 'Cache save failed';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
