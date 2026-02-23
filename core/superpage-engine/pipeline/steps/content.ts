/**
 * Step 4: Content generation (HTML, FAQ, meta)
 * Uses LlmPort; depends on SERP, Outline, Entities.
 */

import type { PipelineContext, StepResult } from '../../types';
import type { SuperPageEnginePorts } from '../../ports';
import { getConfig } from '../../config';

export async function runContentGen(
  ctx: PipelineContext,
  ports: SuperPageEnginePorts
): Promise<StepResult<PipelineContext>> {
  if (!ctx.serp || !ctx.outline || !ctx.entities) {
    return {
      ok: false,
      error: 'SERP, OUTLINE and ENTITIES required',
      code: 'MISSING_DEPS',
    };
  }
  const config = getConfig(ctx.input.contentType);
  try {
    const content = await ports.llm.generateContent(
      ctx.input,
      ctx.serp,
      ctx.outline,
      ctx.entities,
      { wordCountMin: config.wordCountMin, wordCountMax: config.wordCountMax }
    );
    ctx.content = content;
    return { ok: true, data: ctx };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, code: 'CONTENT_GEN_FAILED' };
  }
}
