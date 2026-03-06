import { AIRouterResult, JobInput } from "../types/agentTypes.ts";
import { callAIRouter, parseAIJson } from "./utils.ts";

export interface SerpScoutResult {
    custom_search_results: any[];
    places_results: any[];
    serp_summary: string;
}

export async function executeSerpScout(
    jobInput: JobInput,
    supabaseUrl: string,
    serviceKey: string,
): Promise<{ output: SerpScoutResult; aiResult: AIRouterResult; rawCostUsd?: number }> {
    const keyword = jobInput.keyword || '';
    const city = jobInput.city || '';
    const niche = jobInput.niche || '';
    const language = jobInput.language || 'pt-BR';

    const searchQuery = city ? `${keyword} ${city}` : keyword;

    const googleApiKey = Deno.env.get("GOOGLE_CUSTOM_SEARCH_KEY");
    const searchEngineId = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID");

    let serpResultsText = "";
    let customSearchResults: any[] = [];
    let placesResults: any[] = [];

    if (googleApiKey && searchEngineId) {
        try {
            console.log(`[AGENT_1_SERP_SCOUT] Fetching real SERP data for query: "${searchQuery}"`);
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&gl=br&hl=pt-BR&num=10`;

            const response = await fetch(searchUrl);
            if (response.ok) {
                const data = await response.json();
                customSearchResults = data.items || [];

                serpResultsText = customSearchResults.map((item, index) => {
                    return `${index + 1}. Title: ${item.title}\nLink: ${item.link}\nSnippet: ${item.snippet}\n`;
                }).join('\n');
            } else {
                console.warn(`[AGENT_1_SERP_SCOUT] Google Custom Search API failed: HTTP ${response.status}`);
            }
        } catch (e) {
            console.warn(`[AGENT_1_SERP_SCOUT] Error fetching Custom Search:`, e);
        }
    } else {
        console.warn(`[AGENT_1_SERP_SCOUT] GOOGLE_CUSTOM_SEARCH_KEY or GOOGLE_SEARCH_ENGINE_ID not configured. Using LLM hallucination mode fallback.`);
    }

    // Summarize it to pass context to next agents
    const prompt = `Provide a brief competitive landscape summary for the local SEO keyword "${keyword}" in ${city || 'Brazil'}, niche: ${niche}, language: ${language}.

${serpResultsText ? `I have real Google Top 10 SERP results. Analyze them to provide the summary:\n${serpResultsText}` : 'No real SERP data available, please rely on your training data.'}

Include:
- Average word count of top results (estimate based on typical patterns)
- Common topics covered by the top competitors
- Content gaps you can identify
- Dominant search intent (informational, commercial, transactional, navigational)

Keep it under 300 words. This will be used as semantic context for the Super Page architecture.`;

    const aiResult = await callAIRouter(supabaseUrl, serviceKey, 'serp_summary', [
        { role: 'system', content: 'You are an advanced SEO analyst specializing in Local SEO. Provide concise competitive analysis based on the input SERP data.' },
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
        throw new Error(`SERP_SCOUT_FAILED: ${aiResult.error}`);
    }

    return {
        output: {
            serp_summary: aiResult.content,
            custom_search_results: customSearchResults,
            places_results: placesResults
        },
        aiResult,
        rawCostUsd: aiResult.costUsd
    };
}
