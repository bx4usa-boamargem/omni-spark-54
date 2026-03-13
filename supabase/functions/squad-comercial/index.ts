/**
 * AIOS Orchestrator — Monolítico (versão consolidada)
 * Contém inline os handlers dos 4 squads para não consumir slots extras.
 * Tasks suportadas por squad:
 *   omniseen-conteudo:         create-article | optimize-seo | publish-article
 *   omniseen-presenca-digital: local-seo-audit | keyword-research | analyze-competitors
 *   omniseen-comercial:        run-sdr-conversation | weekly-report
 *   claude-code-mastery:       run-swarm
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ─── Types ───────────────────────────────────────────────────
interface OrchestratorRequest {
  squad: string;
  task: string;
  params: Record<string, string>;
  blog_id?: string;
  tenant_id?: string;
}

type SupabaseAdmin = ReturnType<typeof createClient>;

// ─── Helpers ─────────────────────────────────────────────────
function getAdmin(): SupabaseAdmin {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function setAgentStatus(
  sb: SupabaseAdmin,
  squadId: string,
  agentId: string,
  status: string,
  currentTask?: object
) {
  await sb.from('aios_agents').update({
    status,
    current_task: currentTask || null,
    last_active: new Date().toISOString(),
  })
  .eq('squad_id', squadId)
  .eq('agent_id', agentId);
}

async function setSquadStatus(sb: SupabaseAdmin, squadId: string, status: string) {
  await sb.from('aios_squads').update({ status, updated_at: new Date().toISOString() }).eq('id', squadId);
}

// ─── SQUAD CONTEÚDO ──────────────────────────────────────────
async function handleConteudo(sb: SupabaseAdmin, task: string, params: Record<string, string>) {
  switch (task) {
    case 'create-article': {
      const { keyword, blog_id } = params;
      if (!keyword || !blog_id) throw new Error('keyword e blog_id são obrigatórios');
      await setAgentStatus(sb, 'omniseen-conteudo', 'content-architect', 'running', { type: 'create-article', keyword });
      const { data, error } = await sb.functions.invoke('create-generation-job', {
        body: { blog_id, keywords: [keyword], mode: 'single', article_goal: 'informational' },
      });
      await setAgentStatus(sb, 'omniseen-conteudo', 'content-architect', 'idle');
      if (error) throw error;
      return data;
    }
    case 'optimize-seo': {
      const { article_id } = params;
      if (!article_id) throw new Error('article_id é obrigatório');
      await setAgentStatus(sb, 'omniseen-conteudo', 'seo-optimizer', 'running', { type: 'optimize-seo', article_id });
      const { data, error } = await sb.functions.invoke('fix-seo-with-ai', { body: { article_id } });
      await setAgentStatus(sb, 'omniseen-conteudo', 'seo-optimizer', 'idle');
      if (error) throw error;
      return data;
    }
    case 'publish-article': {
      const { article_id } = params;
      if (!article_id) throw new Error('article_id é obrigatório');
      await setAgentStatus(sb, 'omniseen-conteudo', 'publisher', 'running', { type: 'publish-article', article_id });
      const { error } = await sb.from('articles')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', article_id);
      await setAgentStatus(sb, 'omniseen-conteudo', 'publisher', 'idle');
      if (error) throw error;
      return { published: true, article_id };
    }
    default:
      throw new Error(`Task desconhecida para omniseen-conteudo: ${task}`);
  }
}

// ─── SQUAD PRESENÇA ───────────────────────────────────────────
async function handlePresenca(sb: SupabaseAdmin, task: string, params: Record<string, string>) {
  switch (task) {
    case 'local-seo-audit': {
      const { location, niche } = params;
      if (!location || !niche) throw new Error('location e niche são obrigatórios');
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'serp-analyst', 'running', { type: 'local-seo-audit', location });
      const { data, error } = await sb.functions.invoke('analyze-serp', { body: { location, niche, analysis_type: 'local_seo' } });
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'serp-analyst', 'idle');
      if (error) throw error;
      return data;
    }
    case 'keyword-research': {
      const { seed_keyword } = params;
      if (!seed_keyword) throw new Error('seed_keyword é obrigatório');
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'keyword-researcher', 'running', { type: 'keyword-research', keyword: seed_keyword });
      const { data, error } = await sb.functions.invoke('create-cluster', { body: { seed_keyword, depth: 'standard' } });
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'keyword-researcher', 'idle');
      if (error) throw error;
      return data;
    }
    case 'analyze-competitors': {
      const { domain } = params;
      if (!domain) throw new Error('domain é obrigatório');
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'competitor-watch', 'running', { type: 'analyze-competitors', domain });
      const { data, error } = await sb.functions.invoke('analyze-competitors', { body: { domain, depth: 'full' } });
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'competitor-watch', 'idle');
      if (error) throw error;
      return data;
    }
    default:
      throw new Error(`Task desconhecida para omniseen-presenca-digital: ${task}`);
  }
}

// ─── SQUAD COMERCIAL ──────────────────────────────────────────
async function handleComercial(sb: SupabaseAdmin, task: string, params: Record<string, string>) {
  switch (task) {
    case 'run-sdr-conversation': {
      const { lead_name, lead_context } = params;
      if (!lead_name) throw new Error('lead_name é obrigatório');
      await setAgentStatus(sb, 'omniseen-comercial', 'sdr-agent', 'running', { type: 'sdr-conversation', lead: lead_name });
      const { data, error } = await sb.functions.invoke('chat-sdr', {
        body: { message: `Novo lead: ${lead_name}. Contexto: ${lead_context || 'sem contexto'}`, session_id: `aios-${Date.now()}` },
      });
      await setAgentStatus(sb, 'omniseen-comercial', 'sdr-agent', 'idle');
      if (error) throw error;
      return data;
    }
    case 'weekly-report': {
      const { blog_id } = params;
      if (!blog_id) throw new Error('blog_id é obrigatório');
      await setAgentStatus(sb, 'omniseen-comercial', 'report-agent', 'running', { type: 'weekly-report', blog_id });
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: articles } = await sb.from('articles')
        .select('id, title, seo_score, status, created_at')
        .eq('blog_id', blog_id)
        .gte('created_at', oneWeekAgo)
        .order('created_at', { ascending: false });
      await setAgentStatus(sb, 'omniseen-comercial', 'report-agent', 'idle');
      return {
        generated_at: new Date().toISOString(),
        blog_id,
        period: `últimos 7 dias`,
        articles_created: articles?.length || 0,
        articles: articles || [],
        avg_seo_score: articles?.length
          ? Math.round(articles.reduce((a, x) => a + (x.seo_score || 0), 0) / articles.length)
          : 0,
      };
    }
    default:
      throw new Error(`Task desconhecida para omniseen-comercial: ${task}`);
  }
}

// ─── META-AIOS (Swarm) ────────────────────────────────────────
const VALID_SQUADS = ['omniseen-conteudo', 'omniseen-presenca-digital', 'omniseen-comercial'];

async function handleMetaAios(sb: SupabaseAdmin, task: string, params: Record<string, string>, blogId?: string, tenantId?: string) {
  if (task !== 'run-swarm') throw new Error(`Task desconhecida para claude-code-mastery: ${task}`);

  const { squads: squadsRaw, objective } = params;
  if (!squadsRaw) throw new Error('squads é obrigatório (lista separada por vírgula)');

  const squadsToRun = squadsRaw.split(',').map(s => s.trim()).filter(s => VALID_SQUADS.includes(s));
  if (squadsToRun.length === 0) throw new Error('Nenhum squad válido na lista');

  await setAgentStatus(sb, 'claude-code-mastery', 'swarm-coordinator', 'running', { type: 'run-swarm', squads: squadsToRun });

  const results = await Promise.allSettled(
    squadsToRun.map(squad =>
      sb.functions.invoke('aios-orchestrator', {
        body: { squad, task: 'create-article', params: { objective: objective || 'swarm automático' }, blog_id: blogId, tenant_id: tenantId },
      })
    )
  );

  await setAgentStatus(sb, 'claude-code-mastery', 'swarm-coordinator', 'idle');

  return results.map((r, i) => ({
    squad: squadsToRun[i],
    status: r.status,
    ...(r.status === 'fulfilled' ? { result: r.value.data } : { error: String(r.reason) }),
  }));
}

// ─── ROUTER ──────────────────────────────────────────────────
const SQUAD_HANDLERS: Record<string, (sb: SupabaseAdmin, task: string, params: Record<string, string>, blogId?: string, tenantId?: string) => Promise<unknown>> = {
  'omniseen-conteudo':         (sb, task, params) => handleConteudo(sb, task, params),
  'omniseen-presenca-digital': (sb, task, params) => handlePresenca(sb, task, params),
  'omniseen-comercial':        (sb, task, params) => handleComercial(sb, task, params),
  'claude-code-mastery':       handleMetaAios,
};

// ─── SERVE ───────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const sb = getAdmin();
  let runId: string | null = null;
  let squadId = '';

  try {
    const body: OrchestratorRequest = await req.json();
    const { squad, task, params, blog_id, tenant_id } = body;
    squadId = squad;

    if (!SQUAD_HANDLERS[squad]) {
      return new Response(JSON.stringify({ error: `Squad desconhecido: ${squad}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Orchestrator] squad=${squad} task=${task}`);

    // Criar run record
    const { data: runRecord } = await sb.from('aios_task_runs').insert({
      squad_id: squad, task_type: task, params,
      blog_id: blog_id || null, tenant_id: tenant_id || null,
      status: 'running', started_at: new Date().toISOString(),
    }).select('id').single().catch(() => ({ data: null }));
    runId = runRecord?.id ?? null;

    await setSquadStatus(sb, squad, 'running');

    // Executar handler
    const result = await SQUAD_HANDLERS[squad](sb, task, params, blog_id, tenant_id);

    // Marcar completed
    if (runId) {
      await sb.from('aios_task_runs').update({
        status: 'completed', result: result as object, completed_at: new Date().toISOString(),
      }).eq('id', runId);
    }
    await setSquadStatus(sb, squad, 'idle');

    return new Response(
      JSON.stringify({ success: true, run_id: runId, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Orchestrator] Error:', msg);
    if (runId) {
      await sb.from('aios_task_runs').update({ status: 'failed', error: msg, completed_at: new Date().toISOString() }).eq('id', runId).catch(() => {});
    }
    if (squadId) await setSquadStatus(sb, squadId, 'idle').catch(() => {});

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
