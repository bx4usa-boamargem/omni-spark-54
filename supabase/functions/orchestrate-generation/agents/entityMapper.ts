import { AIRouterResult, JobInput } from "../types/agentTypes.ts";
import { callAIRouter, parseAIJson } from "./utils.ts";

export interface EntityData {
    topics: string[];
    terms: string[];
    places?: string[];
}

export async function executeEntityMapper(
    jobInput: JobInput,
    serpSummary: string,
    supabaseUrl: string,
    serviceKey: string,
): Promise<{ output: { entities: EntityData }; aiResult: AIRouterResult; rawCostUsd?: number }> {
    const keyword = jobInput.keyword || '';
    const niche = jobInput.niche || '';
    const city = jobInput.city || '';
    const language = jobInput.language || 'pt-BR';

    const prompt = `You are a Local SEO Semantic Analyst. Extract critical semantic entities for content ranking based on the provided context.
  
Query Context:
- Keyword: ${keyword}
- Niche: ${niche}
- Target Location: ${city || 'Brazil'}
- Language: ${language}

SERP Competitive Summary:
${serpSummary?.slice(0, 1000) || 'None available.'}

Identify the distinct entities required to achieve high topical authority (E-E-A-T) for this query.
Return ONLY a valid JSON object in this format (no markdown, no explanations):
{
  "topics": ["main topic 1", "main topic 2"],
  "terms": ["LSI keyword 1", "LSI keyword 2", "long-tail keyword"],
  "places": ["Neighborhood 1", "Landmark 1", "Nearby City"]
}
Limit to 4-6 topics, 8-12 terms, and 2-5 local places. Use arrays of strings.`;

    const aiResult = await callAIRouter(supabaseUrl, serviceKey, 'entity_extraction', [
        { role: 'system', content: 'You are an SEO analyst. Return ONLY valid JSON with topics, terms, and places.' },
        { role: 'user', content: prompt },
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
        throw new Error(`ENTITY_EXTRACTION_FAILED: ${aiResult.error}`);
    }

    const parsed = parseAIJson(aiResult.content, 'ENTITY_EXTRACTION');
    const entities: EntityData = {
        topics: Array.isArray(parsed.topics) ? parsed.topics.map(String) : [],
        terms: Array.isArray(parsed.terms) ? parsed.terms.map(String) : [],
        places: Array.isArray(parsed.places) ? parsed.places.map(String) : undefined,
    };

    return { output: { entities }, aiResult, rawCostUsd: aiResult.costUsd };
}
