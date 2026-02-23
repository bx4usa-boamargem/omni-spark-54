/**
 * Step 5: Image generation (hero + section images)
 * Uses ImageGenPort; depends on Content (for prompts/slots).
 */

import type { PipelineContext, StepResult, ImageSlot } from '../../types';
import type { SuperPageEnginePorts } from '../../ports';
import { getConfig } from '../../config';

/** Build image slots from content/outline: hero + one per section (up to maxSectionImages) */
function buildImageSlots(ctx: PipelineContext): ImageSlot[] {
  const config = getConfig(ctx.input.contentType);
  if (!config.generateSectionImages || !ctx.content || !ctx.outline) {
    return [];
  }
  const slots: ImageSlot[] = [];
  // Hero: from first H2 or title
  const heroPrompt =
    ctx.content.title ||
    ctx.outline.h1 ||
    `${ctx.input.keyword} - ${ctx.input.niche}`;
  slots.push({ context: 'hero', prompt: heroPrompt, alt: ctx.content.title });

  const sections = ctx.outline.h2.slice(0, config.maxSectionImages);
  sections.forEach((section, i) => {
    slots.push({
      context: 'section',
      sectionIndex: i,
      prompt: section.title,
      alt: section.title,
    });
  });
  return slots;
}

export async function runImagesGen(
  ctx: PipelineContext,
  ports: SuperPageEnginePorts
): Promise<StepResult<PipelineContext>> {
  if (!ctx.content) {
    return { ok: false, error: 'CONTENT_GEN required', code: 'MISSING_CONTENT' };
  }
  const config = getConfig(ctx.input.contentType);
  if (!config.generateSectionImages) {
    ctx.imageSlots = [];
    ctx.imageResults = [];
    return { ok: true, data: ctx };
  }
  try {
    const slots = buildImageSlots(ctx);
    ctx.imageSlots = slots;
    const results = await ports.imageGen.generateAll(slots);
    ctx.imageResults = results;
    return { ok: true, data: ctx };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, code: 'IMAGES_GEN_FAILED' };
  }
}
