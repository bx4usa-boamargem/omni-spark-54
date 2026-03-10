// supabase/functions/jobs-runner/index.ts
// Jobs Runner v2 — DAG-aware, typed contracts, atomic Edge Function dispatch
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
  createServiceClient,
  claimNextJob,
  completeJob,
  failJob,
  logJobEvent,
  JOB_TYPE_TO_FUNCTION,
  type Job,
  type JobType,
} from "../_shared/jobsEngine.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Graph Expanders ─────────────────────────────────────────
// Quando o job é um "meta-job" (generate_article, generate_super_page, etc.),
// expandimos em sub-jobs usando a RPC build_article_graph.
// O job original é completado imediatamente e os sub-jobs ficam na fila.

const GRAPH_EXPANDERS: Record<string, string> = {
  generate_blog: 'generate_article',
  generate_article: 'generate_article',
  'generate-article': 'generate_article',
}

async function expandGraph(
  supabase: ReturnType<typeof createServiceClient>,
  job: Job,
): Promise<boolean> {
  const graphType = GRAPH_EXPANDERS[job.job_type]
  if (!graphType) return false

  // Usa a RPC build_article_graph que cria todo o DAG atomicamente
  const sectionCount = (job.payload as any)?.section_count ?? 3

  const { data: graphId, error } = await supabase.rpc('build_article_graph', {
    p_tenant_id: job.tenant_id,
    p_payload: job.payload,
    p_section_count: sectionCount,
  })

  if (error) throw new Error(`build_article_graph failed: ${error.message}`)

  await logJobEvent(
    supabase, job.id, job.tenant_id,
    'graph_expanded',
    `Expanded ${job.job_type} into graph ${graphId} with ${sectionCount} sections`,
    { graph_id: graphId, section_count: sectionCount },
  )

  return true
}

// ─── Atomic Step Executor ────────────────────────────────────
// Chama a Edge Function correspondente ao job_type.
// O resultado é gravado no job.result via complete_job.

async function executeAtomicStep(
  supabase: ReturnType<typeof createServiceClient>,
  job: Job,
): Promise<Record<string, unknown>> {
  const functionName = JOB_TYPE_TO_FUNCTION[job.job_type as JobType]

  if (!functionName) {
    throw new Error(`Unknown job_type: ${job.job_type}. No Edge Function mapped.`)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Se o job tem parent, buscar result do parent para enriquecer payload
  let enrichedPayload = { ...job.payload as Record<string, unknown> }

  if (job.graph_id) {
    // Buscar results dos jobs que este depende (predecessors)
    const { data: deps } = await supabase
      .from('job_dependencies')
      .select('depends_on_job_id')
      .eq('job_id', job.id)

    if (deps && deps.length > 0) {
      const depJobIds = deps.map((d: any) => d.depends_on_job_id)
      const { data: depJobs } = await supabase
        .from('jobs')
        .select('job_type, result')
        .in('id', depJobIds)

      if (depJobs) {
        const predecessorResults: Record<string, unknown> = {}
        for (const dj of depJobs) {
          predecessorResults[dj.job_type] = dj.result
        }
        enrichedPayload._predecessor_results = predecessorResults
      }
    }
  }

  const url = `${supabaseUrl}/functions/v1/${functionName}`

  await logJobEvent(
    supabase, job.id, job.tenant_id,
    'step_dispatched',
    `Calling ${functionName}`,
    { url, payload_keys: Object.keys(enrichedPayload) },
  )

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      job_id: job.id,
      tenant_id: job.tenant_id,
      payload: enrichedPayload,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`${functionName} returned ${response.status}: ${errBody}`)
  }

  const result = await response.json()
  return result
}

// ─── Main Handler ────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const runnerId = `runner-${crypto.randomUUID().slice(0, 8)}`

  try {
    const supabase = createServiceClient()

    // 1. Claim next free job
    const job = await claimNextJob(supabase, runnerId)

    if (!job) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No jobs in queue' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await logJobEvent(
      supabase, job.id, job.tenant_id,
      'runner_claimed',
      `Runner ${runnerId} processing ${job.job_type}`,
    )

    try {
      // 2. Check if this is a graph expander
      const wasExpanded = await expandGraph(supabase, job)

      if (wasExpanded) {
        // Graph expander jobs complete immediately after creating sub-jobs
        await completeJob(supabase, job.id, { expanded: true })

        return new Response(
          JSON.stringify({ ok: true, job_id: job.id, action: 'expanded' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // 3. Execute atomic step
      const result = await executeAtomicStep(supabase, job)

      // 4. Mark as done
      await completeJob(supabase, job.id, result)

      return new Response(
        JSON.stringify({ ok: true, job_id: job.id, status: 'done', result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } catch (execError: any) {
      // 5. Mark as failed (RPC handles retry logic + backoff)
      const errorText = execError.message || 'Unknown execution error'
      await failJob(supabase, job.id, errorText)

      await logJobEvent(
        supabase, job.id, job.tenant_id,
        'execution_error',
        errorText,
        { stack: execError.stack },
      )

      return new Response(
        JSON.stringify({ ok: false, job_id: job.id, error: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
  } catch (error: any) {
    console.error('jobs-runner fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
