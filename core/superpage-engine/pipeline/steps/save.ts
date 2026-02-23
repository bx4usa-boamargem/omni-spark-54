/**
 * Step 7: Save article to storage (draft)
 * Uses StoragePort; depends on Content and optional Image results.
 */

import type { PipelineContext, StepResult } from '../../types';
import type { SuperPageEnginePorts } from '../../ports';

export async function runSave(
  ctx: PipelineContext,
  ports: SuperPageEnginePorts
): Promise<StepResult<PipelineContext>> {
  if (!ctx.content) {
    return { ok: false, error: 'CONTENT_GEN required', code: 'MISSING_CONTENT' };
  }
  const heroImage = ctx.imageResults?.find((r) => r.context === 'hero');
  try {
    const article = await ports.storage.saveArticle({
      blogId: ctx.input.blogId,
      title: ctx.content.title,
      slug: slugify(ctx.content.title),
      content: ctx.content.htmlContent,
      metaDescription: ctx.content.metaDescription,
      faq: ctx.content.faq,
      schemaJson: ctx.content.schemaFaq,
      featuredImageUrl: heroImage?.url,
      featuredImageAlt: heroImage?.alt,
      contentImages: ctx.imageResults?.filter((r) => r.context === 'section') ?? [],
      keywords: [ctx.input.keyword],
      contentType: ctx.input.contentType,
      readingTimeMinutes: Math.ceil(ctx.content.wordCount / 200),
      cta: ctx.input.editorialContext?.cta,
    });
    ctx.article = article;
    return { ok: true, data: ctx };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, code: 'SAVE_FAILED' };
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 70);
}
