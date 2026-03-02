// deno-lint-ignore-file
/**
 * RADAR V3 MINIMAL — Edge Function
 *
 * Lightweight Discovery Engine (< 3 seconds, ZERO AI calls).
 *
 * ARCHITECTURE:
 *   Radar discovers → Article Engine thinks → Writer executes.
 *
 * DATA SOURCES:
 *   1. Google Custom Search (titles + snippets + related searches)
 *   2. Google Autocomplete (query expansion)
 *   3. Keyword seeds (generateAutoKeywords)
 *   4. Coverage gap detection (fuzzy token overlap vs existing articles)
 *
 * SCORING:
 *   confidence = freshness(0.4) + coverage_gap(0.4) + local_relevance(0.2)
 *
 * SECURITY:
 *   - Validates blog ownership via tenant_id
 *   - All writes use service role
 *   - Structured status (running/completed/failed)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchGoogleCustomSearchRaw, normalizeTop10Results } from "../_shared/googleSearch.ts";
import { generateAutoKeywords } from "../_shared/keywordGenerator.ts";

// ============================================================================
// CORS
// ============================================================================
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const t0 = Date.now();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
        return jsonRes({ error: "Missing Supabase configuration" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
    });

    let runId: string | null = null;

    try {
        // ─── 1. Parse & validate ─────────────────────────────────────────
        const body = await req.json().catch(() => ({}));
        const { blogId } = body as { blogId?: string };

        if (!blogId) return jsonRes({ error: "blogId is required" }, 400);

        // ─── 2. Ownership validation ─────────────────────────────────────
        const { data: blog, error: blogErr } = await supabase
            .from("blogs")
            .select("id, city, niche_profile_id, niche_profiles(name, description), sub_accounts(tenant_id)")
            .eq("id", blogId)
            .maybeSingle();

        if (blogErr || !blog) return jsonRes({ error: "Blog not found" }, 403);

        const sa = Array.isArray(blog.sub_accounts) ? blog.sub_accounts[0] : blog.sub_accounts;
        const tenantId = (sa as any)?.tenant_id;
        if (!tenantId) return jsonRes({ error: "Tenant validation failed" }, 403);

        const np = Array.isArray(blog.niche_profiles) ? blog.niche_profiles[0] : blog.niche_profiles;
        const niche = (np as any)?.name || "general";
        const nicheDesc = (np as any)?.description || "";
        const city = blog.city || "";

        // ─── 3. Create run ───────────────────────────────────────────────
        const { data: run, error: runErr } = await supabase
            .from("radar_v3_runs")
            .insert({
                blog_id: blogId,
                tenant_id: tenantId,
                status: "running",
                metadata: { niche, city, trigger: body.mode || "manual" },
            })
            .select("id")
            .single();

        if (runErr || !run) throw new Error(`Run creation failed: ${runErr?.message}`);
        runId = run.id;

        // ─── 4. Fetch existing articles (for coverage gap) ───────────────
        const { data: existingArticles } = await supabase
            .from("articles")
            .select("title, primary_keyword")
            .eq("blog_id", blogId)
            .limit(100);

        const existingTitles = (existingArticles || []).map((a: any) =>
            normalizeText(a.title || a.primary_keyword || "")
        ).filter(Boolean);

        // ─── 5. Generate keyword seeds ───────────────────────────────────
        const seeds = generateAutoKeywords(niche, { niche, city });
        const allSeeds = [seeds.primary, ...seeds.secondary].filter(Boolean);

        // ─── 6. Google signals (parallel: Custom Search + Autocomplete) ──
        const primaryQuery = city ? `${niche} ${city}` : niche;

        const [searchResult, autocompleteResults] = await Promise.all([
            fetchGoogleCustomSearchRaw({
                supabaseAdmin: supabase,
                tenant_id: tenantId,
                query: primaryQuery,
                hl: "pt-BR",
                gl: "br",
                timeoutMs: 2000,
            }),
            fetchAutocomplete(primaryQuery),
        ]);

        // Extract signals from Google Custom Search
        let serpTitles: string[] = [];
        let serpSnippets: string[] = [];
        let relatedSearches: string[] = [];

        if (searchResult.ok) {
            const top10 = normalizeTop10Results(searchResult.data);
            serpTitles = top10.map((r) => r.title);
            serpSnippets = top10.map((r) => r.snippet);

            // Extract "related searches" from spelling suggestions
            if (searchResult.data.spelling?.correctedQuery) {
                relatedSearches.push(searchResult.data.spelling.correctedQuery);
            }

            // Extract PAA-like signals from snippets (questions)
            const paaSignals = extractQuestionsFromSnippets(serpSnippets);
            relatedSearches.push(...paaSignals);
        }

        // Merge autocomplete suggestions
        relatedSearches.push(...autocompleteResults);

        // Deduplicate
        relatedSearches = [...new Set(relatedSearches.map((s) => s.toLowerCase().trim()))].filter(Boolean);

        // ─── 7. Build opportunities ──────────────────────────────────────
        const candidateKeywords = buildCandidateKeywords(
            allSeeds, serpTitles, relatedSearches, niche, city
        );

        const opportunities = candidateKeywords
            .map((kw) => {
                const gapScore = computeCoverageGap(kw.keyword, existingTitles);
                const freshnessScore = computeFreshness(kw.keyword, serpTitles, serpSnippets);
                const localScore = computeLocalRelevance(kw.keyword, city);

                const confidence = Math.round(
                    freshnessScore * 0.4 +
                    gapScore * 0.4 +
                    localScore * 0.2
                );

                return {
                    keyword: kw.keyword,
                    title_suggestion: kw.titleSuggestion,
                    why_now: kw.whyNow,
                    confidence_score: Math.max(0, Math.min(100, confidence)),
                    source: "radar_v3_minimal" as const,
                    source_signal: kw.source,
                };
            })
            .filter((o) => o.confidence_score >= 30)
            .sort((a, b) => b.confidence_score - a.confidence_score)
            .slice(0, 10);

        // ─── 8. Insert opportunities ─────────────────────────────────────
        if (opportunities.length > 0) {
            const rows = opportunities.map((opp) => ({
                run_id: runId,
                blog_id: blogId,
                tenant_id: tenantId,
                keyword: opp.keyword,
                title: opp.title_suggestion,
                confidence_score: opp.confidence_score,
                why_now: opp.why_now,
                status: "pending",
                source: opp.source,
                metadata: { source_signal: opp.source_signal },
            }));

            const { error: insertErr } = await supabase
                .from("radar_v3_opportunities")
                .insert(rows);

            if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);
        }

        // ─── 9. Complete run ─────────────────────────────────────────────
        const elapsed = Date.now() - t0;

        await supabase
            .from("radar_v3_runs")
            .update({
                status: "completed",
                finished_at: new Date().toISOString(),
                opportunities_count: opportunities.length,
                metadata: { niche, city, trigger: body.mode || "manual", elapsed_ms: elapsed },
            })
            .eq("id", runId);

        // Log
        await supabase
            .from("radar_v3_logs")
            .insert({
                run_id: runId,
                level: "info",
                message: `Radar V3 completed in ${elapsed}ms — ${opportunities.length} opportunities`,
                metadata: {
                    elapsed_ms: elapsed,
                    serp_count: serpTitles.length,
                    autocomplete_count: autocompleteResults.length,
                    related_count: relatedSearches.length,
                    existing_articles: existingTitles.length,
                },
            })
            .catch(() => { });

        return jsonRes({
            success: true,
            run_id: runId,
            opportunities_count: opportunities.length,
            elapsed_ms: elapsed,
        });
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[radar-v3-refresh] Error:", errorMsg);

        if (runId) {
            await supabase
                .from("radar_v3_runs")
                .update({
                    status: "failed",
                    finished_at: new Date().toISOString(),
                    error_message: errorMsg.substring(0, 1000),
                })
                .eq("id", runId)
                .catch(() => { });

            await supabase
                .from("radar_v3_logs")
                .insert({ run_id: runId, level: "error", message: errorMsg.substring(0, 500) })
                .catch(() => { });
        }

        return jsonRes({ error: errorMsg }, 500);
    }
});


// ============================================================================
// GOOGLE AUTOCOMPLETE (lightweight, no API key needed)
// ============================================================================
async function fetchAutocomplete(query: string): Promise<string[]> {
    try {
        const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&gl=br&q=${encodeURIComponent(query)}`;
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(t);

        if (!res.ok) return [];

        const data = await res.json();
        // Format: [query, [suggestions]]
        return Array.isArray(data?.[1]) ? data[1].slice(0, 8) : [];
    } catch {
        return [];
    }
}


// ============================================================================
// PAA EXTRACTION (questions from snippets)
// ============================================================================
function extractQuestionsFromSnippets(snippets: string[]): string[] {
    const questions: string[] = [];
    const questionPatterns = [
        /(?:^|\.\s)([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.?!]*\?)/g,
        /(?:como|qual|quanto|quando|onde|por que|o que|quem)\s[^.?!]*\??/gi,
    ];

    for (const snippet of snippets) {
        for (const pattern of questionPatterns) {
            const matches = snippet.matchAll(pattern);
            for (const m of matches) {
                const q = (m[1] || m[0]).trim().replace(/\?$/, "").trim();
                if (q.length > 10 && q.length < 120) {
                    questions.push(q);
                }
            }
        }
    }

    return [...new Set(questions)].slice(0, 5);
}


// ============================================================================
// CANDIDATE KEYWORDS BUILDER
// ============================================================================
interface CandidateKeyword {
    keyword: string;
    titleSuggestion: string;
    whyNow: string;
    source: string;
}

function buildCandidateKeywords(
    seeds: string[],
    serpTitles: string[],
    relatedSearches: string[],
    niche: string,
    city: string
): CandidateKeyword[] {
    const seen = new Set<string>();
    const candidates: CandidateKeyword[] = [];

    const add = (kw: string, title: string, why: string, source: string) => {
        const norm = kw.toLowerCase().trim();
        if (norm.length < 5 || seen.has(norm)) return;
        seen.add(norm);
        candidates.push({ keyword: norm, titleSuggestion: title, whyNow: why, source });
    };

    // From keyword seeds
    for (const seed of seeds) {
        add(
            seed,
            capitalizeFirst(seed),
            "Termo-chave gerado a partir do perfil do blog",
            "keyword_seed"
        );
    }

    // From autocomplete + related searches
    for (const rs of relatedSearches) {
        add(
            rs,
            capitalizeFirst(rs),
            "Busca sugerida pelo Google (autocomplete/related)",
            "google_autocomplete"
        );
    }

    // From SERP titles (extract keywords)
    for (const title of serpTitles) {
        const cleaned = title
            .replace(/[-–—|]/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim()
            .toLowerCase();
        if (cleaned.length > 10) {
            add(
                cleaned,
                capitalizeFirst(cleaned),
                "Tema detectado nos resultados orgânicos do Google",
                "serp_title"
            );
        }
    }

    // Local variations
    if (city) {
        const localVariants = [
            `${niche} em ${city}`,
            `melhor ${niche} ${city}`,
            `${niche} ${city} preço`,
            `como escolher ${niche} em ${city}`,
            `${niche} perto de mim ${city}`,
        ];
        for (const v of localVariants) {
            add(v, capitalizeFirst(v), `Variação local para ${city}`, "local_variant");
        }
    }

    return candidates;
}


// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Fuzzy coverage gap: token overlap between keyword and existing articles.
 * Returns 0-100 (100 = completely new topic, 0 = fully covered).
 */
function computeCoverageGap(keyword: string, existingTitles: string[]): number {
    if (existingTitles.length === 0) return 100; // No articles = everything is a gap

    const kwTokens = tokenize(keyword);
    if (kwTokens.length === 0) return 100;

    let maxOverlap = 0;

    for (const title of existingTitles) {
        const titleTokens = tokenize(title);
        if (titleTokens.length === 0) continue;

        // Jaccard-like overlap
        const intersection = kwTokens.filter((t) => titleTokens.includes(t)).length;
        const union = new Set([...kwTokens, ...titleTokens]).size;
        const overlap = union > 0 ? intersection / union : 0;

        maxOverlap = Math.max(maxOverlap, overlap);
    }

    // Higher overlap = lower gap score
    return Math.round((1 - maxOverlap) * 100);
}

/**
 * Freshness signal: detects year mentions and recency hints in SERP.
 * Returns 0-100 (100 = very fresh/timely topic).
 */
function computeFreshness(keyword: string, serpTitles: string[], serpSnippets: string[]): number {
    const currentYear = new Date().getFullYear();
    const allText = [...serpTitles, ...serpSnippets].join(" ").toLowerCase();
    const kwLower = keyword.toLowerCase();

    let score = 50; // baseline

    // Year mentions in SERP
    const yearPattern = new RegExp(`(${currentYear}|${currentYear - 1})`, "g");
    const yearMatches = allText.match(yearPattern);
    if (yearMatches && yearMatches.length >= 3) score += 25;
    else if (yearMatches && yearMatches.length >= 1) score += 15;

    // Freshness keywords in SERP
    const freshnessTerms = ["novo", "atualizado", "recente", "lançamento", "tendência", "2026", "2025"];
    const freshnessHits = freshnessTerms.filter((t) => allText.includes(t)).length;
    score += Math.min(freshnessHits * 5, 20);

    // Keyword itself has temporal signal
    if (/\b(202[5-9]|novo|atualizado)\b/i.test(kwLower)) score += 10;

    return Math.min(100, Math.max(0, score));
}

/**
 * Local relevance: how locally-relevant is this keyword?
 * Returns 0-100 (100 = highly local).
 */
function computeLocalRelevance(keyword: string, city: string): number {
    if (!city) return 50; // No city context = neutral

    const kwLower = keyword.toLowerCase();
    const cityLower = city.toLowerCase();

    // Direct city mention
    if (kwLower.includes(cityLower)) return 100;

    // Partial match (city fragments)
    const cityParts = cityLower.split(/\s+/);
    const partialMatch = cityParts.some((p) => p.length > 3 && kwLower.includes(p));
    if (partialMatch) return 75;

    // Local intent signals
    const localSignals = ["perto", "região", "local", "em ", "na ", "no ", "bairro"];
    if (localSignals.some((s) => kwLower.includes(s))) return 60;

    return 30; // Generic
}


// ============================================================================
// TEXT UTILS
// ============================================================================

const STOP_WORDS = new Set([
    "a", "o", "e", "de", "da", "do", "em", "um", "uma", "para", "com", "por",
    "que", "na", "no", "os", "as", "se", "é", "são", "mais", "como", "seu",
    "sua", "ao", "das", "dos", "ou", "ser", "ter", "está", "já", "também",
]);

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function normalizeText(text: string): string {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function capitalizeFirst(text: string): string {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function jsonRes(data: Record<string, unknown>, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
