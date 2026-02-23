/**
 * Superpage Engine — Pipeline runner
 * Runs steps in order; stops on first failure. No legacy code.
 */

import type { PipelineContext, StepName } from '../types';
import type { SuperPageEnginePorts } from '../ports';
import {
  runSerpAnalysis,
  runOutlineGen,
  runEntities,
  runContentGen,
  runImagesGen,
  runSeoScore,
  runSave,
  runPublish,
} from './steps';

const STEP_ORDER: StepName[] = [
  'SERP_ANALYSIS',
  'OUTLINE_GEN',
  'ENTITIES',
  'CONTENT_GEN',
  'IMAGES_GEN',
  'SEO_SCORE',
  'SAVE',
  'PUBLISH',
];

const STEP_RUNNERS = {
  SERP_ANALYSIS: runSerpAnalysis,
  OUTLINE_GEN: runOutlineGen,
  ENTITIES: runEntities,
  CONTENT_GEN: runContentGen,
  IMAGES_GEN: runImagesGen,
  SEO_SCORE: runSeoScore,
  SAVE: runSave,
  PUBLISH: runPublish,
} as const;

export interface PipelineResult {
  success: boolean;
  context?: PipelineContext;
  failedStep?: StepName;
  error?: string;
  code?: string;
}

export async function runPipeline(
  ctx: PipelineContext,
  ports: SuperPageEnginePorts
): Promise<PipelineResult> {
  let currentContext = ctx;

  for (const stepName of STEP_ORDER) {
    const run = STEP_RUNNERS[stepName];
    const result = await run(currentContext, ports);

    if (!result.ok) {
      return {
        success: false,
        failedStep: stepName,
        error: result.error,
        code: result.code,
        context: currentContext,
      };
    }

    currentContext = result.data as PipelineContext;
  }

  return {
    success: true,
    context: currentContext,
  };
}

export { STEP_ORDER };
