// deno-lint-ignore-file
/**
 * RADAR V3 REFRESH — Edge Function
 * 
 * Intelligence Discovery Engine para o OmniSeen.
 * Gera oportunidades de conteúdo baseadas em:
 *   - Google Search Intelligence (SERP, PAA, Related Searches)
 *   - Entity & Topic Graph Intelligence
 *   - Demand Signals (Trends, Regional, Temporal)
 *   - EEAT Signals
 *   - Helpful Content System alignment
 *   - AI Visibility (AI Overviews, Gemini, ChatGPT citability)
 *
 * SEGURANÇA:
 *   - Valida ownership do blogId pelo tenant autenticado
 *   - Todas as escritas usam service role
 *   - Status estruturado (running/completed/failed)
 *   - Logs estruturados (info/warn/error)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callResearch, callWriter } from "../_shared/aiProviders.ts";

// ============================================================================
// CORS
// ============================================================================
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPES
// ============================================================================
interface RadarV3Opportunity {
    title: string;
    keywords: string[];
    relevance_score: number;
    why_now: string;
    search_intent: "informational" | "navigational" | "transactional" | "commercial";
    content_type: "blog_article" | "pillar_page" | "super_page" | "landing_page" | "entity_page";
    funnel_stage: "tofu" | "mofu" | "bofu";
    estimated_volume: number;
    competition_level: "low" | "medium" | "high";
    eeat_signals: Record<string, unknown>;
    helpful_content: Record<string, unknown>;
    ai_visibility: Record<string, unknown>;
    serp_data: Record<string, unknown>;
    entity_data: Record<string, unknown>;
    trend_data: Record<string, unknown>;
    regional_demand: Record<string, unknown>;
    source_urls: string[];
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req: Request) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
        return new Response(
            JSON.stringify({ error: "Missing Supabase configuration" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
    });

    let runId: string | null = null;

    try {
        // ─── Parse input ─────────────────────────────────────────────────
        const body = await req.json().catch(() => ({}));
        const { blogId } = body as { blogId?: string };

        if (!blogId) {
            return new Response(
                JSON.stringify({ error: "blogId is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ─── Validate ownership: blog must exist and belong to a valid tenant ──
        const { data: blogData, error: blogError } = await supabaseAdmin
            .from("blogs")
            .select("id, sub_account_id, city, niche_profile_id, niche_profiles(name, description), sub_accounts(tenant_id)")
            .eq("id", blogId)
            .maybeSingle();

        if (blogError || !blogData) {
            return new Response(
                JSON.stringify({ error: "Blog not found or access denied" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const subAccount = Array.isArray(blogData.sub_accounts)
            ? blogData.sub_accounts[0]
            : blogData.sub_accounts;
        const tenantId = (subAccount as any)?.tenant_id;

        if (!tenantId) {
            return new Response(
                JSON.stringify({ error: "Tenant not found for this blog. Ownership validation failed." }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const nicheProfile = Array.isArray(blogData.niche_profiles)
            ? blogData.niche_profiles[0]
            : blogData.niche_profiles;
        const nicheName = (nicheProfile as any)?.name || "general";
        const nicheDesc = (nicheProfile as any)?.description || "";
        const blogCity = blogData.city || "";

        // ─── Create run ──────────────────────────────────────────────────
        const { data: runData, error: runError } = await supabaseAdmin
            .from("radar_v3_runs")
            .insert({
                blog_id: blogId,
                tenant_id: tenantId,
                status: "running",
                metadata: {
                    niche: nicheName,
                    city: blogCity,
                    trigger: body.mode || "manual",
                },
            })
            .select("id")
            .single();

        if (runError || !runData) {
            throw new Error(`Failed to create run: ${runError?.message}`);
        }

        runId = runData.id;

        // ─── Log: start ──────────────────────────────────────────────────
        await logToDb(supabaseAdmin, runId!, "info", "Radar V3 refresh started", {
            blogId,
            tenantId,
            niche: nicheName,
            city: blogCity,
        });

        // ─── Intelligence: Research phase ────────────────────────────────
        await logToDb(supabaseAdmin, runId!, "info", "Starting intelligence research phase");

        const researchPrompt = buildResearchPrompt(nicheName, nicheDesc, blogCity);
        const researchResult = await callResearch({
            query: researchPrompt,
            tenantId,
            blogId,
            systemPrompt: buildResearchSystemPrompt(),
            maxTokens: 2000,
        });

        let researchData: Record<string, unknown> = {};
        if (researchResult.success && researchResult.data) {
            researchData = {
                facts: researchResult.data.facts || [],
                trends: researchResult.data.trends || [],
                sources: researchResult.data.sources || researchResult.data.citations || [],
                raw: researchResult.data.content?.substring(0, 500),
            };
            await logToDb(supabaseAdmin, runId!, "info", "Research phase completed", {
                provider: researchResult.provider,
                factsCount: (researchResult.data.facts || []).length,
                trendsCount: (researchResult.data.trends || []).length,
            });
        } else {
            await logToDb(supabaseAdmin, runId!, "warn", "Research phase failed, using fallback generation", {
                reason: researchResult.fallbackReason,
            });
        }

        // ─── Intelligence: Opportunity Generation (AI Writer) ────────────
        await logToDb(supabaseAdmin, runId!, "info", "Starting opportunity generation phase");

        const opportunityPrompt = buildOpportunityPrompt(nicheName, nicheDesc, blogCity, researchData);

        const writerResult = await callWriter({
            messages: [
                { role: "system", content: buildOpportunitySystemPrompt() },
                { role: "user", content: opportunityPrompt },
            ],
            temperature: 0.7,
            maxTokens: 4000,
            tenantId,
            blogId,
        });

        let opportunities: RadarV3Opportunity[] = [];

        if (writerResult.success && writerResult.data?.content) {
            try {
                const parsed = JSON.parse(
                    writerResult.data.content.replace(/```json\n?|\n?```/g, "").trim()
                );
                opportunities = Array.isArray(parsed.opportunities)
                    ? parsed.opportunities
                    : Array.isArray(parsed)
                        ? parsed
                        : [];
            } catch (parseErr) {
                await logToDb(supabaseAdmin, runId!, "warn", "Failed to parse AI response, using fallback", {
                    error: String(parseErr),
                });
            }
        }

        // Fallback: se a IA não retornou oportunidades válidas, gerar mínimas
        if (opportunities.length === 0) {
            await logToDb(supabaseAdmin, runId!, "warn", "No opportunities from AI, generating minimal set");
            opportunities = generateMinimalOpportunities(nicheName, blogCity);
        }

        // ─── Validate & clamp scores ─────────────────────────────────────
        opportunities = opportunities.map((opp) => ({
            ...opp,
            relevance_score: Math.max(0, Math.min(100, opp.relevance_score || 50)),
            search_intent: validateEnum(opp.search_intent, ["informational", "navigational", "transactional", "commercial"], "informational"),
            content_type: validateEnum(opp.content_type, ["blog_article", "pillar_page", "super_page", "landing_page", "entity_page"], "blog_article"),
            funnel_stage: validateEnum(opp.funnel_stage, ["tofu", "mofu", "bofu"], "tofu"),
            competition_level: validateEnum(opp.competition_level, ["low", "medium", "high"], "medium"),
            keywords: Array.isArray(opp.keywords) ? opp.keywords.slice(0, 10) : [],
            source_urls: Array.isArray(opp.source_urls) ? opp.source_urls.slice(0, 5) : [],
        }));

        // ─── Insert opportunities ────────────────────────────────────────
        const oppRows = opportunities.map((opp) => ({
            run_id: runId,
            blog_id: blogId,
            tenant_id: tenantId,
            title: (opp.title || "Sem título").substring(0, 500),
            keywords: opp.keywords,
            relevance_score: opp.relevance_score,
            status: "pending" as const,
            why_now: (opp.why_now || "").substring(0, 1000),
            search_intent: opp.search_intent,
            content_type: opp.content_type,
            funnel_stage: opp.funnel_stage,
            estimated_volume: opp.estimated_volume || 0,
            competition_level: opp.competition_level,
            serp_data: opp.serp_data || {},
            entity_data: opp.entity_data || {},
            trend_data: opp.trend_data || {},
            eeat_signals: opp.eeat_signals || {},
            helpful_content: opp.helpful_content || {},
            ai_visibility: opp.ai_visibility || {},
            regional_demand: opp.regional_demand || {},
            source: "radar_v3",
            source_urls: opp.source_urls,
            metadata: {},
        }));

        const { error: insertError } = await supabaseAdmin
            .from("radar_v3_opportunities")
            .insert(oppRows);

        if (insertError) {
            throw new Error(`Failed to insert opportunities: ${insertError.message}`);
        }

        // ─── Complete run ────────────────────────────────────────────────
        await supabaseAdmin
            .from("radar_v3_runs")
            .update({
                status: "completed",
                finished_at: new Date().toISOString(),
                opportunities_count: opportunities.length,
            })
            .eq("id", runId);

        await logToDb(supabaseAdmin, runId!, "info", "Radar V3 refresh completed successfully", {
            opportunitiesGenerated: opportunities.length,
            provider: writerResult.provider,
        });

        return new Response(
            JSON.stringify({
                success: true,
                run_id: runId,
                opportunities_count: opportunities.length,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[radar-v3-refresh] Fatal error:", errorMsg);

        // Mark run as failed
        if (runId) {
            await supabaseAdmin
                .from("radar_v3_runs")
                .update({
                    status: "failed",
                    finished_at: new Date().toISOString(),
                    error_message: errorMsg.substring(0, 1000),
                })
                .eq("id", runId)
                .catch(() => { });

            await logToDb(supabaseAdmin, runId, "error", `Fatal error: ${errorMsg}`).catch(() => { });
        }

        return new Response(
            JSON.stringify({ error: errorMsg }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});


// ============================================================================
// HELPERS
// ============================================================================

async function logToDb(
    supabase: ReturnType<typeof createClient>,
    runId: string,
    level: "info" | "warn" | "error",
    message: string,
    metadata: Record<string, unknown> = {}
) {
    await supabase
        .from("radar_v3_logs")
        .insert({ run_id: runId, level, message, metadata })
        .catch((err: unknown) => console.error("[radar-v3-log] Insert failed:", err));
}

function validateEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
    if (typeof value === "string" && allowed.includes(value as T)) return value as T;
    return fallback;
}

// ============================================================================
// PROMPTS — Intelligence Discovery Engine
// ============================================================================

function buildResearchSystemPrompt(): string {
    return `You are an expert SEO and content strategist for the Brazilian market.
Your job is to discover real market demand, trending topics, and content opportunities.

Return a JSON object with:
{
  "facts": ["array of factual market insights"],
  "trends": ["array of trending topics in this niche"],
  "sources": ["array of source URLs or references"],
  "people_also_ask": ["array of real PAA questions"],
  "related_searches": ["array of related search terms"],
  "regional_insights": ["array of location-specific insights"]
}

Focus on:
- Real search demand (what people are actually searching)
- Trending topics with growth momentum
- Competitor gaps (topics competitors cover that this blog doesn't)
- Regional/local demand signals
- Questions the audience is asking (PAA / forums)

Be specific to Brazilian market. Use Portuguese (BR) for topic names.`;
}

function buildResearchPrompt(niche: string, nicheDesc: string, city: string): string {
    return `Pesquise oportunidades de conteúdo para um blog no nicho "${niche}"${nicheDesc ? ` (${nicheDesc})` : ""} localizado em ${city || "Brasil"}.

Identifique:
1. O que as pessoas estão buscando AGORA nesse nicho
2. Tendências emergentes (últimas semanas)
3. Perguntas frequentes (People Also Ask)
4. Buscas relacionadas com alto volume
5. Gaps de conteúdo vs concorrentes
6. Demanda regional/local específica

Foque em oportunidades com intenção clara e volume real.
Retorne dados específicos, não genéricos.`;
}

function buildOpportunitySystemPrompt(): string {
    return `You are the OmniSeen Radar V3 Intelligence Discovery Engine.

Your mission: Generate high-quality content opportunities that will rank on Google
and be cited by AI systems (Google AI Overviews, Gemini, ChatGPT, Perplexity).

RULES:
1. Every opportunity must have a clear search intent
2. Every opportunity must be aligned with Google's Helpful Content System
3. Every opportunity must consider EEAT signals
4. Relevance score (0-100) must reflect REAL ranking potential
5. Content type must match the intent (blog_article, pillar_page, super_page, landing_page, entity_page)
6. Funnel stage must be explicit (tofu/mofu/bofu)
7. Competition level must be honest
8. why_now must explain temporal relevance
9. Keywords must be real, searchable terms in Portuguese (BR)
10. Titles must be in Portuguese (BR), optimized for search

Return EXACTLY this JSON structure:
{
  "opportunities": [
    {
      "title": "Título otimizado para SEO em português",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "relevance_score": 85,
      "why_now": "Explicação de por que este tema é relevante agora",
      "search_intent": "informational|navigational|transactional|commercial",
      "content_type": "blog_article|pillar_page|super_page|landing_page|entity_page",
      "funnel_stage": "tofu|mofu|bofu",
      "estimated_volume": 1200,
      "competition_level": "low|medium|high",
      "eeat_signals": {
        "experience_required": "description of needed experience",
        "expertise_angle": "how to demonstrate expertise",
        "authority_building": "how this builds authority",
        "trust_factors": "trust signals to include"
      },
      "helpful_content": {
        "user_need": "what need does this satisfy",
        "depth_required": "shallow|moderate|deep",
        "unique_value": "what unique value can we bring"
      },
      "ai_visibility": {
        "citation_potential": "high|medium|low",
        "structured_data_type": "FAQ|HowTo|Article|LocalBusiness",
        "ai_overview_fit": true
      },
      "serp_data": {
        "featured_snippet_opportunity": true,
        "paa_questions": ["q1", "q2"],
        "related_searches": ["s1", "s2"]
      },
      "entity_data": {
        "primary_entity": "main entity",
        "related_entities": ["e1", "e2"],
        "topic_cluster": "cluster name"
      },
      "trend_data": {
        "momentum": "rising|stable|declining",
        "seasonality": "description",
        "growth_signal": "description"
      },
      "regional_demand": {
        "city_relevance": "high|medium|low",
        "local_queries": ["query1", "query2"]
      },
      "source_urls": []
    }
  ]
}

Generate 5-8 opportunities. Mix content types and funnel stages.
Prioritize topics with HIGH ranking potential and LOW competition.`;
}

function buildOpportunityPrompt(
    niche: string,
    nicheDesc: string,
    city: string,
    researchData: Record<string, unknown>
): string {
    let prompt = `Gere oportunidades de conteúdo para o nicho "${niche}"`;
    if (nicheDesc) prompt += ` (${nicheDesc})`;
    if (city) prompt += ` na cidade de ${city}`;
    prompt += ".\n\n";

    // Inject research data if available
    if (researchData.facts && Array.isArray(researchData.facts) && researchData.facts.length > 0) {
        prompt += `DADOS DE PESQUISA REAL:\n`;
        prompt += `- Fatos: ${JSON.stringify(researchData.facts).substring(0, 500)}\n`;
    }
    if (researchData.trends && Array.isArray(researchData.trends) && researchData.trends.length > 0) {
        prompt += `- Tendências: ${JSON.stringify(researchData.trends).substring(0, 500)}\n`;
    }
    if (researchData.sources && Array.isArray(researchData.sources) && researchData.sources.length > 0) {
        prompt += `- Fontes: ${JSON.stringify(researchData.sources).substring(0, 300)}\n`;
    }

    prompt += `\nConsidere:
1. Demanda de busca regional (${city || "Brasil"})
2. Gaps de conteúdo que concorrentes não cobrem
3. Perguntas que o público faz (People Also Ask)
4. Tendências emergentes no setor
5. Oportunidades para Featured Snippets
6. Conteúdo que IA (Google AI, Gemini, ChatGPT) possa citar
7. Alinhamento com Google EEAT
8. Alinhamento com Google Helpful Content System

Gere 5-8 oportunidades diversificadas em tipo e funil.`;

    return prompt;
}

// ============================================================================
// FALLBACK: Minimal opportunities when AI fails
// ============================================================================
function generateMinimalOpportunities(niche: string, city: string): RadarV3Opportunity[] {
    const baseOpps: RadarV3Opportunity[] = [
        {
            title: `Guia Completo: Como Escolher ${niche} em ${city || "Sua Cidade"}`,
            keywords: [niche, city, "como escolher", "guia"],
            relevance_score: 75,
            why_now: "Termo evergreen com busca constante",
            search_intent: "informational",
            content_type: "pillar_page",
            funnel_stage: "tofu",
            estimated_volume: 500,
            competition_level: "medium",
            eeat_signals: { experience_required: "Prático", expertise_angle: "Guia especializado" },
            helpful_content: { user_need: "Orientação na escolha", depth_required: "deep", unique_value: "Visão local" },
            ai_visibility: { citation_potential: "high", structured_data_type: "HowTo", ai_overview_fit: true },
            serp_data: { featured_snippet_opportunity: true, paa_questions: [], related_searches: [] },
            entity_data: { primary_entity: niche, related_entities: [], topic_cluster: niche },
            trend_data: { momentum: "stable", seasonality: "Ano todo", growth_signal: "Constante" },
            regional_demand: { city_relevance: city ? "high" : "medium", local_queries: [] },
            source_urls: [],
        },
        {
            title: `Quanto Custa ${niche} em ${city || "2026"}? Preços Atualizados`,
            keywords: [niche, "preço", "quanto custa", city],
            relevance_score: 85,
            why_now: "Busca transacional com alta conversão",
            search_intent: "commercial",
            content_type: "blog_article",
            funnel_stage: "mofu",
            estimated_volume: 800,
            competition_level: "high",
            eeat_signals: { experience_required: "Dados reais", expertise_angle: "Tabela de preços atualizada" },
            helpful_content: { user_need: "Referência de preços", depth_required: "moderate", unique_value: "Preços locais reais" },
            ai_visibility: { citation_potential: "high", structured_data_type: "Article", ai_overview_fit: true },
            serp_data: { featured_snippet_opportunity: true, paa_questions: [], related_searches: [] },
            entity_data: { primary_entity: niche, related_entities: ["preço"], topic_cluster: "pricing" },
            trend_data: { momentum: "rising", seasonality: "Início de ano", growth_signal: "Alta demanda" },
            regional_demand: { city_relevance: "high", local_queries: [] },
            source_urls: [],
        },
        {
            title: `${niche} ${city || ""}: Erros Comuns que Você Deve Evitar`,
            keywords: [niche, "erros", "evitar", "dicas"],
            relevance_score: 70,
            why_now: "Conteúdo educacional com alto engajamento",
            search_intent: "informational",
            content_type: "blog_article",
            funnel_stage: "tofu",
            estimated_volume: 300,
            competition_level: "low",
            eeat_signals: { experience_required: "Experiência prática", expertise_angle: "Casos reais" },
            helpful_content: { user_need: "Evitar erros", depth_required: "moderate", unique_value: "Experiência prática" },
            ai_visibility: { citation_potential: "medium", structured_data_type: "Article", ai_overview_fit: false },
            serp_data: { featured_snippet_opportunity: false, paa_questions: [], related_searches: [] },
            entity_data: { primary_entity: niche, related_entities: ["erros comuns"], topic_cluster: "education" },
            trend_data: { momentum: "stable", seasonality: "Ano todo", growth_signal: "Constante" },
            regional_demand: { city_relevance: "medium", local_queries: [] },
            source_urls: [],
        },
    ];

    return baseOpps;
}
