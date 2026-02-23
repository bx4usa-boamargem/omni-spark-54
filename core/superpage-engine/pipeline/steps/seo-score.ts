/**
 * Step 6: SEO score (optional)
 * Uses SeoScorePort; depends on Content (and optionally SERP).
 */

import type { PipelineContext, StepResult } from '../../types';
import type { SuperPageEnginePorts } from '../../ports';
import { getConfig } from '../../config';

export async function runSeoScore(
  ctx: PipelineContext,
  ports: SuperPageEnginePorts
): Promise<StepResult<PipelineContext>> {
  if (!ctx.content) {
    return { ok: false, error: 'CONTENT_GEN required', code: 'MISSING_CONTENT' };
  }
  const config = getConfig(ctx.input.contentType);
  if (!config.runSeoScore) {
    return { ok: true, data: ctx };
  }
  try {
    const seoScore = await ports.seoScore.score(ctx.content, ctx.serp);
    ctx.seoScore = seoScore;
    return { ok: true, data: ctx };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, code: 'SEO_SCORE_FAILED' };
  }
}
