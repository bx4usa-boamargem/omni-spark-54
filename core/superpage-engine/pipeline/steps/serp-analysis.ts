/**
 * Step 1: SERP Analysis
 * Uses SerpPort; no legacy code.
 */

import type { PipelineContext, StepResult } from '../../types';
import type { SuperPageEnginePorts } from '../../ports';

export async function runSerpAnalysis(
  ctx: PipelineContext,
  ports: SuperPageEnginePorts
): Promise<StepResult<PipelineContext>> {
  const { input } = ctx;
  try {
    const serp = await ports.serp.analyze(input.keyword, {
      language: input.locale.language,
      city: input.locale.city,
    });
    ctx.serp = serp;
    return { ok: true, data: ctx };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, code: 'SERP_ANALYSIS_FAILED' };
  }
}
