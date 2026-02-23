/**
 * Step 3: Semantic entities extraction
 * Uses LlmPort; depends on SERP + Outline.
 */

import type { PipelineContext, StepResult } from '../../types';
import type { SuperPageEnginePorts } from '../../ports';

export async function runEntities(
  ctx: PipelineContext,
  ports: SuperPageEnginePorts
): Promise<StepResult<PipelineContext>> {
  if (!ctx.serp) {
    return { ok: false, error: 'SERP_ANALYSIS required', code: 'MISSING_SERP' };
  }
  if (!ctx.outline) {
    return { ok: false, error: 'OUTLINE_GEN required', code: 'MISSING_OUTLINE' };
  }
  try {
    const entities = await ports.llm.extractEntities(ctx.input, ctx.serp, ctx.outline);
    ctx.entities = entities;
    return { ok: true, data: ctx };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, code: 'ENTITIES_FAILED' };
  }
}
