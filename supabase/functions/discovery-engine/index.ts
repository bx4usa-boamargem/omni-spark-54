// ═══════════════════════════════════════════════════════════════════
// DISCOVERY ENGINE — Motor Independente de Descoberta de Mercado
// V1.0: Separação arquitetural Discovery / Content
//
// REGRAS:
// - Executa no máximo 1x por {segment + city} a cada 24h
// - Salva em market_radar_cache (UPSERT por segment+city)
// - NUNCA é chamado pelo Content Engine
// - Aceitável ser chamado por: RadarV3Page, cron jobs, admin triggers
//
// PIPELINE:
//   1. Verificar TTL do cache (segment + city)
//   2. Se válido → retornar cache (sem re-execução)
//   3. Se expirado/inexistente:
//      a. SERP scan (via analyze-serp)
//      b. Entity analysis
//      c. Trend detection
//      d. Competitor analysis
//   4. Salvar em market_radar_cache
// ═══════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiscoveryRequest {
  segment: string;
  city: string;
  country?: string;
  blogId?: string;
  forceRefresh?: boolean;
}

interface MarketRadarCache {
  id: string;
  segment: string;
  city: string;
  country: string;
  radar_status: string;
  expires_at: string;
  created_at: string;
  services: string[] | null;
  serp_results: Record<string, unknown> | null;
  entities: Record<string, unknown>[] | null;
  questions: string[] | null;
  opportunity_scores: Record<string, unknown> | null;
  competitors: Record<string, unknown>[] | null;
  avg_rating: number | null;
  avg_reviews: number | null;
  neighborhoods: string[] | null;
  popular_queries: string[] | null;
  content_gaps: string[] | null;
  demand_signals: Record<string, unknown> | null;
}

const TTL_HOURS = 24;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as DiscoveryRequest;
    const {
      segment,
      city,
      country = "BR",
      blogId,
      forceRefresh = false,
    } = body;

    if (!segment || !city) {
      return new Response(
        JSON.stringify({ error: "segment and city are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const segmentNorm = segment.toLowerCase().trim();
    const cityNorm = city.toLowerCase().trim();

    console.log(`[DISCOVERY-ENGINE] Request: segment="${segmentNorm}", city="${cityNorm}", forceRefresh=${forceRefresh}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Verificar TTL — se cache válido, retornar imediatamente
    // ─────────────────────────────────────────────────────────────
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("market_radar_cache")
        .select("*")
        .ilike("segment", segmentNorm)
        .ilike("city", cityNorm)
        .eq("radar_status", "ready")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        console.log(`[DISCOVERY-ENGINE] Cache HIT — expires_at: ${cached.expires_at}`);
        return new Response(
          JSON.stringify({
            source: "cache",
            cache_hit: true,
            expires_at: cached.expires_at,
            data: cached,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[DISCOVERY-ENGINE] Cache MISS — executando pipeline completo`);
    } else {
      console.log(`[DISCOVERY-ENGINE] forceRefresh=true — ignorando cache`);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Criar/atualizar registro com status "running"
    // ─────────────────────────────────────────────────────────────
    const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { data: runRecord, error: upsertError } = await supabase
      .from("market_radar_cache")
      .upsert({
        segment: segmentNorm,
        city: cityNorm,
        country: country.toLowerCase(),
        radar_status: "running",
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "segment,city,country",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();

    if (upsertError) {
      console.error(`[DISCOVERY-ENGINE] Failed to create run record:`, upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to initialize discovery run", details: upsertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cacheId = runRecord.id;
    console.log(`[DISCOVERY-ENGINE] Run record created: ${cacheId}`);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Pipeline de Descoberta
    // ─────────────────────────────────────────────────────────────

    const marketData: Partial<MarketRadarCache> = {
      id: cacheId,
      segment: segmentNorm,
      city: cityNorm,
      country: country.toLowerCase(),
      radar_status: "ready",
      expires_at: expiresAt,
    };

    // 3a. SERP Scan
    try {
      console.log(`[DISCOVERY-ENGINE] Running SERP scan...`);
      const keyword = `${segment} ${city}`;
      const serpResponse = await supabase.functions.invoke("analyze-serp", {
        body: { keyword, blogId: blogId || "discovery", forceRefresh: false },
      });

      if (!serpResponse.error && serpResponse.data) {
        // analyze-serp salva em serp_analysis_cache e retorna a matrix
        const serpResult = serpResponse.data;
        marketData.serp_results = serpResult.matrix || serpResult;

        // Extrair entidades e perguntas da matrix SERP se disponível
        const matrix = serpResult.matrix || {};
        const commonTerms: string[] = matrix.commonTerms || [];
        const questions: string[] = matrix.questions || [];
        const entities = commonTerms.slice(0, 20).map((term: string) => ({
          name: term,
          type: "term",
          source: "serp",
        }));

        if (entities.length > 0) marketData.entities = entities;
        if (questions.length > 0) marketData.questions = questions;

        // Extrair oportunidades de conteúdo
        const opportunities = serpResult.opportunityScores || serpResult.opportunity_scores;
        if (opportunities) marketData.opportunity_scores = opportunities;

        console.log(`[DISCOVERY-ENGINE] SERP scan complete — ${commonTerms.length} terms, ${questions.length} questions`);
      } else {
        console.warn(`[DISCOVERY-ENGINE] SERP scan returned no data:`, serpResponse.error);
      }
    } catch (serpError) {
      console.error(`[DISCOVERY-ENGINE] SERP scan failed:`, serpError);
      // Não falha — continua com os outros passos
    }

    // 3b. Competitor Analysis
    try {
      console.log(`[DISCOVERY-ENGINE] Running competitor analysis...`);
      const competitorResponse = await supabase.functions.invoke("analyze-competitors", {
        body: { blogId: blogId || "discovery", segment, city },
      });

      if (!competitorResponse.error && competitorResponse.data) {
        const compData = competitorResponse.data;
        if (compData.gaps || compData.competitors) {
          marketData.competitors = compData.competitors || compData.gaps || [];
        }
        console.log(`[DISCOVERY-ENGINE] Competitor analysis complete`);
      }
    } catch (compError) {
      console.error(`[DISCOVERY-ENGINE] Competitor analysis failed:`, compError);
      // Não falha — continua
    }

    // 3c. Trend Detection
    try {
      console.log(`[DISCOVERY-ENGINE] Running trend detection...`);
      const trendsResponse = await supabase.functions.invoke("fetch-real-trends", {
        body: { keyword: `${segment} ${city}`, segment, city },
      });

      if (!trendsResponse.error && trendsResponse.data) {
        const trendsData = trendsResponse.data;
        // Enriquecer demand_signals com dados de tendências
        marketData.demand_signals = {
          ...(marketData.demand_signals || {}),
          trends: trendsData.trends || trendsData,
          trend_direction: trendsData.direction || "stable",
        };
        console.log(`[DISCOVERY-ENGINE] Trend detection complete`);
      }
    } catch (trendError) {
      console.error(`[DISCOVERY-ENGINE] Trend detection failed:`, trendError);
      // Não falha — continua
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Salvar resultado em market_radar_cache
    // ─────────────────────────────────────────────────────────────
    const { error: saveError } = await supabase
      .from("market_radar_cache")
      .update({
        radar_status: "ready",
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        serp_results: marketData.serp_results || null,
        entities: marketData.entities || null,
        questions: marketData.questions || null,
        opportunity_scores: marketData.opportunity_scores || null,
        competitors: marketData.competitors || null,
        demand_signals: marketData.demand_signals || null,
      })
      .eq("id", cacheId);

    if (saveError) {
      console.error(`[DISCOVERY-ENGINE] Failed to save results:`, saveError);
      return new Response(
        JSON.stringify({ error: "Discovery ran but failed to save results", details: saveError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[DISCOVERY-ENGINE] Discovery complete — saved to cache ${cacheId}`);

    return new Response(
      JSON.stringify({
        source: "fresh",
        cache_hit: false,
        cache_id: cacheId,
        expires_at: expiresAt,
        data: marketData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[DISCOVERY-ENGINE] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Discovery engine failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
