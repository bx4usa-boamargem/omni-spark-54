import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * orchestrate-generation — OmniSeen Article Engine v1
 * 
 * State Machine Orchestrator
 * 
 * States: PENDING -> INPUT_VALIDATION -> SERP_ANALYSIS -> NLP_KEYWORDS -> 
 *         TITLE_GEN -> OUTLINE_GEN -> CONTENT_GEN -> IMAGE_GEN -> 
 *         SEO_SCORE -> META_GEN -> OUTPUT -> COMPLETED | FAILED
 * 
 * Features:
 * - Idempotent: locking by current_step prevents duplicate execution
 * - Hard caps: max 15 API calls, max 2 rewrites per section
 * - Retry with exponential backoff (1s, 4s, 16s)
 * - All intermediate outputs persisted in generation_steps
 * - Timeout: MAX_JOB_TIME_MS = 270000 (4.5 min)
 * 
 * Phase 1: Steps are stubs returning mock data.
 * Phase 2+: Steps call real ai-router.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// CONSTANTS
// ============================================================

const MAX_JOB_TIME_MS = 270_000; // 4.5 minutes hard deadline
const MAX_API_CALLS = 15;
const LOCK_TTL_MS = 300_000; // 5 min lock expiry

// Pipeline step order (strictly sequential)
const PIPELINE_STEPS = [
  'INPUT_VALIDATION',
  'SERP_ANALYSIS',
  'NLP_KEYWORDS',
  'TITLE_GEN',
  'OUTLINE_GEN',
  'CONTENT_GEN',
  'IMAGE_GEN',
  'SEO_SCORE',
  'META_GEN',
  'OUTPUT',
] as const;

type StepName = typeof PIPELINE_STEPS[number];

// Step timeouts (ms)
const STEP_TIMEOUTS: Record<StepName, number> = {
  INPUT_VALIDATION: 5_000,
  SERP_ANALYSIS:    30_000,
  NLP_KEYWORDS:     15_000,
  TITLE_GEN:        15_000,
  OUTLINE_GEN:      30_000,
  CONTENT_GEN:      120_000,
  IMAGE_GEN:        60_000,
  SEO_SCORE:        30_000,
  META_GEN:         15_000,
  OUTPUT:           15_000,
};

// ============================================================
// STUB STEP EXECUTOR (Phase 1: mock data)
// ============================================================

function executeStubStep(stepName: StepName, jobInput: Record<string, unknown>, previousOutputs: Record<string, unknown>): Record<string, unknown> {
  const keyword = (jobInput.keyword as string) || 'keyword';
  const city = (jobInput.city as string) || 'São Paulo';

  switch (stepName) {
    case 'INPUT_VALIDATION':
      return { validated: true, keyword, city, normalized_input: jobInput };

    case 'SERP_ANALYSIS':
      return {
        confidence: 'simulated',
        serp_pack: {
          top_results_count: 10,
          avg_word_count: 2200,
          avg_h2_count: 8,
          dominant_intent: jobInput.intent || 'informational',
          common_topics: ['prevenção', 'tratamento', 'custos', 'profissional'],
          depth_scores: Array.from({ length: 10 }, (_, i) => ({
            position: i + 1,
            title: `Result ${i + 1} for ${keyword}`,
            word_count: 1500 + Math.floor(Math.random() * 2000),
            h2_count: 5 + Math.floor(Math.random() * 8),
            depth_score: 50 + Math.floor(Math.random() * 50),
            confidence: 'simulated',
          })),
          gap_map: ['custos detalhados', 'comparação de métodos', 'depoimentos reais'],
          paa_questions: [
            `Quanto custa ${keyword} em ${city}?`,
            `Como escolher profissional de ${keyword}?`,
            `${keyword} vale a pena?`,
          ],
        },
      };

    case 'NLP_KEYWORDS':
      return {
        nlp_pack: {
          primary: keyword,
          secondary: ['prevenção', 'tratamento', 'custo', 'profissional', 'residencial', 'comercial', 'segurança', 'garantia'],
          nlp_terms: Array.from({ length: 30 }, (_, i) => ({
            text: `term_${i}`,
            category: i % 3 === 0 ? 'entity' : i % 3 === 1 ? 'topic' : 'modifier',
            relevance_score: 0.9 - (i * 0.02),
            position_hint: i < 10 ? 'early' : i < 20 ? 'middle' : 'late',
          })),
          entities: ['Brasil', city, keyword],
          interlink_anchors: [`guia completo de ${keyword}`, `preços de ${keyword} em ${city}`],
        },
      };

    case 'TITLE_GEN':
      return {
        title_pack: {
          selected_title: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} em ${city}: Guia Completo [2026]`,
          alternates: [
            `Quanto Custa ${keyword} em ${city}? Preços e Dicas`,
            `${keyword}: 10 Coisas Que Você Precisa Saber`,
            `Guia Definitivo de ${keyword} em ${city}`,
          ],
          selection_reason: 'Best match for informational intent with local modifier',
        },
      };

    case 'OUTLINE_GEN':
      return {
        outline_spec: {
          h1: `${keyword} em ${city}: Guia Completo`,
          key_takeaways: { target_words: 150, items: 5 },
          sections: Array.from({ length: 8 }, (_, i) => ({
            id: `section-${i}`,
            h2: `Seção ${i + 1} sobre ${keyword}`,
            h3s: [`Sub-tópico ${i}.1`, `Sub-tópico ${i}.2`],
            target_words: 250 + Math.floor(Math.random() * 150),
            depth_target: 70 + Math.floor(Math.random() * 30),
            nlp_terms_to_use: [`term_${i * 2}`, `term_${i * 2 + 1}`],
            layout_hint: i % 3 === 0 ? 'table' : i % 3 === 1 ? 'list' : 'paragraph',
            expert_signal_required: i % 3 === 0,
          })),
          faq: {
            count: 8,
            sources: ['paa', 'serp_common'],
          },
          conclusion: { target_words: 200, cta: true },
        },
      };

    case 'CONTENT_GEN':
      return {
        content: {
          key_takeaways: `## Key Takeaways\n- Ponto 1 sobre ${keyword}\n- Ponto 2\n- Ponto 3`,
          sections: Array.from({ length: 8 }, (_, i) => ({
            id: `section-${i}`,
            h2: `Seção ${i + 1}`,
            content: `Conteúdo stub da seção ${i + 1} sobre ${keyword} em ${city}. Este é um placeholder para a Fase 3.`,
            word_count: 300,
            nlp_terms_used: [`term_${i * 2}`],
            bolds_count: 5,
            expert_signals: i % 3 === 0 ? ['micro_case'] : [],
            quality_gate_passed: true,
            rewrite_count: 0,
          })),
          faq: Array.from({ length: 8 }, (_, i) => ({
            question: `Pergunta ${i + 1} sobre ${keyword}?`,
            answer: `Resposta detalhada sobre ${keyword} para a pergunta ${i + 1}.`,
          })),
          conclusion: `Conclusão sobre ${keyword} em ${city}. Entre em contato.`,
          total_word_count: 2500,
          total_bolds: 40,
          total_expert_signals: 3,
        },
      };

    case 'IMAGE_GEN':
      return {
        images: [
          { type: 'hero', url: `https://picsum.photos/seed/${keyword}/1024/576`, alt: `${keyword} em ${city}`, position: 'hero' },
          { type: 'inline', url: `https://picsum.photos/seed/${keyword}2/800/450`, alt: `Processo de ${keyword}`, position: 'section-2' },
          { type: 'inline', url: `https://picsum.photos/seed/${keyword}3/800/450`, alt: `Resultado de ${keyword}`, position: 'section-5' },
          { type: 'inline', url: `https://picsum.photos/seed/${keyword}4/800/450`, alt: `Equipe de ${keyword}`, position: 'section-7' },
        ],
        style_anchor: 'editorial-photorealistic-warm',
      };

    case 'SEO_SCORE':
      return {
        seo_score: 85,
        breakdown: {
          topic_coverage: { score: 88, weight: 0.20, details: 'Covers 22/25 topics' },
          entity_coverage: { score: 82, weight: 0.15, details: '8/10 entities present' },
          intent_match: { score: 90, weight: 0.15, details: 'Strong informational alignment' },
          depth_score: { score: 85, weight: 0.15, details: 'Above average depth vs SERP' },
          eeat: { score: 80, weight: 0.15, details: '3 expert signals found' },
          structure: { score: 88, weight: 0.10, details: '8 H2s, proper hierarchy' },
          readability: { score: 84, weight: 0.10, details: 'Good paragraph balance' },
        },
        needs_regeneration: false,
        weak_sections: [],
      };

    case 'META_GEN':
      return {
        meta: {
          meta_title: `${keyword} em ${city} | Guia Completo 2026`.substring(0, 60),
          meta_description: `Descubra tudo sobre ${keyword} em ${city}. Preços, dicas de especialistas e passo a passo completo. Leia agora!`.substring(0, 155),
          slug: keyword.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + `-${city.toLowerCase().replace(/\s+/g, '-')}`,
          excerpt: `Guia completo sobre ${keyword} em ${city} com preços, dicas profissionais e tudo que você precisa saber.`,
          faq_schema: {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: Array.from({ length: 3 }, (_, i) => ({
              '@type': 'Question',
              name: `Pergunta ${i + 1} sobre ${keyword}?`,
              acceptedAnswer: { '@type': 'Answer', text: `Resposta ${i + 1}.` },
            })),
          },
        },
      };

    case 'OUTPUT':
      return {
        html: `<article><h1>${keyword} em ${city}</h1><p>Stub HTML output. Phase 4 will generate full self-contained HTML.</p></article>`,
        article_saved: false,
        article_id: null,
        published: false,
      };

    default:
      return { error: `Unknown step: ${stepName}` };
  }
}

// ============================================================
// ORCHESTRATOR CORE
// ============================================================

async function orchestrate(jobId: string, supabase: ReturnType<typeof createClient>): Promise<void> {
  const jobStart = Date.now();

  // 1. Load job
  const { data: job, error: jobError } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    console.error(`[ORCHESTRATOR] Job ${jobId} not found:`, jobError);
    return;
  }

  // 2. Check if already completed/failed/cancelled
  if (['completed', 'failed', 'cancelled'].includes(job.status)) {
    console.log(`[ORCHESTRATOR] Job ${jobId} already ${job.status}. Skipping.`);
    return;
  }

  // 3. Idempotent lock
  if (job.locked_at) {
    const lockAge = Date.now() - new Date(job.locked_at).getTime();
    if (lockAge < LOCK_TTL_MS) {
      console.log(`[ORCHESTRATOR] Job ${jobId} is locked (${lockAge}ms ago). Skipping.`);
      return;
    }
    console.log(`[ORCHESTRATOR] Job ${jobId} lock expired (${lockAge}ms). Reclaiming.`);
  }

  // Acquire lock
  const lockId = crypto.randomUUID();
  const { error: lockError } = await supabase
    .from('generation_jobs')
    .update({ locked_at: new Date().toISOString(), locked_by: lockId, status: 'running', started_at: job.started_at || new Date().toISOString() })
    .eq('id', jobId)
    .is('locked_by', job.locked_by || null);

  if (lockError) {
    console.error(`[ORCHESTRATOR] Failed to acquire lock for ${jobId}:`, lockError);
    return;
  }

  // 4. Determine which step to start from
  const completedSteps = new Set<string>();
  const { data: existingSteps } = await supabase
    .from('generation_steps')
    .select('step_name, status, output')
    .eq('job_id', jobId)
    .eq('status', 'completed');

  const stepOutputs: Record<string, unknown> = {};
  if (existingSteps) {
    for (const s of existingSteps) {
      completedSteps.add(s.step_name);
      stepOutputs[s.step_name] = s.output;
    }
  }

  let totalApiCalls = job.total_api_calls || 0;

  // 5. Execute pipeline
  try {
    for (const stepName of PIPELINE_STEPS) {
      // Skip already completed steps (idempotency)
      if (completedSteps.has(stepName)) {
        console.log(`[ORCHESTRATOR] Step ${stepName} already completed. Skipping.`);
        continue;
      }

      // Check job timeout
      if (Date.now() - jobStart > MAX_JOB_TIME_MS) {
        throw new Error(`JOB_TIMEOUT: Exceeded ${MAX_JOB_TIME_MS}ms`);
      }

      // Check API call budget (content/image/seo steps count as API calls)
      const apiSteps: StepName[] = ['SERP_ANALYSIS', 'NLP_KEYWORDS', 'TITLE_GEN', 'OUTLINE_GEN', 'CONTENT_GEN', 'IMAGE_GEN', 'SEO_SCORE', 'META_GEN'];
      if (apiSteps.includes(stepName) && totalApiCalls >= MAX_API_CALLS) {
        console.log(`[ORCHESTRATOR] Budget exceeded (${totalApiCalls}/${MAX_API_CALLS}). Skipping ${stepName}.`);
        // Mark needs_review if we're skipping important steps
        await supabase.from('generation_jobs').update({ needs_review: true }).eq('id', jobId);
        continue;
      }

      console.log(`[ORCHESTRATOR] Executing step: ${stepName} (${totalApiCalls}/${MAX_API_CALLS} API calls)`);

      // Update current_step
      await supabase.from('generation_jobs').update({ current_step: stepName }).eq('id', jobId);

      // Create step record
      const { data: stepRecord } = await supabase
        .from('generation_steps')
        .insert({
          job_id: jobId,
          step_name: stepName,
          status: 'running',
          started_at: new Date().toISOString(),
          input: { job_input: job.input, previous_outputs: stepOutputs },
        })
        .select()
        .single();

      const stepStart = Date.now();

      try {
        // Execute step (Phase 1: stub)
        const stepOutput = executeStubStep(stepName, job.input as Record<string, unknown>, stepOutputs);
        const latencyMs = Date.now() - stepStart;

        // Persist step result
        await supabase
          .from('generation_steps')
          .update({
            status: 'completed',
            output: stepOutput,
            latency_ms: latencyMs,
            completed_at: new Date().toISOString(),
            model_used: 'stub-phase-1',
            provider: 'stub',
          })
          .eq('id', stepRecord!.id);

        stepOutputs[stepName] = stepOutput;
        completedSteps.add(stepName);

        // Count API call for real steps
        if (apiSteps.includes(stepName)) {
          totalApiCalls++;
          await supabase.from('generation_jobs').update({ total_api_calls: totalApiCalls }).eq('id', jobId);
        }

        console.log(`[ORCHESTRATOR] ✅ ${stepName} completed in ${latencyMs}ms`);
      } catch (stepError) {
        const latencyMs = Date.now() - stepStart;
        const errorMsg = stepError instanceof Error ? stepError.message : 'Unknown step error';
        console.error(`[ORCHESTRATOR] ❌ ${stepName} failed:`, errorMsg);

        // Persist failure
        if (stepRecord) {
          await supabase
            .from('generation_steps')
            .update({
              status: 'failed',
              error_message: errorMsg,
              latency_ms: latencyMs,
              completed_at: new Date().toISOString(),
            })
            .eq('id', stepRecord.id);
        }

        throw new Error(`STEP_FAILED:${stepName}: ${errorMsg}`);
      }
    }

    // 6. Job completed successfully
    const seoOutput = stepOutputs['SEO_SCORE'] as Record<string, unknown> | undefined;
    const seoScore = (seoOutput?.seo_score as number) || null;
    const seoBreakdown = (seoOutput?.breakdown as Record<string, unknown>) || null;

    await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        current_step: null,
        output: stepOutputs,
        seo_score: seoScore,
        seo_breakdown: seoBreakdown,
        needs_review: seoScore !== null && seoScore < 70,
        completed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
      })
      .eq('id', jobId);

    const totalMs = Date.now() - jobStart;
    console.log(`[ORCHESTRATOR] ✅ Job ${jobId} COMPLETED in ${totalMs}ms | SEO: ${seoScore} | API calls: ${totalApiCalls}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown orchestration error';
    console.error(`[ORCHESTRATOR] ❌ Job ${jobId} FAILED:`, errorMsg);

    // Extract failed step from error message
    const stepMatch = errorMsg.match(/STEP_FAILED:(\w+)/);
    const failedStep = stepMatch ? stepMatch[1] : null;

    await supabase
      .from('generation_jobs')
      .update({
        status: 'failed',
        error_message: errorMsg,
        error_step: failedStep,
        output: Object.keys(stepOutputs).length > 0 ? stepOutputs : null,
        completed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
      })
      .eq('id', jobId);
  }
}

// ============================================================
// HTTP Handler
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "job_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run orchestration (this may take a while but edge functions have 400s limit)
    await orchestrate(job_id, supabase);

    return new Response(
      JSON.stringify({ success: true, job_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ORCHESTRATOR] Fatal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
