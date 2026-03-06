import { AIRouterResult, JobInput } from "../types/agentTypes.ts";
import { callAIRouter, parseAIJson } from "./utils.ts";

export interface SerpGapResult {
    semantic_gaps: string[];
    competitor_topics: string[];
    missing_in_outline?: string[];
    paa_questions?: string[]; // People Also Ask
}

export async function executeTrendAndCompetitor(
    jobInput: JobInput,
    serpSummary: string,
    supabaseUrl: string,
    serviceKey: string,
): Promise<{ output: SerpGapResult; aiResult: AIRouterResult; rawCostUsd?: number }> {
    const keyword = jobInput.keyword || '';
    const niche = jobInput.niche || '';
    const city = jobInput.city || '';
    const language = jobInput.language || 'pt-BR';

    const prompt = `You are a Senior SEO Strategist and Competitor Analyst. Compare top ranking competitors for the keyword "${keyword}" (niche: ${niche}, location: ${city || 'Brazil'}, language: ${language}).

SERP/Competitor Context:
${serpSummary?.slice(0, 2000) || 'No data.'}

Identify:
1) semantic_gaps: Topics or subtopics that competitors cover poorly or often miss in thin content (list 4-8 short phrases). This addresses Agent 4 (Competitor weaknesses).
2) competitor_topics: Main themes that the top 10 results typically cover well (list 4-8 short phrases).
3) paa_questions: "People Also Ask" questions that reflect search intent demands for this keyword (list 3-5 questions). This addresses Agent 3 (Trend & Demand).

Return ONLY valid JSON (no markdown snippets):
{
  "semantic_gaps": ["gap1", "gap2"],
  "competitor_topics": ["topic1", "topic2"],
  "paa_questions": ["question 1", "question 2"]
}`;

    const aiResult = await callAIRouter(supabaseUrl, serviceKey, 'serp_gap_analysis', [
        { role: 'system', content: 'You are an SEO analyst. Return ONLY valid JSON with semantic_gaps, competitor_topics, and paa_questions arrays.' },
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
        throw new Error(`TREND_COMPETITOR_ANALYSIS_FAILED: ${aiResult.error}`);
    }

    const parsed = parseAIJson(aiResult.content, 'TREND_COMPETITOR_ANALYSIS');
    const output: SerpGapResult = {
        semantic_gaps: Array.isArray(parsed.semantic_gaps) ? parsed.semantic_gaps.map(String) : [],
        competitor_topics: Array.isArray(parsed.competitor_topics) ? parsed.competitor_topics.map(String) : [],
        paa_questions: Array.isArray(parsed.paa_questions) ? parsed.paa_questions.map(String) : [],
    };

    return { output, aiResult, rawCostUsd: aiResult.costUsd };
}
