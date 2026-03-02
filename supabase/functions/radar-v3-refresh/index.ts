// deno-lint-ignore-file
/**
 * RADAR V3 MINIMAL — Edge Function (Hardened)
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
 * HARDENING:
 *   - Always produces >= 3 opportunities (fallback guaranteed)
 *   - Detailed phase logging for remote diagnostics
 *   - Graceful Google Search failure handling
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchGoogleCustomSearchRaw, normalizeTop10Results } from "../_shared/googleSearch.ts";
import { generateAutoKeywords } from "../_shared/keywordGenerator.ts";

// ============================================================================
// CORS
// ============================================================================
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
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
            .select(
                "id, city, niche_profile_id, niche_profiles(name, description), sub_accounts(tenant_id)"
            )
            .eq("id", blogId)
            .maybeSingle();

        if (blogErr || !blog)
            return jsonRes({ error: "Blog not found", detail: blogErr?.message }, 403);

        const sa = Array.isArray(blog.sub_accounts)
            ? blog.sub_accounts[0]
            : blog.sub_accounts;
        const tenantId = (sa as any)?.tenant_id;
        if (!tenantId) return jsonRes({ error: "Tenant validation failed" }, 403);

        const np = Array.isArray(blog.niche_profiles)
            ? blog.niche_profiles[0]
            : blog.niche_profiles;
        const niche = (np as any)?.name || "general";
        const nicheDesc = (np as any)?.description || "";
        const city = blog.city || "";

        console.log(`[radar-v3] Blog=${blogId} Niche=${niche} City=${city} Tenant=${tenantId}`);

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
        console.log(`[radar-v3] Run created: ${runId}`);

        // ─── 4. Fetch existing articles (for coverage gap) ───────────────
        const { data: existingArticles } = await supabase
            .from("articles")
            .select("title, primary_keyword")
            .eq("blog_id", blogId)
            .limit(100);

        const existingTitles = (existingArticles || [])
            .map((a: any) => normalizeText(a.title || a.primary_keyword || ""))
            .filter(Boolean);

        console.log(`[radar-v3] Existing articles: ${existingTitles.length}`);

        // ─── 5. Generate keyword seeds ───────────────────────────────────
        const seeds = generateAutoKeywords(niche, { niche, city });
        const allSeeds = [seeds.primary, ...seeds.secondary].filter(Boolean);
        console.log(`[radar-v3] Seeds generated: ${allSeeds.length} → ${allSeeds.join(", ")}`);

        // ─── 6. Google signals (parallel: Custom Search + Autocomplete) ──
        const primaryQuery = city ? `${niche} ${city}` : niche;

        let searchResult: any = { ok: false, error: "not_attempted" };
        let autocompleteResults: string[] = [];

        try {
            [searchResult, autocompleteResults] = await Promise.all([
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
        } catch (googleErr) {
            console.error(`[radar-v3] Google signals failed:`, googleErr);
            await logToDb(supabase, runId, "warn", "Google signals failed, using seeds only", {
                error: String(googleErr),
            });
        }

        // Extract signals from Google Custom Search
        let serpTitles: string[] = [];
        let serpSnippets: string[] = [];
        let relatedSearches: string[] = [];

        if (searchResult?.ok) {
            const top10 = normalizeTop10Results(searchResult.data);
            serpTitles = top10.map((r: any) => r.title);
            serpSnippets = top10.map((r: any) => r.snippet);

            if (searchResult.data?.spelling?.correctedQuery) {
                relatedSearches.push(searchResult.data.spelling.correctedQuery);
            }

            const paaSignals = extractQuestionsFromSnippets(serpSnippets);
            relatedSearches.push(...paaSignals);

            console.log(`[radar-v3] Google Search OK: ${serpTitles.length} titles, ${paaSignals.length} PAA`);
        } else {
            console.warn(`[radar-v3] Google Search FAILED: ${searchResult?.error || "unknown"}`);
            await logToDb(supabase, runId, "warn", "Google Custom Search failed", {
                error: searchResult?.error,
                status: searchResult?.status,
            });
        }

        // Merge autocomplete
        relatedSearches.push(...autocompleteResults);
        relatedSearches = [
            ...new Set(relatedSearches.map((s) => s.toLowerCase().trim())),
        ].filter(Boolean);

        console.log(`[radar-v3] Autocomplete: ${autocompleteResults.length}, Related total: ${relatedSearches.length}`);

        // ─── 7. Build opportunities ──────────────────────────────────────
        const candidateKeywords = buildCandidateKeywords(
            allSeeds,
            serpTitles,
            relatedSearches,
            niche,
            city
        );

        console.log(`[radar-v3] Candidate keywords: ${candidateKeywords.length}`);

        let opportunities = candidateKeywords
            .map((kw) => {
                const gapScore = computeCoverageGap(kw.keyword, existingTitles);
                const freshnessScore = computeFreshness(kw.keyword, serpTitles, serpSnippets);
                const localScore = computeLocalRelevance(kw.keyword, city);

                const confidence = Math.round(
                    freshnessScore * 0.4 + gapScore * 0.4 + localScore * 0.2
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
            .filter((o) => o.confidence_score >= 15) // lowered from 30
            .sort((a, b) => b.confidence_score - a.confidence_score)
            .slice(0, 12);

        console.log(`[radar-v3] Opportunities after scoring: ${opportunities.length}`);

        // ─── 7b. FALLBACK: always deliver at least 3 ─────────────────────
        if (opportunities.length < 3) {
            console.log(`[radar-v3] Activating fallback (${opportunities.length} < 3)`);
            await logToDb(supabase, runId, "warn", `Only ${opportunities.length} scored opportunities, adding fallback`, {
                candidates_count: candidateKeywords.length,
                google_ok: searchResult?.ok || false,
                autocomplete_count: autocompleteResults.length,
            });

            const fallback = generateFallbackOpportunities(niche, city);
            const existingKws = new Set(opportunities.map((o) => o.keyword));
            for (const fb of fallback) {
                if (!existingKws.has(fb.keyword) && opportunities.length < 5) {
                    opportunities.push(fb);
                    existingKws.add(fb.keyword);
                }
            }
        }

        // ─── 8. Insert opportunities ─────────────────────────────────────
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

        console.log(`[radar-v3] Inserting ${rows.length} opportunities...`);

        const { data: insertData, error: insertErr } = await supabase
            .from("radar_v3_opportunities")
            .insert(rows)
            .select("id");

        if (insertErr) {
            console.error(`[radar-v3] INSERT FAILED:`, JSON.stringify(insertErr));
            await logToDb(supabase, runId, "error", `Insert failed: ${insertErr.message}`, {
                code: insertErr.code,
                details: insertErr.details,
                hint: insertErr.hint,
                rows_attempted: rows.length,
                sample_row: rows[0],
            });
            throw new Error(`Insert failed: ${insertErr.message} | code=${insertErr.code} | hint=${insertErr.hint}`);
        }

        const insertedCount = insertData?.length || rows.length;
        console.log(`[radar-v3] INSERT OK: ${insertedCount} rows`);

        // ─── 9. Complete run ─────────────────────────────────────────────
        const elapsed = Date.now() - t0;

        await supabase
            .from("radar_v3_runs")
            .update({
                status: "completed",
                finished_at: new Date().toISOString(),
                opportunities_count: insertedCount,
                metadata: {
                    niche,
                    city,
                    trigger: body.mode || "manual",
                    elapsed_ms: elapsed,
                    google_search_ok: searchResult?.ok || false,
                    autocomplete_count: autocompleteResults.length,
                    candidates_count: candidateKeywords.length,
                    fallback_used: opportunities.length > candidateKeywords.filter((k) => true).length,
                },
            })
            .eq("id", runId);

        await logToDb(supabase, runId, "info", `Radar V3 completed in ${elapsed}ms — ${insertedCount} opportunities`, {
            elapsed_ms: elapsed,
            serp_count: serpTitles.length,
            autocomplete_count: autocompleteResults.length,
            related_count: relatedSearches.length,
            existing_articles: existingTitles.length,
            candidates: candidateKeywords.length,
            inserted: insertedCount,
        });

        return jsonRes({
            success: true,
            run_id: runId,
            opportunities_count: insertedCount,
            elapsed_ms: elapsed,
        });
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[radar-v3] FATAL:", errorMsg);

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

            await logToDb(supabase, runId, "error", `Fatal: ${errorMsg}`).catch(() => { });
        }

        return jsonRes({ error: errorMsg }, 500);
    }
});


// ============================================================================
// FALLBACK: guaranteed opportunities when signals fail
// ============================================================================
function generateFallbackOpportunities(niche: string, city: string) {
    const cityLabel = city || "sua cidade";
    return [
        {
            keyword: `${niche.toLowerCase()} ${cityLabel.toLowerCase()}`,
            title_suggestion: `${capitalizeFirst(niche)} em ${capitalizeFirst(cityLabel)}: Guia Completo`,
            why_now: "Termo evergreen com busca constante",
            confidence_score: 65,
            source: "radar_v3_minimal" as const,
            source_signal: "fallback",
        },
        {
            keyword: `quanto custa ${niche.toLowerCase()} ${cityLabel.toLowerCase()}`,
            title_suggestion: `Quanto Custa ${capitalizeFirst(niche)} em ${capitalizeFirst(cityLabel)}?`,
            why_now: "Busca transacional com alta conversão",
            confidence_score: 70,
            source: "radar_v3_minimal" as const,
            source_signal: "fallback",
        },
        {
            keyword: `melhor ${niche.toLowerCase()} ${cityLabel.toLowerCase()}`,
            title_suggestion: `Melhor ${capitalizeFirst(niche)} em ${capitalizeFirst(cityLabel)}: Como Escolher`,
            why_now: "Busca commercial com intenção de decisão",
            confidence_score: 60,
            source: "radar_v3_minimal" as const,
            source_signal: "fallback",
        },
        {
            keyword: `como escolher ${niche.toLowerCase()}`,
            title_suggestion: `Como Escolher ${capitalizeFirst(niche)}: Guia Prático`,
            why_now: "Conteúdo informacional com alto engajamento",
            confidence_score: 55,
            source: "radar_v3_minimal" as const,
            source_signal: "fallback",
        },
        {
            keyword: `dicas ${niche.toLowerCase()} ${cityLabel.toLowerCase()}`,
            title_suggestion: `Dicas de ${capitalizeFirst(niche)} em ${capitalizeFirst(cityLabel)}`,
            why_now: "Conteúdo educacional de alto valor",
            confidence_score: 50,
            source: "radar_v3_minimal" as const,
            source_signal: "fallback",
        },
    ];
}


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

    const add = (
        kw: string,
        title: string,
        why: string,
        source: string
    ) => {
        const norm = kw.toLowerCase().trim();
        if (norm.length < 5 || seen.has(norm)) return;
        seen.add(norm);
        candidates.push({
            keyword: norm,
            titleSuggestion: title,
            whyNow: why,
            source,
        });
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

function computeCoverageGap(keyword: string, existingTitles: string[]): number {
    if (existingTitles.length === 0) return 100;

    const kwTokens = tokenize(keyword);
    if (kwTokens.length === 0) return 100;

    let maxOverlap = 0;

    for (const title of existingTitles) {
        const titleTokens = tokenize(title);
        if (titleTokens.length === 0) continue;

        const intersection = kwTokens.filter((t) => titleTokens.includes(t)).length;
        const union = new Set([...kwTokens, ...titleTokens]).size;
        const overlap = union > 0 ? intersection / union : 0;

        maxOverlap = Math.max(maxOverlap, overlap);
    }

    return Math.round((1 - maxOverlap) * 100);
}

function computeFreshness(
    keyword: string,
    serpTitles: string[],
    serpSnippets: string[]
): number {
    const currentYear = new Date().getFullYear();
    const allText = [...serpTitles, ...serpSnippets].join(" ").toLowerCase();
    const kwLower = keyword.toLowerCase();

    let score = 50;

    const yearPattern = new RegExp(`(${currentYear}|${currentYear - 1})`, "g");
    const yearMatches = allText.match(yearPattern);
    if (yearMatches && yearMatches.length >= 3) score += 25;
    else if (yearMatches && yearMatches.length >= 1) score += 15;

    const freshnessTerms = [
        "novo", "atualizado", "recente", "lançamento", "tendência",
        String(currentYear), String(currentYear - 1),
    ];
    const freshnessHits = freshnessTerms.filter((t) => allText.includes(t)).length;
    score += Math.min(freshnessHits * 5, 20);

    if (/\b(202[5-9]|novo|atualizado)\b/i.test(kwLower)) score += 10;

    // If no SERP data at all, give neutral score
    if (serpTitles.length === 0) score = 60;

    return Math.min(100, Math.max(0, score));
}

function computeLocalRelevance(keyword: string, city: string): number {
    if (!city) return 50;

    const kwLower = keyword.toLowerCase();
    const cityLower = city.toLowerCase();

    if (kwLower.includes(cityLower)) return 100;

    const cityParts = cityLower.split(/\s+/);
    const partialMatch = cityParts.some(
        (p) => p.length > 3 && kwLower.includes(p)
    );
    if (partialMatch) return 75;

    const localSignals = ["perto", "região", "local", "em ", "na ", "no ", "bairro"];
    if (localSignals.some((s) => kwLower.includes(s))) return 60;

    return 30;
}


// ============================================================================
// HELPERS
// ============================================================================

async function logToDb(
    supabase: any,
    runId: string,
    level: "info" | "warn" | "error",
    message: string,
    metadata: Record<string, unknown> = {}
) {
    await supabase
        .from("radar_v3_logs")
        .insert({ run_id: runId, level, message: message.substring(0, 500), metadata })
        .catch((err: unknown) => console.error("[radar-v3-log] Insert failed:", err));
}

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
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
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
