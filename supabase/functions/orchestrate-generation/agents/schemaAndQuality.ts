import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const QUALITY_GATE = {
    ENTITY_COVERAGE_MIN: 60,
    FAQ_MIN_ITEMS: 3,
    SEMANTIC_SCORE_MIN: 65,
};

export function getMinWordCount(jobType: "article" | "super_page"): number {
    return jobType === "super_page" ? 3000 : 1500;
}

export interface QualityGateResult {
    passed: boolean;
    entityOk?: boolean;
    wordOk?: boolean;
    faqOk?: boolean;
    scoreOk?: boolean;
    reasons: string[];
    quality_gate_status?: string;
    schema_json?: any;
}

export async function executeSchemaAndQuality(
    articleId: string | null,
    blogId: string,
    articleData: Record<string, unknown>,
    entityCoverageScore: number,
    seoScoreResult: Record<string, unknown>,
    jobType: "article" | "super_page",
    jobInput: Record<string, unknown>,
    supabase: ReturnType<typeof createClient>,
    userClient: ReturnType<typeof createClient>
): Promise<QualityGateResult> {
    if (!articleId) return { passed: false, reasons: ["no_article_id"] };

    const html = (articleData.html_article as string) || "";
    const wordCount = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const faq = (articleData.faq as Array<{ question?: string; answer?: string }>) || [];
    const faqCount = Array.isArray(faq) ? faq.length : 0;
    const contentScore = Number(seoScoreResult?.score ?? seoScoreResult?.totalScore ?? 0);

    const minWords = getMinWordCount(jobType);
    const entityOk = entityCoverageScore >= QUALITY_GATE.ENTITY_COVERAGE_MIN;
    const wordOk = wordCount >= minWords;
    const faqOk = faqCount >= QUALITY_GATE.FAQ_MIN_ITEMS;
    const scoreOk = contentScore >= QUALITY_GATE.SEMANTIC_SCORE_MIN;

    const passed = entityOk && wordOk && faqOk && scoreOk;
    const reasons: string[] = [];
    if (!entityOk) reasons.push(`entity_coverage ${entityCoverageScore} < ${QUALITY_GATE.ENTITY_COVERAGE_MIN}`);
    if (!wordOk) reasons.push(`word_count ${wordCount} < ${minWords}`);
    if (!faqOk) reasons.push(`faq_items ${faqCount} < ${QUALITY_GATE.FAQ_MIN_ITEMS}`);
    if (!scoreOk) reasons.push(`semantic_score ${contentScore} < ${QUALITY_GATE.SEMANTIC_SCORE_MIN}`);

    const qualityGateStatus = passed ? "approved" : "quality_failed";

    // AGENT 7: JSON-LD Schema Generation
    const schemaJson = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": articleData.title || jobInput.keyword,
        "description": articleData.meta_description || "",
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://example.com/${articleId}`
        },
        // Dynamically insert FAQ schema if FAQs are present
        ...(faqCount > 0 ? {
            "mainEntity": {
                "@type": "FAQPage",
                "mainEntity": faq.map(f => ({
                    "@type": "Question",
                    "name": f.question,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": f.answer
                    }
                }))
            }
        } : {})
    };

    await userClient.from("articles").update({
        quality_gate_status: qualityGateStatus,
        schema_json: schemaJson as unknown,
        ...(passed ? {
            status: "ready_for_publish",
            ready_for_publish_at: new Date().toISOString(),
        } : {}),
    }).eq("id", articleId);

    await supabase.from("quality_gate_audits").insert({
        article_id: articleId,
        blog_id: blogId,
        approved: passed,
        attempt_number: 1,
        validated_at: new Date().toISOString(),
        failures: reasons,
        word_count: wordCount,
        seo_score: Math.round(contentScore),
    });

    return { passed, entityOk, wordOk, faqOk, scoreOk, reasons, quality_gate_status: qualityGateStatus, schema_json: schemaJson };
}
