import { AIRouterResult, JobInput } from "../types/agentTypes.ts";
import { callAIRouter } from "./utils.ts";
import { OutlineData } from "./blueprintBuilder.ts";
import { EntityData } from "./entityMapper.ts";

export interface EntityAssignment {
    sectionIndex: number;
    sectionTitle: string;
    entityIds: number[];
    terms: string[];
}

export interface EntityCoverageResult {
    assignment: EntityAssignment[];
    coverageScore: number;
    allEntities: string[];
}

export function executeEntityCoverage(outline: OutlineData, entities: EntityData): EntityCoverageResult {
    const allTerms = [...(entities.topics || []), ...(entities.terms || []), ...(entities.places || [])].filter(Boolean);
    const assignment: EntityAssignment[] = outline.h2.map((section, i) => {
        const count = outline.h2.length || 1;
        const start = Math.floor((i * allTerms.length) / count);
        const end = i === count - 1 ? allTerms.length : Math.floor(((i + 1) * allTerms.length) / count);
        const slice = allTerms.slice(start, end);
        return {
            sectionIndex: i + 1,
            sectionTitle: section.title,
            entityIds: slice.map((_, idx) => start + idx),
            terms: slice,
        };
    });

    const assignedCount = assignment.reduce((acc, a) => acc + a.terms.length, 0);
    const coverageScore = allTerms.length > 0 ? Math.round((assignedCount / allTerms.length) * 100) : 100;

    return { assignment, coverageScore, allEntities: allTerms };
}

export async function executeSectionWriter(
    jobInput: JobInput,
    outline: OutlineData,
    entities: EntityData,
    entityCoverage: EntityCoverageResult,
    supabaseUrl: string,
    serviceKey: string
): Promise<{ output: { html_article: string; title: string, meta_description: string }; aiResult: AIRouterResult; rawCostUsd?: number }> {

    const keyword = jobInput.keyword || '';
    const city = jobInput.city || '';
    const niche = jobInput.niche || '';
    const language = jobInput.language || 'pt-BR';
    const jobType = jobInput.job_type || 'article';

    let totalCostUsd = 0;
    let fullHtml = `<!DOCTYPE html>\n<html lang="${language === 'pt-BR' ? 'pt-BR' : 'en'}">\n<head>\n<meta charset="UTF-8">\n<title>${outline.h1}</title>\n</head>\n<body>\n`;
    fullHtml += `<h1>${outline.h1}</h1>\n`;

    // Write Introduction
    console.log(`[AGENT_6_SECTION_WRITER] Writing Introduction...`);
    const introPrompt = `You are a premium Local SEO writer. Write the introductory paragraphs for the article titled "${outline.h1}".
Context: Keyword: ${keyword}, City: ${city || 'Brazil'}, Niche: ${niche}.
Style: Engaging, answer-first, concise. Do not use H2 tags here, just <p> tags.
Return ONLY HTML (no markdown wrappers).`;

    const introAiResult = await callAIRouter(supabaseUrl, serviceKey, 'section_gen', [
        { role: 'system', content: 'You are an SEO Writer. Output valid HTML tags only.' },
        { role: 'user', content: introPrompt }
    ]);

    if (introAiResult.success) {
        fullHtml += introAiResult.content.replace(/```html|```/g, '').trim() + '\n';
        totalCostUsd += introAiResult.costUsd || 0;
    }

    // Write Sections (Chunking Process)
    for (let i = 0; i < outline.h2.length; i++) {
        const section = outline.h2[i];
        const sectionEntities = entityCoverage.assignment[i]?.terms || [];

        console.log(`[AGENT_6_SECTION_WRITER] Writing Section ${i + 1}/${outline.h2.length}: ${section.title}`);

        const sectionPrompt = `You are a premium Local SEO writer. Your task is to write EXACTLY one section of a larger article.
Current Section H2: ${section.title}
Required H3 Subsections: ${section.h3.length > 0 ? section.h3.join(', ') : 'None, just write the content under H2.'}

Context:
- Overall Article Title: ${outline.h1}
- Location: ${city || 'Brazil'}
- Niche: ${niche}

Semantic Entities to include naturally in this specific section:
${sectionEntities.join(', ')}

Rules:
1. Start with <h2>${section.title}</h2>
2. Fully explore the topic. Use <h3> tags for the subsections provided.
3. Write between 300 to 600 words for this section alone.
4. Use formatting like <ul>, <li>, <strong> where appropriate.
5. Return ONLY HTML syntax. DO NOT wrap with \`\`\`html. No explanations.`;

        const sectionAiResult = await callAIRouter(supabaseUrl, serviceKey, 'section_gen', [
            { role: 'system', content: 'You are an SEO Writer. Output valid HTML starting with the <h2> tag.' },
            { role: 'user', content: sectionPrompt }
        ]);

        if (sectionAiResult.success) {
            fullHtml += sectionAiResult.content.replace(/```html|```/g, '').trim() + '\n';
            totalCostUsd += sectionAiResult.costUsd || 0;
        } else {
            console.warn(`[AGENT_6_SECTION_WRITER] Failed to write section ${i + 1}. Skipping.`);
        }

        // Add small delay to prevent rate limit spikes if multiple chunks
        await new Promise(r => setTimeout(r, 1000));
    }

    // Write FAQ
    console.log(`[AGENT_6_SECTION_WRITER] Writing FAQ...`);
    const faqPrompt = `You are a premium Local SEO writer. Write a FAQ section for the article "${outline.h1}".
Generate 3 to 5 frequently asked questions and short, helpful answers.
Return ONLY HTML (no markdown wrappers). Use an <h2> tag for the FAQ title (e.g., "Perguntas Frequentes"), then use <h3> for questions and <p> for answers.`;

    const faqAiResult = await callAIRouter(supabaseUrl, serviceKey, 'section_gen', [
        { role: 'system', content: 'You are an SEO Writer. Output valid HTML.' },
        { role: 'user', content: faqPrompt }
    ]);

    if (faqAiResult.success) {
        fullHtml += faqAiResult.content.replace(/```html|```/g, '').trim() + '\n';
        totalCostUsd += faqAiResult.costUsd || 0;
    }

    fullHtml += `</body>\n</html>`;

    const finalAiResult: AIRouterResult = {
        ...faqAiResult, // Pass the last AI result just for reference success flag
        costUsd: totalCostUsd // Aggregated cost
    };

    return {
        output: {
            html_article: fullHtml,
            title: outline.h1,
            meta_description: outline.meta_description || ''
        },
        aiResult: finalAiResult,
        rawCostUsd: totalCostUsd
    };
}
