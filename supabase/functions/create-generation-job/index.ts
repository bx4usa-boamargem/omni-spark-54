// supabase/functions/create-generation-job/index.ts
// Entry point v2 — cria jobs no Jobs Engine via RPC
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createServiceClient,
  buildArticleGraph,
  logJobEvent,
  type ArticlePlanInput,
  type FunnelStage,
} from "../_shared/jobsEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerationInput {
  keyword: string;
  blog_id: string;
  country: string;
  city?: string;
  state?: string;
  language: string;
  niche: string;
  job_type: 'article' | 'super_page';
  intent: 'informational' | 'commercial' | 'transactional' | 'service';
  target_words: number;
  image_count: number;
  funnel_stage?: FunnelStage;
  cache_id?: string;
  section_count?: number;
  brand_voice?: { tone: string; person: string; avoid?: string[] };
  business?: { name: string; phone?: string; whatsapp?: string; website?: string; services?: string[] };
  layout_preferences?: { use_tables: boolean; use_callouts: boolean; use_lists: boolean; use_key_takeaways: boolean };
}

function validateInput(body: Record<string, unknown>): { valid: boolean; input?: GenerationInput; error?: string } {
  const keyword = body.keyword as string;
  const blog_id = body.blog_id as string;

  if (!keyword || typeof keyword !== 'string' || keyword.trim().length < 2) {
    return { valid: false, error: 'keyword is required (min 2 chars)' };
  }
  if (!blog_id || typeof blog_id !== 'string') {
    return { valid: false, error: 'blog_id is required' };
  }

  const input: GenerationInput = {
    keyword: keyword.trim(),
    blog_id,
    country: (body.country as string) || 'BR',
    city: (body.city as string) || undefined,
    state: (body.state as string) || undefined,
    language: (body.language as string) || 'pt-BR',
    niche: (body.niche as string) || 'default',
    job_type: (body.job_type as 'article' | 'super_page') || 'article',
    intent: (body.intent as GenerationInput['intent']) || 'informational',
    target_words: Math.max(800, Math.min(5000, Number(body.target_words) || 2500)),
    image_count: Math.max(1, Math.min(10, Number(body.image_count) || 4)),
    funnel_stage: (body.funnel_stage as FunnelStage) || 'topo',
    cache_id: body.cache_id as string,
    section_count: Math.max(2, Math.min(8, Number(body.section_count) || 3)),
    brand_voice: body.brand_voice as GenerationInput['brand_voice'],
    business: body.business as GenerationInput['business'],
    layout_preferences: (body.layout_preferences as GenerationInput['layout_preferences']) || {
      use_tables: true, use_callouts: true, use_lists: true, use_key_takeaways: true,
    },
  };

  return { valid: true, input };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createServiceClient();

  // Auth-aware client for user validation
  const authClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Validate input
    const body = await req.json();
    const validation = validateInput(body);
    if (!validation.valid || !validation.input) {
      return new Response(JSON.stringify({ error: `VALIDATION_FAILED: ${validation.error}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const input = validation.input;

    // 3. Check blog ownership
    const { data: blog, error: blogError } = await supabase
      .from('blogs').select('id, user_id').eq('id', input.blog_id).maybeSingle();

    if (blogError || !blog) {
      return new Response(JSON.stringify({ error: "Blog not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Concurrent job limit (max 5 via Jobs Engine)
    const { count: runningCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.id)
      .in('status', ['queued', 'running']);

    if ((runningCount || 0) >= 15) {
      return new Response(JSON.stringify({
        error: "MAX_CONCURRENT_JOBS: Too many jobs in queue. Wait for some to complete."
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Determine cache_id (lookup or create)
    let cacheId = input.cache_id;
    if (!cacheId && input.city) {
      const { data: cached } = await supabase
        .from('market_radar_cache')
        .select('id')
        .ilike('segment', input.niche)
        .ilike('city', input.city)
        .ilike('country', input.country)
        .eq('radar_status', 'ready')
        .maybeSingle();

      cacheId = cached?.id;
    }

    // 6. Feature flag: check if DAG pipeline is enabled
    const { data: useDag } = await supabase.rpc('should_use_dag', {
      p_tenant_id: user.id,
      p_blog_id: input.blog_id,
    });

    const fullPayload = {
      tenant_id: user.id,
      blog_id: input.blog_id,
      keyword: input.keyword,
      city: input.city,
      cache_id: cacheId || '',
      funnel_stage: input.funnel_stage || 'topo',
      country: input.country,
      language: input.language,
      niche: input.niche,
      intent: input.intent,
      target_words: input.target_words,
      image_count: input.image_count,
      brand_voice: input.brand_voice,
      business: input.business,
      layout_preferences: input.layout_preferences,
    };

    if (useDag === true) {
      // ── DAG Pipeline (novo) ───────────────────────
      const graphId = await buildArticleGraph(
        supabase,
        user.id,
        fullPayload as unknown as ArticlePlanInput,
        input.section_count || 3,
      );

      console.log(`[CREATE_JOB] ✅ DAG Graph ${graphId} created for user ${user.id} | keyword: "${input.keyword}"`);

      // Fire-and-forget: invoke jobs-runner
      supabase.functions.invoke('jobs-runner', { body: {} })
        .then(() => console.log(`[CREATE_JOB] jobs-runner invoked for graph ${graphId}`))
        .catch(err => console.error('[CREATE_JOB] Failed to invoke jobs-runner:', err));

      return new Response(
        JSON.stringify({
          success: true,
          pipeline: 'dag',
          graph_id: graphId,
          status: 'queued',
          message: 'DAG pipeline created. Track via realtime on job_events.',
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // ── Monolítico (legacy fallback) ──────────────
      console.log(`[CREATE_JOB] 📦 Using monolithic pipeline for user ${user.id} | keyword: "${input.keyword}"`);

      const { data: invokeData, error: invokeError } = await supabase.functions.invoke(
        'orchestrate-generation',
        { body: fullPayload }
      );

      if (invokeError) {
        console.error('[CREATE_JOB] orchestrate-generation error:', invokeError);
        return new Response(
          JSON.stringify({ error: `ORCHESTRATION_FAILED: ${invokeError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          pipeline: 'monolithic',
          data: invokeData,
          message: 'Article generation started via legacy pipeline.',
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[CREATE_JOB] Fatal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
