/**
 * Step 2: Outline generation (H1, H2[], H3[])
 * Uses LlmPort; depends on SERP step.
 */

import type { PipelineContext, StepResult } from '../../types';
import type { SuperPageEnginePorts } from '../../ports';

export async function runOutlineGen(
  ctx: PipelineContext,
  ports: SuperPageEnginePorts
): Promise<StepResult<PipelineContext>> {
  if (!ctx.serp) {
    return { ok: false, error: 'SERP_ANALYSIS required before OUTLINE_GEN', code: 'MISSING_SERP' };
  }
  try {
    const outline = await ports.llm.generateOutline(ctx.input, ctx.serp);
    ctx.outline = outline;
    return { ok: true, data: ctx };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, code: 'OUTLINE_GEN_FAILED' };
  }
}
