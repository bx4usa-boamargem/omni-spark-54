import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { JobInput } from "../types/agentTypes.ts";

export function executeInputValidation(jobInput: JobInput): Record<string, unknown> {
    const errors: string[] = [];
    if (!jobInput?.keyword || (jobInput.keyword as string).trim().length < 2) errors.push('keyword obrigatório (min 2 chars)');
    if (!jobInput?.niche || (jobInput.niche as string).trim().length < 2) errors.push('niche obrigatório');
    if (errors.length > 0) {
        throw new Error(`Input validation failed: ${errors.join('; ')}`);
    }
    return { validated: true, keyword: jobInput.keyword, city: jobInput.city, niche: jobInput.niche };
}

export function injectCtaIntoHtml(html: string, cta: Record<string, unknown> | null): string {
    if (!cta || !cta.value) return html;

    const ctaUrl = cta.type === 'whatsapp'
        ? `https://wa.me/${(cta.value as string).replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Vi seu artigo e gostaria de saber mais.')}`
        : cta.value as string;

    const ctaBlock = `
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; margin: 32px 0; text-align: center;">
  <h3 style="color: white; font-size: 1.4em; margin-bottom: 12px;">Gostou do conteúdo?</h3>
  <p style="color: rgba(255,255,255,0.9); margin-bottom: 20px;">${cta.label || 'Entre em contato'}</p>
  <a href="${ctaUrl}" target="_blank" rel="noopener" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1.1em;">
    ${cta.type === 'whatsapp' ? '💬 Falar no WhatsApp' : cta.label || 'Saiba mais'}
  </a>
</div>`;

    if (html.includes('</body>')) {
        return html.replace('</body>', ctaBlock + '</body>');
    }
    return html + ctaBlock;
}

export async function executeSaveArticle(
    jobId: string,
    articleData: Record<string, unknown>,
    jobInput: JobInput,
    supabase: ReturnType<typeof createClient>,
    userClient: ReturnType<typeof createClient>,
    totalApiCalls: number,
    totalCostUsd: number,
    contentType: 'article' | 'super_page'
): Promise<Record<string, unknown>> {
    const blogId = (jobInput.blog_id as string);
    if (!blogId) throw new Error('blog_id missing from jobInput');

    const title = (articleData.title as string) || (jobInput.keyword as string) || '';
    const htmlArticle = (articleData.html_article as string) || '';
    const metaDescription = (articleData.meta_description as string) || '';
    const faqItems = (articleData.faq as Array<Record<string, unknown>>) || [];
    const imagePrompt = (articleData.image_prompt as string) || '';
    const schemaJson = (articleData.schema_faq as string) ?? null;

    if (!htmlArticle || htmlArticle.length < 200) {
        throw new Error('SAVE_ARTICLE: HTML content too short');
    }

    const baseSlug = title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 70);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const excerpt = metaDescription || title;

    const textContent = htmlArticle.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);

    const { data: blogData } = await supabase
        .from('blogs')
        .select('cta_type, cta_url, cta_text, header_cta_text, header_cta_url, city, tenant_id')
        .eq('id', blogId)
        .single();

    const whatsapp = (jobInput.whatsapp as string) || '';
    const businessName = (jobInput.business_name as string) || '';
    const city = (jobInput.city as string) || blogData?.city || '';
    const tenantId = (jobInput.tenant_id as string) || (blogData?.tenant_id as string) || '';

    let cta: Record<string, unknown> | null = null;
    if (whatsapp) {
        cta = { type: 'whatsapp', value: whatsapp, label: businessName ? `Fale com ${businessName}` : 'Fale conosco pelo WhatsApp', city };
    } else if (blogData?.cta_url || blogData?.header_cta_url) {
        cta = {
            type: blogData.cta_type || 'link',
            value: blogData.cta_url || blogData.header_cta_url,
            label: blogData.cta_text || blogData.header_cta_text || 'Saiba mais',
            city,
        };
    }

    const finalHtml = injectCtaIntoHtml(htmlArticle, cta);

    const insertPayload: Record<string, unknown> = {
        blog_id: blogId,
        tenant_id: tenantId,
        title,
        slug,
        content: finalHtml,
        meta_description: metaDescription,
        excerpt,
        faq: faqItems as unknown,
        keywords: [(jobInput.keyword as string) || ''],
        status: 'draft',
        category: contentType === 'super_page' ? 'Guides' : 'Artigos',
        generation_stage: 'completed',
        generation_source: 'engine_v2',
        generation_progress: 100,
        engine_version: 'v2',
        reading_time: readingTime,
        cta: cta as unknown,
        source_payload: { image_prompt: imagePrompt } as unknown,
    };

    if (schemaJson) {
        if (typeof schemaJson === "string") {
            try { insertPayload.schema_json = JSON.parse(schemaJson); } catch (e) { insertPayload.schema_json = null; }
        } else {
            insertPayload.schema_json = schemaJson as unknown;
        }
    }

    let articleId: string | null = null;
    let lastInsertError: any = null;
    let payloadForInsert: Record<string, unknown> = { ...insertPayload };

    for (let attempt = 1; attempt <= 3; attempt++) {
        const { data: article, error: articleError } = await supabase
            .from('articles')
            .insert(payloadForInsert)
            .select('id')
            .single();

        if (!articleError && article?.id) {
            articleId = article.id;
            break;
        }

        if (!articleError && !article?.id) {
            lastInsertError = { code: 'RLS_SILENT_BLOCK', message: 'Insert returned null data without error' };
        } else {
            lastInsertError = articleError;
        }

        if (articleError) {
            const errBlob = `${(articleError as any)?.message} ${(articleError as any)?.details}`.toLowerCase();
            const isUnknownColumn = errBlob.includes('could not find') || errBlob.includes('column') || errBlob.includes('does not exist');

            if (isUnknownColumn) {
                for (const col of ['tenant_id', 'schema_json', 'content_type', 'word_count_target']) {
                    if (col in payloadForInsert) delete payloadForInsert[col];
                }
            }
        }

        if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }

    if (!articleId) {
        try {
            await supabase.from('generation_jobs').update({
                status: 'failed',
                error_message: `SAVE_ARTICLE_FAILED: ${lastInsertError?.message || "Check logs"}`,
            }).eq('id', jobId);
        } catch (_) { }

        throw new Error(`CRITICAL_PERSISTENCE_FAILURE`);
    }

    await supabase.from('generation_jobs').update({
        article_id: articleId,
        output: {
            article_id: articleId,
            title,
            total_words: wordCount,
            total_api_calls: totalApiCalls,
            total_cost_usd: totalCostUsd,
            engine_version: 'v2',
            image_prompt: imagePrompt,
        },
        engine_version: 'v2',
    }).eq('id', jobId);

    return { article_id: articleId, html_generated: true, total_words: wordCount };
}

export async function executeSeoScoreStep(
  articleId: string | null,
  title: string,
  content: string,
  keyword: string,
  blogId: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<Record<string, unknown>> {
  if (!articleId) return { skipped: true, reason: 'no_article_id' };
  try {
    const url = `${supabaseUrl}/functions/v1/calculate-content-score`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        articleId,
        title,
        content: content.slice(0, 100_000),
        keyword,
        blogId,
        saveScore: true,
        userInitiated: false,
      }),
    });
    if (!resp.ok) {
      return { success: false, error: `HTTP ${resp.status}` };
    }
    const data = await resp.json();
    return { success: true, score: data?.score ?? data?.totalScore, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
