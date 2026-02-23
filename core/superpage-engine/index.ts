/**
 * Superpage Engine — Public API
 *
 * Clean architecture; no legacy code. Inject ports (adapters) when running.
 *
 * Usage:
 *   import { runSuperPagePipeline } from './core/superpage-engine';
 *   const result = await runSuperPagePipeline(input, ports);
 */

import type { SuperPageJobInput, PipelineContext } from './types';
import type { SuperPageEnginePorts } from './ports';
import { getConfig } from './config';
import { runPipeline } from './pipeline/runner';

export type { PipelineResult } from './pipeline/runner';
export type { SuperPageEnginePorts } from './ports';
export type {
  SuperPageJobInput,
  PipelineContext,
  ContentType,
  SerpAnalysisResult,
  OutlineResult,
  SemanticEntities,
  ContentResult,
  ImageResult,
  SeoScoreResult,
  PersistedArticle,
  PipelineConfig,
} from './types';
export { getConfig, DEFAULT_CONFIG } from './config';
export { STEP_ORDER } from './pipeline/runner';

/**
 * Run the full Super Page / Article pipeline.
 * @param input Job input (keyword, blogId, contentType, locale, niche, ...)
 * @param ports Injected adapters (serp, llm, imageGen, seoScore, storage)
 * @param jobId Optional job id for tracing
 */
export async function runSuperPagePipeline(
  input: SuperPageJobInput,
  ports: SuperPageEnginePorts,
  jobId?: string
) {
  const ctx: PipelineContext = {
    jobId: jobId ?? crypto.randomUUID(),
    input,
  };
  return runPipeline(ctx, ports);
}
