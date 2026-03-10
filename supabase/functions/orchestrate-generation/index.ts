import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { JobInput } from "./types/agentTypes.ts";

import { executeInputValidation, executeSaveArticle, executeSeoScoreStep } from "./agents/coreSteps.ts";
import { executeSerpScout } from "./agents/serpScout.ts";
import { executeEntityMapper } from "./agents/entityMapper.ts";
import { executeTrendAndCompetitor } from "./agents/trendAndCompetitor.ts";
import { executeBlueprintBuilder } from "./agents/blueprintBuilder.ts";
import { executeSectionWriter, executeEntityCoverage } from "./agents/sectionWriter.ts";
import { executeSchemaAndQuality } from "./agents/schemaAndQuality.ts";
import { executeImageGenerator } from "./agents/imageGenerator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZOMBIE_THRESHOLD_MS = 20 * 60 * 1000;
const LOCK_TTL_MS = 120_000;

const PUBLIC_STAGE_MAP: Record<string, { stage: string; progress: number; message: string }> = {
  'INPUT_VALIDATION': { stage: 'ANALYZING_MARKET', progress: 5, message: 'Inicializando...' },
  'SERP_SCOUT': { stage: 'ANALYZING_MARKET', progress: 15, message: 'Scout: Analisando mercado local e concorrentes (Agent 1)...' },
  'ENTITY_MAPPER': { stage: 'ANALYZING_MARKET', progress: 25, message: 'Extraindo entidades semânticas E-E-A-T (Agent 2)...' },
  'TREND_ANALYST': { stage: 'ANALYZING_MARKET', progress: 35, message: 'Analisando tendências e lacunas (Agent 3 & 4)...' },
  'BLUEPRINT_BUILDER': { stage: 'ANALYZING_MARKET', progress: 45, message: 'Montando o Blueprint SEO (Agent 5)...' },
  'SECTION_WRITER': { stage: 'WRITING_CONTENT', progress: 70, message: 'Escrevendo artigo por Chunking (Agent 6)...' },
  'SAVE_ARTICLE': { stage: 'FINALIZING', progress: 80, message: 'Salvando artigo...' },
  'IMAGE_GEN': { stage: 'FINALIZING', progress: 90, message: 'Images: Inserindo Mídia Contextual...' },
  'QUALITY_GATE': { stage: 'FINALIZING', progress: 95, message: 'Quality Gate & Schema Finalizer (Agent 7 & 8)...' },
};

async function updatePublicStatus(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  stepName: string,
  completed: boolean,
  lockId?: string,
) {
  const mapping = PUBLIC_STAGE_MAP[stepName];
  if (!mapping) return;

  const updateData: Record<string, unknown> = {
    public_stage: mapping.stage,
    public_progress: mapping.progress,
    public_message: mapping.message,
    public_updated_at: new Date().toISOString(),
  };

  if (lockId) {
    updateData.locked_at = new Date().toISOString();
  }

  await supabase.from('generation_jobs').update(updateData).eq('id', jobId);
}

async function createStepOrFail(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  stepName: string,
  input: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase
    .from('generation_steps')
    .insert({
      job_id: jobId,
      step_name: stepName,
      status: 'running',
      started_at: new Date().toISOString(),
      input,
    })
    .select('id')
    .maybeSingle();

  if (error || !data?.id) {
    console.error(`[STEP_INSERT_FAILED] ${stepName} job=${jobId}`, error);
    throw new Error(`STEP_INSERT_RETURNED_NULL:${stepName}:${error?.message || 'no_id'}`);
  }
  return data.id;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`STEP_TIMEOUT: ${label} exceeded ${ms}ms`)), ms)
    ),
  ]);
}

async function orchestrate(
  jobId: string,
  supabase: ReturnType<typeof createClient>,
  userClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceKey: string,
): Promise<void> {
  const jobStart = Date.now();
  let totalApiCalls = 0;
  let totalCostUsd = 0;
  let lockId: string | null = null;
  let heartbeatInterval: any = null;
  let articleId: string | null = null;

  try {
    const { data: job, error: jobError } = await supabase.from('generation_jobs').select('*').eq('id', jobId).single();
    if (jobError || !job) {
      console.error(`[ORCHESTRATOR] Job ${jobId} not found:`, jobError);
      return;
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return;
    }

    const jobType = ((job.job_type ?? job.input?.job_type) || 'article') as 'article' | 'super_page';
    totalApiCalls = job.total_api_calls || 0;
    totalCostUsd = job.cost_usd || 0;

    // Remove stalls
    try {
      const twentyMinutesAgo = new Date(Date.now() - ZOMBIE_THRESHOLD_MS).toISOString();
      await supabase
        .from('generation_jobs')
        .update({
          status: 'failed',
          error_message: 'JOB_STALE_TIMEOUT',
          public_message: 'Job expirou por inatividade.',
          completed_at: new Date().toISOString(),
          locked_at: null,
          locked_by: null
        })
        .eq('user_id', job.user_id)
        .eq('status', 'running')
        .lt('started_at', twentyMinutesAgo)
        .neq('id', jobId);
    } catch (e) {
      console.error('[WATCHDOG_ERROR]', e);
    }

    const jobInput: JobInput = {
      ...(job.input as Record<string, any> || {}),
      job_type: jobType,
      job_id: jobId,
      blog_id: (job.blog_id as string) || (job.input as any)?.blog_id || null,
      user_id: (job.user_id as string) || (job.input as any)?.user_id || null,
      tenant_id: (job.input as any)?.tenant_id || null,
      keyword: (job.input as any)?.keyword || '',
      city: (job.input as any)?.city || '',
    };

    if (job.locked_at) {
      const lockAge = Date.now() - new Date(job.locked_at).getTime();
      if (lockAge < LOCK_TTL_MS) return;
      await supabase.from('generation_jobs').update({ locked_at: null, locked_by: null }).eq('id', jobId);
    }

    lockId = crypto.randomUUID();
    const { error: lockError } = await supabase.from('generation_jobs')
      .update({
        locked_at: new Date().toISOString(),
        locked_by: lockId,
        status: 'running',
        started_at: job.started_at || new Date().toISOString(),
        public_stage: 'ANALYZING_MARKET',
        public_progress: 5,
        public_message: 'Inicializando inteligência artificial...',
        public_updated_at: new Date().toISOString(),
      })
      .eq('id', jobId).is('locked_by', null);

    if (lockError) return;

    heartbeatInterval = setInterval(async () => {
      try {
        await supabase.from('generation_jobs')
          .update({ locked_at: new Date().toISOString() })
          .eq('id', jobId).eq('locked_by', lockId);
      } catch (_) { }
    }, 15_000);

    // STEP 1: VALIDATION
    await updatePublicStatus(supabase, jobId, 'INPUT_VALIDATION', false, lockId);
    const valStepId = await createStepOrFail(supabase, jobId, 'INPUT_VALIDATION', { job_input: job.input });
    const valOutput = executeInputValidation(jobInput);
    await supabase.from('generation_steps').update({
      status: 'completed', output: valOutput, completed_at: new Date().toISOString()
    }).eq('id', valStepId);
    await updatePublicStatus(supabase, jobId, 'INPUT_VALIDATION', true, lockId);

    // STEP 2: LOCAL SERP SCOUT (AGENT 1)
    await updatePublicStatus(supabase, jobId, 'SERP_SCOUT', false, lockId);
    const scoutStepId = await createStepOrFail(supabase, jobId, 'SERP_ANALYSIS', { keyword: jobInput.keyword });
    const scoutResult = await withTimeout(executeSerpScout(jobInput, supabaseUrl, serviceKey), 45_000, 'SERP_SCOUT');
    totalApiCalls++;
    totalCostUsd += scoutResult.aiResult.costUsd || 0;
    await supabase.from('generation_steps').update({
      status: 'completed', output: scoutResult.output, cost_usd: scoutResult.aiResult.costUsd, completed_at: new Date().toISOString()
    }).eq('id', scoutStepId);
    await updatePublicStatus(supabase, jobId, 'SERP_SCOUT', true, lockId);

    // STEP 3: ENTITY MAPPER (AGENT 2)
    await updatePublicStatus(supabase, jobId, 'ENTITY_MAPPER', false, lockId);
    const mapperStepId = await createStepOrFail(supabase, jobId, 'ENTITY_EXTRACTION', { keyword: jobInput.keyword });
    const mapperResult = await withTimeout(executeEntityMapper(jobInput, scoutResult.output.serp_summary, supabaseUrl, serviceKey), 40_000, 'ENTITY_MAPPER');
    totalApiCalls++;
    totalCostUsd += mapperResult.aiResult.costUsd || 0;
    await supabase.from('generation_steps').update({
      status: 'completed', output: mapperResult.output, cost_usd: mapperResult.aiResult.costUsd, completed_at: new Date().toISOString()
    }).eq('id', mapperStepId);
    await updatePublicStatus(supabase, jobId, 'ENTITY_MAPPER', true, lockId);

    // STEP 4: TREND & COMPETITOR INTEL (AGENT 3 & 4)
    await updatePublicStatus(supabase, jobId, 'TREND_ANALYST', false, lockId);
    const gapStepId = await createStepOrFail(supabase, jobId, 'SERP_GAP_ANALYSIS', { keyword: jobInput.keyword });
    const trendResult = await withTimeout(executeTrendAndCompetitor(jobInput, scoutResult.output.serp_summary, supabaseUrl, serviceKey), 45_000, 'TREND_ANALYST');
    totalApiCalls++;
    totalCostUsd += trendResult.aiResult.costUsd || 0;
    await supabase.from('generation_steps').update({
      status: 'completed', output: trendResult.output, cost_usd: trendResult.aiResult.costUsd, completed_at: new Date().toISOString()
    }).eq('id', gapStepId);
    await updatePublicStatus(supabase, jobId, 'TREND_ANALYST', true, lockId);

    // STEP 5: BLUEPRINT BUILDER (AGENT 5)
    await updatePublicStatus(supabase, jobId, 'BLUEPRINT_BUILDER', false, lockId);
    const outlineStepId = await createStepOrFail(supabase, jobId, 'OUTLINE_GEN', { keyword: jobInput.keyword });
    const blueprintResult = await withTimeout(executeBlueprintBuilder(jobInput, scoutResult.output, mapperResult.output.entities, trendResult.output, supabaseUrl, serviceKey), 45_000, 'BLUEPRINT_BUILDER'); // Reduced from 60s
    totalApiCalls++;
    totalCostUsd += blueprintResult.aiResult.costUsd || 0;
    const outline = blueprintResult.output.outline;
    await supabase.from('generation_steps').update({
      status: 'completed', output: blueprintResult.output, cost_usd: blueprintResult.aiResult.costUsd, completed_at: new Date().toISOString()
    }).eq('id', outlineStepId);
    await updatePublicStatus(supabase, jobId, 'BLUEPRINT_BUILDER', true, lockId);

    // COVERAGE ALIGNMENT
    const entityCoverage = executeEntityCoverage(outline, mapperResult.output.entities);

    // STEP 6: SECTION WRITER (AGENT 6 - CHUNKING)
    await updatePublicStatus(supabase, jobId, 'SECTION_WRITER', false, lockId);
    const contentStepId = await createStepOrFail(supabase, jobId, 'CONTENT_GEN', { keyword: jobInput.keyword });
    // Deno runtime has hard limits. Capping section writer to 120_000 (2 minutes) to leave room for final steps.
    const contentResult = await withTimeout(executeSectionWriter(jobInput, outline, mapperResult.output.entities, entityCoverage, supabaseUrl, serviceKey), 120_000, 'SECTION_WRITER');
    totalApiCalls += outline.h2.length + 2;
    totalCostUsd += contentResult.rawCostUsd || 0;
    const articleData = contentResult.output as any;
    await supabase.from('generation_steps').update({
      status: 'completed', output: { title: articleData.title }, cost_usd: contentResult.rawCostUsd, completed_at: new Date().toISOString()
    }).eq('id', contentStepId);
    await updatePublicStatus(supabase, jobId, 'SECTION_WRITER', true, lockId);

    // STEP 7: SAVE ARTICLE
    await updatePublicStatus(supabase, jobId, 'SAVE_ARTICLE', false, lockId);
    const saveOutput = await executeSaveArticle(jobId, articleData, jobInput, supabase, userClient, totalApiCalls, totalCostUsd, jobType);
    if (!saveOutput.article_id) throw new Error("Failed to save article_id");
    articleId = saveOutput.article_id as string;
    await updatePublicStatus(supabase, jobId, 'SAVE_ARTICLE', true, lockId);

    // DECOUPLED IMAGE GEN — timeout de 90s para cobrir Google Places + upload Supabase Storage
    await updatePublicStatus(supabase, jobId, 'IMAGE_GEN', false, lockId);
    const imageStepId = await createStepOrFail(supabase, jobId, 'IMAGE_GEN', { article_id: articleId });
    try {
      // 90s: Google Places textsearch(8s) + photo(8s) + Gemini IA(20s) + upload(5s) × até 6 seções
      const imageResult = await withTimeout(
        executeImageGenerator(articleId, articleData, outline, jobInput, supabase, userClient),
        90_000,
        'IMAGE_GEN'
      );
      await supabase.from('generation_steps').update({
        status: 'completed',
        output: imageResult,
        completed_at: new Date().toISOString(),
      }).eq('id', imageStepId);
      console.log(`[IMAGE_GEN] ✅ heroUrl=${imageResult.heroUrl ?? 'none'} | sections=${imageResult.sectionCount ?? 0}`);
    } catch (e) {
      const imgErr = e instanceof Error ? e.message : String(e);
      console.error('[IMAGE_GEN] ❌ Falhou ou timeout — artigo salvo sem imagens. Causa:', imgErr);
      await supabase.from('generation_steps').update({
        status: 'failed',
        output: { error: imgErr },
        completed_at: new Date().toISOString(),
      }).eq('id', imageStepId);
      // Não propaga — artigo já salvo; imagens são otimização, não bloqueio
    }
    await updatePublicStatus(supabase, jobId, 'IMAGE_GEN', true, lockId);

    // STEP 8: SCHEMA & QUALITY GATE (AGENT 7 & 8)
    await updatePublicStatus(supabase, jobId, 'QUALITY_GATE', false, lockId);
    const qgStepId = await createStepOrFail(supabase, jobId, 'QUALITY_GATE', { article_id: articleId });
    try {
      const seoScore = await withTimeout(
        executeSeoScoreStep(articleId, articleData.title || jobInput.keyword, articleData.html_article || '', jobInput.keyword || '', jobInput.blog_id as string, supabaseUrl, serviceKey),
        30_000,
        'SEO_SCORE'
      );
      const qgOutput = await withTimeout(
        executeSchemaAndQuality(articleId, jobInput.blog_id as string, articleData, entityCoverage.coverageScore, seoScore, jobType, jobInput, supabase, userClient),
        30_000,
        'SCHEMA_QUALITY'
      );
      await supabase.from('generation_steps').update({
        status: 'completed',
        output: { seo_score: seoScore, quality_gate: qgOutput },
        completed_at: new Date().toISOString(),
      }).eq('id', qgStepId);
      console.log(`[QUALITY_GATE] ✅ SEO Score: ${seoScore}`);
    } catch (e) {
      const qgErr = e instanceof Error ? e.message : String(e);
      console.error('[QUALITY_GATE] ❌ Falhou — artigo salvo sem score finalizado. Causa:', qgErr);
      await supabase.from('generation_steps').update({
        status: 'failed',
        output: { error: qgErr },
        completed_at: new Date().toISOString(),
      }).eq('id', qgStepId);
      // Não propaga — artigo salvo; score é otimização, não bloqueio
    }
    await updatePublicStatus(supabase, jobId, 'QUALITY_GATE', true, lockId);

    // COMPLETE
    await supabase.from('generation_jobs').update({
      status: 'completed',
      article_id: articleId,
      cost_usd: totalCostUsd,
      total_api_calls: totalApiCalls,
      completed_at: new Date().toISOString(),
      public_stage: 'FINALIZING',
      public_progress: 100,
      public_message: 'Artigo pronto!',
      public_updated_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null
    }).eq('id', jobId);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ORCHESTRATOR:V2:FATAL] job_id=${jobId}`, errorMsg);

    const finalStatus = articleId ? 'completed' : 'failed';
    const finalMessage = articleId ? 'Artigo gerado em modo rascunho — otimização recomendada.' : 'Ocorreu um erro durante a geração. Tente novamente.';

    await supabase.from('generation_jobs').update({
      status: finalStatus,
      article_id: articleId,
      error_message: articleId ? `Recovered from error: ${errorMsg}` : `FATAL_ERROR: ${errorMsg}`,
      public_message: finalMessage,
      completed_at: new Date().toISOString(),
      public_stage: 'FINALIZING',
      public_progress: articleId ? 100 : 0,
      locked_at: null,
      locked_by: null
    }).eq('id', jobId);

  } finally {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (lockId) {
      await supabase.from('generation_jobs').update({ locked_at: null, locked_by: null }).eq('id', jobId).eq('locked_by', lockId);
    }
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get("Authorization");
  let userClient = supabase;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
  }

  try {
    const { job_id } = await req.json();
    if (!job_id) return new Response(JSON.stringify({ error: "job_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: existingJob } = await supabase.from('generation_jobs').select('status').eq('id', job_id).single();
    if (existingJob && ['running', 'completed', 'failed'].includes(existingJob.status)) {
      return new Response(JSON.stringify({ skipped: true, reason: `Job already ${existingJob.status}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await orchestrate(job_id, supabase, userClient, supabaseUrl, serviceKey);
    return new Response(JSON.stringify({ success: true, job_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
