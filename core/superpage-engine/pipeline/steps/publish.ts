/**
 * Step 8: Publish (optional — set status to published)
 * Uses StoragePort; depends on Save.
 */

import type { PipelineContext, StepResult } from '../../types';
import type { SuperPageEnginePorts } from '../../ports';
import { getConfig } from '../../config';

export async function runPublish(
  ctx: PipelineContext,
  ports: SuperPageEnginePorts
): Promise<StepResult<PipelineContext>> {
  if (!ctx.article) {
    return { ok: false, error: 'SAVE required', code: 'MISSING_ARTICLE' };
  }
  const config = getConfig(ctx.input.contentType);
  if (!config.publishAfterSave) {
    return { ok: true, data: ctx };
  }
  try {
    await ports.storage.publishArticle(ctx.article.id);
    return { ok: true, data: ctx };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, code: 'PUBLISH_FAILED' };
  }
}
