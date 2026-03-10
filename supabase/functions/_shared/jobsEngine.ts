/**
 * Jobs Engine — Shared Types & Helpers
 * Contratos de payload/output entre todos os job types.
 */

// ─── Status Types ────────────────────────────────────────────
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'dead' | 'cancelled';
export type GraphStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type FunnelStage = 'topo' | 'meio' | 'fundo';

// ─── Job Record ──────────────────────────────────────────────
export interface Job {
  id: string;
  tenant_id: string;
  graph_id: string | null;
  parent_job_id: string | null;
  job_type: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_text: string | null;
  runner_id: string | null;
  try_count: number;
  max_retries: number;
  run_after: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Contratos: article_plan ─────────────────────────────────
export interface ArticlePlanInput {
  tenant_id: string;
  blog_id: string;
  keyword: string;
  city?: string;
  cache_id: string;
  funnel_stage: FunnelStage;
}

export interface ArticlePlanOutput {
  article_id: string;
  outline: {
    title: string;
    slug: string;
    meta_description: string;
    h2: Array<{
      heading: string;
      subheadings: string[];
      target_words: number;
    }>;
    estimated_word_count: number;
  };
  entities: string[];
  entity_coverage_target: number;
}

// ─── Contratos: write_section ────────────────────────────────
export interface WriteSectionInput {
  article_id: string;
  section_index: number;
  outline: ArticlePlanOutput['outline'];
  entities: string[];
  cache_id: string;
}

export interface WriteSectionOutput {
  article_id: string;
  section_index: number;
  html_content: string;
  word_count: number;
  entities_covered: string[];
}

// ─── Contratos: interlink_article ────────────────────────────
export interface InterlinkInput {
  article_id: string;
  blog_id: string;
  tenant_id: string;
}

export interface InterlinkOutput {
  article_id: string;
  links_added: number;
  links: Array<{ anchor: string; target_slug: string }>;
}

// ─── Contratos: seo_finalize ─────────────────────────────────
export interface SeoFinalizeInput {
  article_id: string;
  keyword: string;
  blog_id: string;
}

export interface SeoFinalizeOutput {
  article_id: string;
  seo_score: number;
  schema_markup: Record<string, unknown>;
  meta_optimized: boolean;
}

// ─── Contratos: quality_gate ─────────────────────────────────
export interface QualityGateInput {
  article_id: string;
  blog_id: string;
}

export interface QualityGateOutput {
  article_id: string;
  approved: boolean;
  score: number;
  issues: string[];
  auto_fixable: boolean;
}

// ─── Contratos: publish_article ──────────────────────────────
export interface PublishArticleInput {
  article_id: string;
  blog_id: string;
}

export interface PublishArticleOutput {
  article_id: string;
  published_url: string;
  published_at: string;
}

// ─── Contratos: index_article ────────────────────────────────
export interface IndexArticleInput {
  article_id: string;
  blog_id: string;
  url: string;
}

export interface IndexArticleOutput {
  article_id: string;
  indexnow_submitted: boolean;
  submitted_at: string;
}

// ─── Type Map (job_type → Input/Output) ──────────────────────
export type JobTypeMap = {
  article_plan: { input: ArticlePlanInput; output: ArticlePlanOutput };
  write_section: { input: WriteSectionInput; output: WriteSectionOutput };
  interlink_article: { input: InterlinkInput; output: InterlinkOutput };
  seo_finalize: { input: SeoFinalizeInput; output: SeoFinalizeOutput };
  quality_gate: { input: QualityGateInput; output: QualityGateOutput };
  publish_article: { input: PublishArticleInput; output: PublishArticleOutput };
  index_article: { input: IndexArticleInput; output: IndexArticleOutput };
};

export type JobType = keyof JobTypeMap;

// ─── Edge Function name mapping ──────────────────────────────
export const JOB_TYPE_TO_FUNCTION: Record<JobType, string> = {
  article_plan: 'article-plan',
  write_section: 'write-section',
  interlink_article: 'interlink-article',
  seo_finalize: 'seo-finalize',
  quality_gate: 'quality-gate',
  publish_article: 'publish-article',
  index_article: 'index-article',
};

// ─── Helpers ─────────────────────────────────────────────────
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/** Cria Supabase client com service_role */
export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

/** Claim o próximo job livre da fila */
export async function claimNextJob(
  supabase: SupabaseClient,
  runnerId: string,
): Promise<Job | null> {
  const { data, error } = await supabase.rpc('claim_next_job', {
    p_runner_id: runnerId,
  });
  if (error) throw new Error(`claim_next_job failed: ${error.message}`);
  return data?.[0] ?? null;
}

/** Marca job como concluído */
export async function completeJob(
  supabase: SupabaseClient,
  jobId: string,
  result: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.rpc('complete_job', {
    p_job_id: jobId,
    p_result: result,
  });
  if (error) throw new Error(`complete_job failed: ${error.message}`);
}

/** Marca job como falho (retry automático se possível) */
export async function failJob(
  supabase: SupabaseClient,
  jobId: string,
  errorText: string,
): Promise<void> {
  const { error } = await supabase.rpc('fail_job', {
    p_job_id: jobId,
    p_error: errorText,
  });
  if (error) throw new Error(`fail_job failed: ${error.message}`);
}

/** Cria um grafo de geração de artigo */
export async function buildArticleGraph(
  supabase: SupabaseClient,
  tenantId: string,
  payload: ArticlePlanInput,
  sectionCount = 3,
): Promise<string> {
  const { data, error } = await supabase.rpc('build_article_graph', {
    p_tenant_id: tenantId,
    p_payload: payload,
    p_section_count: sectionCount,
  });
  if (error) throw new Error(`build_article_graph failed: ${error.message}`);
  return data;
}

/** Log de evento customizado */
export async function logJobEvent(
  supabase: SupabaseClient,
  jobId: string,
  tenantId: string,
  eventType: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await supabase.from('job_events').insert({
    job_id: jobId,
    tenant_id: tenantId,
    event_type: eventType,
    message,
    data_json: data ?? {},
  });
}
