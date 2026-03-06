import { AIRouterResult, JobInput } from "../types/agentTypes.ts";
import { callAIRouter, parseAIJson } from "./utils.ts";
import { SerpScoutResult } from "./serpScout.ts";
import { EntityData } from "./entityMapper.ts";
import { SerpGapResult } from "./trendAndCompetitor.ts";

export interface OutlineSection {
    title: string;
    h3: string[];
}

export interface OutlineData {
    h1: string;
    h2: OutlineSection[];
    meta_description?: string;
    cta?: string;
}

export async function executeBlueprintBuilder(
    jobInput: JobInput,
    scoutResult: SerpScoutResult,
    entityMapperResult: EntityData,
    trendResult: SerpGapResult,
    supabaseUrl: string,
    serviceKey: string
): Promise<{ output: { outline: OutlineData }; aiResult: AIRouterResult; rawCostUsd?: number }> {
    const keyword = jobInput.keyword || '';
    const city = jobInput.city || '';
    const niche = jobInput.niche || '';
    const language = jobInput.language || 'pt-BR';
    const jobType = jobInput.job_type || 'article';

    const wordHint = jobType === 'super_page'
        ? 'Support 3000-6000 words: 6-12 H2 sections, 2-4 H3 per H2.'
        : 'Support 1500-3000 words: 4-6 H2 sections, 2-3 H3 per H2.';

    const prompt = `You are a Master SEO Content Architect. Create a robust, intent-driven outline for a ${jobType}.

TARGET:
- Keyword: ${keyword}
- Location: ${city || 'Brazil'}
- Niche: ${niche}
- Language: ${language}

COMPETITIVE CONTEXT (Agent 1):
${scoutResult.serp_summary || 'No serp summary available.'}

SEMANTIC ENTITIES (Agent 2 - Distribute these conceptually across your structure):
Topics: ${(entityMapperResult.topics || []).join(', ')}
Terms: ${(entityMapperResult.terms || []).join(', ')}

GAP & TREND ANALYSIS (Agent 3 & 4 - Ensure these are explicitly covered by distinct H2s or H3s):
Competitor Trends: ${(trendResult.competitor_topics || []).join(', ')}
Gaps to Cover: ${(trendResult.semantic_gaps || []).join(', ')}
PAA Questions: ${(trendResult.paa_questions || []).join(', ')}

${wordHint}
Include a clear, location-aware CTA idea at the end.

Return ONLY a valid JSON object in this exact format (no markdown, no code blocks):
{
  "outline": {
    "h1": "Main title with keyword and locale",
    "h2": [
      { "title": "Section title", "h3": ["Subsection 1", "Subsection 2"] }
    ],
    "meta_description": "Optimal meta description max 155 chars",
    "cta": "CTA message"
  }
}`;

    const aiResult = await callAIRouter(supabaseUrl, serviceKey, 'outline_gen', [
        { role: 'system', content: 'You are an SEO architect. Return ONLY valid JSON with an "outline" object. No other text.' },
        { role: 'user', content: prompt }
    ], {
        tracking: {
            tenant_id: jobInput.tenant_id ?? null,
            blog_id: jobInput.blog_id ?? null,
            user_id: jobInput.user_id ?? null,
            article_id: null,
            job_id: jobInput.job_id ?? null,
        }
    });

    if (!aiResult.success) {
        throw new Error(`BLUEPRINT_BUILDER_FAILED: ${aiResult.error}`);
    }

    const parsed = parseAIJson(aiResult.content, 'OUTLINE_GEN');
    const outlineObj = (parsed.outline ?? parsed) as Record<string, unknown>;

    if (!outlineObj?.h1 || !Array.isArray(outlineObj.h2)) {
        throw new Error('BLUEPRINT_BUILDER: invalid outline (missing h1 or h2 array)');
    }

    const outline: OutlineData = {
        h1: String(outlineObj.h1),
        h2: (outlineObj.h2 as Array<{ title: string; h3: string[] }>).map((s) => ({
            title: s.title || '',
            h3: Array.isArray(s.h3) ? s.h3.map(String) : [],
        })),
        meta_description: outlineObj.meta_description != null ? String(outlineObj.meta_description) : undefined,
        cta: outlineObj.cta != null ? String(outlineObj.cta) : undefined,
    };

    return { output: { outline }, aiResult, rawCostUsd: aiResult.costUsd };
}
