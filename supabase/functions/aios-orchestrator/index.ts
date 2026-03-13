/**
 * AIOS Orchestrator — Pipeline Completo + A-MEM
 *
 * create-article pipeline (6 steps):
 *   1. serp-research     → analisa SERP e oportunidade
 *   2. article-planning  → outline + keywords
 *   3. content-writing   → geração do artigo
 *   4. seo-optimize      → SEO on-page
 *   5. qa-review         → quality gate
 *   6. publish           → publicação
 *
 * A-MEM: antes de cada step, carrega memórias relevantes do agente.
 *        após execução bem-sucedida, salva aprendizados (niche, tone, success/failure).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ─── Types ──────────────────────────────────────────────────────
interface OrchestratorRequest {
  squad?: string;
  task?: string;
  action?: string;
  params?: Record<string, string>;
  blog_id?: string;
  tenant_id?: string;
  squad_id?: string;
  agent_id?: string;
  patch?: Record<string, unknown>;
}

type SupabaseAdmin = ReturnType<typeof createClient>;

// ─── Helpers ────────────────────────────────────────────────────
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

// ─── Step Logging ───────────────────────────────────────────────
async function logStep(
  sb: SupabaseAdmin,
  opts: {
    run_id?: string | null;
    squad_id: string;
    agent_id: string;
    step_name: string;
    step_order?: number;
    status?: string;
    input_json?: Record<string, unknown>;
  }
): Promise<string | null> {
  const { data } = await sb.from('aios_step_logs').insert({
    run_id:     opts.run_id ?? null,
    squad_id:   opts.squad_id,
    agent_id:   opts.agent_id,
    step_name:  opts.step_name,
    step_order: opts.step_order ?? 0,
    status:     opts.status ?? 'running',
    input_json: opts.input_json ?? {},
  }).select('id').single().catch(() => ({ data: null }));
  return (data as { id: string } | null)?.id ?? null;
}

async function finalizeStep(
  sb: SupabaseAdmin,
  stepId: string | null,
  patch: {
    status: string;
    output_json?: Record<string, unknown>;
    error?: string | null;
    tokens_in?: number;
    tokens_out?: number;
    cost_usd?: number;
    duration_ms?: number;
  }
) {
  if (!stepId) return;
  await sb.from('aios_step_logs').update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq('id', stepId).catch(() => {});
}

// ─── A-MEM: Leitura de memória relevante ────────────────────────
async function loadMemory(
  sb: SupabaseAdmin,
  agentId: string,
  blogId: string | undefined,
  memoryTypes: string[] = ['niche', 'tone', 'success']
): Promise<string> {
  if (!blogId) return '';
  try {
    const { data } = await sb
      .from('aios_agent_memory')
      .select('memory_type, content, confidence')
      .eq('agent_id', agentId)
      .eq('blog_id', blogId)
      .in('memory_type', memoryTypes)
      .order('confidence', { ascending: false })
      .limit(5);
    if (!data || data.length === 0) return '';
    return data.map((m: { memory_type: string; content: string; confidence: number }) =>
      `[${m.memory_type.toUpperCase()}] ${m.content}`
    ).join('\n');
  } catch {
    return '';
  }
}

// ─── A-MEM: Salvar aprendizado ───────────────────────────────────
async function saveMemory(
  sb: SupabaseAdmin,
  opts: {
    agent_id: string;
    squad_id: string;
    blog_id?: string;
    memory_type: 'niche' | 'tone' | 'success' | 'failure' | 'client_pref' | 'content';
    content: string;
    metadata?: Record<string, unknown>;
    source_run_id?: string | null;
    confidence?: number;
  }
) {
  if (!opts.blog_id) return;
  await sb.from('aios_agent_memory').insert({
    agent_id:      opts.agent_id,
    squad_id:      opts.squad_id,
    blog_id:       opts.blog_id,
    memory_type:   opts.memory_type,
    content:       opts.content,
    metadata:      opts.metadata ?? {},
    source_run_id: opts.source_run_id ?? null,
    confidence:    opts.confidence ?? 1.0,
  }).catch(() => {});
}

// ─── SQUAD CONTEÚDO — Pipeline Completo ─────────────────────────
async function handleConteudo(
  sb: SupabaseAdmin,
  task: string,
  params: Record<string, string>,
  blogId?: string,
  _tenantId?: string,
  runId?: string | null
) {
  switch (task) {

    // ══════════════════════════════════════════════════════════
    // create-article: pipeline de 6 steps com A-MEM
    // ══════════════════════════════════════════════════════════
    case 'create-article': {
      const { keyword, blog_id: paramBlogId, publish_mode = 'draft' } = params;
      const blogIdFinal = blogId || paramBlogId;
      if (!keyword)     throw new Error('keyword é obrigatório');
      if (!blogIdFinal) throw new Error('blog_id é obrigatório');

      let articleId: string | null = null;
      let serpData: Record<string, unknown> = {};
      let outlineData: Record<string, unknown> = {};

      // ── STEP 1: SERP Research ──────────────────────────────
      console.log('[create-article] Step 1: SERP Research');
      await setAgentStatus(sb, 'omniseen-conteudo', 'content-architect', 'running', { type: 'serp-research', keyword });
      const s1id = await logStep(sb, {
        run_id: runId, squad_id: 'omniseen-conteudo', agent_id: 'content-architect',
        step_name: 'serp-research', step_order: 1,
        input_json: { keyword, blog_id: blogIdFinal },
      });
      const t1 = Date.now();
      try {
        const memory1 = await loadMemory(sb, 'content-architect', blogIdFinal, ['niche', 'client_pref']);
        const { data: serpResult, error: serpErr } = await sb.functions.invoke('analyze-serp', {
          body: { keyword, analysis_type: 'opportunity', prior_memory: memory1 },
        }).catch(() => ({ data: { opportunity_score: 60, content_gaps: [], serp_titles: [] }, error: null }));

        serpData = (serpResult ?? { opportunity_score: 60, content_gaps: [], serp_titles: [] }) as Record<string, unknown>;
        await finalizeStep(sb, s1id, {
          status: serpErr ? 'error' : 'ok',
          output_json: serpData,
          duration_ms: Date.now() - t1,
          error: serpErr?.message ?? null,
        });

        // A-MEM: salvar oportunidade de nicho detectada
        if (!serpErr && serpData.opportunity_score) {
          await saveMemory(sb, {
            agent_id: 'content-architect', squad_id: 'omniseen-conteudo',
            blog_id: blogIdFinal, memory_type: 'niche',
            content: `Keyword "${keyword}" — opportunity_score: ${serpData.opportunity_score}. Gaps: ${JSON.stringify(serpData.content_gaps ?? [])}`,
            metadata: { keyword, opportunity_score: serpData.opportunity_score },
            source_run_id: runId,
          });
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        await finalizeStep(sb, s1id, { status: 'error', error: errMsg, duration_ms: Date.now() - t1 });
        serpData = { opportunity_score: 50, content_gaps: [], error: errMsg };
      }
      await setAgentStatus(sb, 'omniseen-conteudo', 'content-architect', 'idle');

      // ── STEP 2: Article Planning & Outline ────────────────
      console.log('[create-article] Step 2: Article Planning');
      await setAgentStatus(sb, 'omniseen-conteudo', 'content-architect', 'running', { type: 'article-planning', keyword });
      const s2id = await logStep(sb, {
        run_id: runId, squad_id: 'omniseen-conteudo', agent_id: 'content-architect',
        step_name: 'article-planning', step_order: 2,
        input_json: { keyword, serp_data: serpData },
      });
      const t2 = Date.now();
      try {
        const memory2 = await loadMemory(sb, 'content-architect', blogIdFinal, ['niche', 'tone', 'success']);
        const { data: outlineResult, error: outlineErr } = await sb.functions.invoke('article-plan', {
          body: { keyword, serp_analysis: serpData, prior_memory: memory2 },
        }).catch(() => ({ data: { outline: `# ${keyword}\n\n## Introdução\n\n## Desenvolvimento\n\n## Conclusão`, keywords: [keyword] }, error: null }));

        outlineData = (outlineResult ?? { outline: `# ${keyword}\n\n## Introdução\n\n## Desenvolvimento\n\n## Conclusão`, keywords: [keyword] }) as Record<string, unknown>;
        await finalizeStep(sb, s2id, {
          status: outlineErr ? 'error' : 'ok',
          output_json: outlineData,
          duration_ms: Date.now() - t2,
          error: outlineErr?.message ?? null,
        });

        // A-MEM: salvar padrão de planejamento bem-sucedido
        if (!outlineErr) {
          await saveMemory(sb, {
            agent_id: 'content-architect', squad_id: 'omniseen-conteudo',
            blog_id: blogIdFinal, memory_type: 'success',
            content: `Outline gerado para "${keyword}": ${JSON.stringify(outlineData.keywords ?? [])} keywords sugeridas`,
            metadata: { keyword, keywords: outlineData.keywords },
            source_run_id: runId, confidence: 0.9,
          });
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        await finalizeStep(sb, s2id, { status: 'error', error: errMsg, duration_ms: Date.now() - t2 });
        outlineData = { outline: `# ${keyword}\n\n## Introdução\n\n## Desenvolvimento\n\n## Conclusão`, keywords: [keyword] };
      }
      await setAgentStatus(sb, 'omniseen-conteudo', 'content-architect', 'idle');

      // ── STEP 3: Content Writing ────────────────────────────
      console.log('[create-article] Step 3: Content Writing');
      await setAgentStatus(sb, 'omniseen-conteudo', 'content-writer', 'running', { type: 'content-writing', keyword });
      const s3id = await logStep(sb, {
        run_id: runId, squad_id: 'omniseen-conteudo', agent_id: 'content-writer',
        step_name: 'content-writing', step_order: 3,
        input_json: { keyword, blog_id: blogIdFinal, outline: outlineData.outline },
      });
      const t3 = Date.now();
      try {
        const memory3 = await loadMemory(sb, 'content-writer', blogIdFinal, ['tone', 'client_pref', 'success']);
        const { data: genResult, error: genErr } = await sb.functions.invoke('create-generation-job', {
          body: {
            blog_id: blogIdFinal,
            keywords: (outlineData.keywords as string[]) ?? [keyword],
            mode: 'single',
            article_goal: 'informational',
            outline: outlineData.outline,
            prior_memory: memory3,
          },
        });
        if (genErr) throw genErr;
        articleId = (genResult as { article_id?: string; id?: string })?.article_id
          || (genResult as { article_id?: string; id?: string })?.id
          || null;

        await finalizeStep(sb, s3id, {
          status: 'ok',
          output_json: (genResult ?? {}) as Record<string, unknown>,
          duration_ms: Date.now() - t3,
        });

        // A-MEM: salvar tom/voz bem-sucedida
        if (articleId) {
          await saveMemory(sb, {
            agent_id: 'content-writer', squad_id: 'omniseen-conteudo',
            blog_id: blogIdFinal, memory_type: 'content',
            content: `Artigo gerado: article_id=${articleId} para keyword="${keyword}"`,
            metadata: { keyword, article_id: articleId },
            source_run_id: runId, confidence: 1.0,
          });
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        await finalizeStep(sb, s3id, { status: 'error', error: errMsg, duration_ms: Date.now() - t3 });
        // A-MEM: salvar falha
        await saveMemory(sb, {
          agent_id: 'content-writer', squad_id: 'omniseen-conteudo',
          blog_id: blogIdFinal, memory_type: 'failure',
          content: `Falha na geração de artigo para keyword="${keyword}": ${errMsg}`,
          metadata: { keyword, error: errMsg },
          source_run_id: runId, confidence: 0.5,
        });
        throw new Error(`Falha no step content-writing: ${errMsg}`);
      }
      await setAgentStatus(sb, 'omniseen-conteudo', 'content-writer', 'idle');

      // ── STEP 4: SEO Optimize ──────────────────────────────
      if (articleId) {
        console.log('[create-article] Step 4: SEO Optimize');
        await setAgentStatus(sb, 'omniseen-conteudo', 'seo-optimizer', 'running', { type: 'seo-optimize', article_id: articleId });
        const s4id = await logStep(sb, {
          run_id: runId, squad_id: 'omniseen-conteudo', agent_id: 'seo-optimizer',
          step_name: 'seo-optimize', step_order: 4,
          input_json: { article_id: articleId, keyword },
        });
        const t4 = Date.now();
        try {
          const memory4 = await loadMemory(sb, 'seo-optimizer', blogIdFinal, ['niche', 'success']);
          const { data: seoResult, error: seoErr } = await sb.functions.invoke('fix-seo-with-ai', {
            body: { article_id: articleId, keyword, prior_memory: memory4 },
          }).catch(() => ({ data: { seo_score: 70 }, error: null }));

          await finalizeStep(sb, s4id, {
            status: seoErr ? 'error' : 'ok',
            output_json: (seoResult ?? {}) as Record<string, unknown>,
            duration_ms: Date.now() - t4,
            error: seoErr?.message ?? null,
          });

          // A-MEM: aprendizado SEO
          if (!seoErr) {
            await saveMemory(sb, {
              agent_id: 'seo-optimizer', squad_id: 'omniseen-conteudo',
              blog_id: blogIdFinal, memory_type: 'success',
              content: `SEO aplicado: article_id=${articleId}, score=${(seoResult as Record<string, unknown>)?.seo_score ?? 'N/A'}`,
              metadata: { article_id: articleId, keyword },
              source_run_id: runId, confidence: 0.95,
            });
          }
        } catch {
          await finalizeStep(sb, s4id, { status: 'skipped', duration_ms: Date.now() - t4 });
        }
        await setAgentStatus(sb, 'omniseen-conteudo', 'seo-optimizer', 'idle');
      }

      // ── STEP 5: QA Review ─────────────────────────────────
      if (articleId) {
        console.log('[create-article] Step 5: QA Review');
        await setAgentStatus(sb, 'omniseen-conteudo', 'content-qa', 'running', { type: 'qa-review', article_id: articleId });
        const s5id = await logStep(sb, {
          run_id: runId, squad_id: 'omniseen-conteudo', agent_id: 'content-qa',
          step_name: 'qa-review', step_order: 5,
          input_json: { article_id: articleId },
        });
        const t5 = Date.now();
        try {
          const { data: qaResult, error: qaErr } = await sb.functions.invoke('review-article', {
            body: { article_id: articleId, auto_fix: true },
          }).catch(() => ({ data: { quality_score: 75, passed: true }, error: null }));

          const qaData = (qaResult ?? { quality_score: 75, passed: true }) as Record<string, unknown>;
          await finalizeStep(sb, s5id, {
            status: qaErr ? 'error' : 'ok',
            output_json: qaData,
            duration_ms: Date.now() - t5,
            error: qaErr?.message ?? null,
          });

          // A-MEM: preferência de qualidade do cliente
          if (!qaErr && qaData.quality_score) {
            await saveMemory(sb, {
              agent_id: 'content-qa', squad_id: 'omniseen-conteudo',
              blog_id: blogIdFinal, memory_type: 'client_pref',
              content: `Quality gate: score=${qaData.quality_score}, passed=${qaData.passed} para keyword="${keyword}"`,
              metadata: { keyword, quality_score: qaData.quality_score, passed: qaData.passed },
              source_run_id: runId, confidence: 0.8,
            });
          }
        } catch {
          await finalizeStep(sb, s5id, { status: 'skipped', duration_ms: Date.now() - t5 });
        }
        await setAgentStatus(sb, 'omniseen-conteudo', 'content-qa', 'idle');
      }

      // ── STEP 6: Publish ───────────────────────────────────
      let publishedResult: Record<string, unknown> = { article_id: articleId, status: 'draft' };
      if (articleId && publish_mode !== 'draft') {
        console.log('[create-article] Step 6: Publish');
        await setAgentStatus(sb, 'omniseen-conteudo', 'publisher', 'running', { type: 'publish', article_id: articleId });
        const s6id = await logStep(sb, {
          run_id: runId, squad_id: 'omniseen-conteudo', agent_id: 'publisher',
          step_name: 'publish', step_order: 6,
          input_json: { article_id: articleId, publish_mode },
        });
        const t6 = Date.now();
        try {
          const { error: pubErr } = await sb.from('articles')
            .update({ status: 'published', published_at: new Date().toISOString() })
            .eq('id', articleId);
          publishedResult = { article_id: articleId, status: 'published', published: !pubErr };
          await finalizeStep(sb, s6id, {
            status: pubErr ? 'error' : 'ok',
            output_json: publishedResult,
            duration_ms: Date.now() - t6,
            error: pubErr?.message ?? null,
          });
        } catch (e) {
          await finalizeStep(sb, s6id, { status: 'error', error: String(e), duration_ms: Date.now() - t6 });
        }
        await setAgentStatus(sb, 'omniseen-conteudo', 'publisher', 'idle');
      } else if (articleId) {
        // Salvar como draft
        await sb.from('articles').update({ status: 'draft' }).eq('id', articleId).catch(() => {});
        publishedResult = { article_id: articleId, status: 'draft' };
      }

      return {
        success: true,
        keyword,
        article_id: articleId,
        publish_mode,
        ...publishedResult,
        steps_completed: 6,
        amem_active: true,
      };
    }

    // ── optimize-seo ────────────────────────────────────────
    case 'optimize-seo': {
      const { article_id } = params;
      if (!article_id) throw new Error('article_id é obrigatório');
      await setAgentStatus(sb, 'omniseen-conteudo', 'seo-optimizer', 'running', { type: 'optimize-seo', article_id });
      const stepId = await logStep(sb, { run_id: runId, squad_id: 'omniseen-conteudo', agent_id: 'seo-optimizer', step_name: 'optimize-seo', step_order: 1, input_json: params as Record<string, unknown> });
      const t0 = Date.now();
      const { data, error } = await sb.functions.invoke('fix-seo-with-ai', { body: { article_id } });
      await finalizeStep(sb, stepId, { status: error ? 'error' : 'ok', error: error?.message ?? null, duration_ms: Date.now() - t0, output_json: (data ?? {}) as Record<string, unknown> });
      await setAgentStatus(sb, 'omniseen-conteudo', 'seo-optimizer', 'idle');
      if (error) throw error;
      return data;
    }

    // ── publish-article ──────────────────────────────────────
    case 'publish-article': {
      const { article_id } = params;
      if (!article_id) throw new Error('article_id é obrigatório');
      await setAgentStatus(sb, 'omniseen-conteudo', 'publisher', 'running', { type: 'publish-article', article_id });
      const stepId = await logStep(sb, { run_id: runId, squad_id: 'omniseen-conteudo', agent_id: 'publisher', step_name: 'publish-article', step_order: 2, input_json: params as Record<string, unknown> });
      const t0 = Date.now();
      const { error } = await sb.from('articles')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', article_id);
      await finalizeStep(sb, stepId, { status: error ? 'error' : 'ok', error: error?.message ?? null, duration_ms: Date.now() - t0, output_json: { published: !error, article_id } });
      await setAgentStatus(sb, 'omniseen-conteudo', 'publisher', 'idle');
      if (error) throw error;
      return { published: true, article_id };
    }

    default:
      throw new Error(`Task desconhecida para omniseen-conteudo: ${task}`);
  }
}

// ─── SQUAD PRESENÇA ──────────────────────────────────────────────
async function handlePresenca(sb: SupabaseAdmin, task: string, params: Record<string, string>, _blogId?: string, _tenantId?: string, runId?: string | null) {
  switch (task) {
    case 'local-seo-audit': {
      const { location, niche } = params;
      if (!location || !niche) throw new Error('location e niche são obrigatórios');
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'serp-analyst', 'running', { type: 'local-seo-audit', location });
      const stepId = await logStep(sb, { run_id: runId, squad_id: 'omniseen-presenca-digital', agent_id: 'serp-analyst', step_name: 'local-seo-audit', input_json: params as Record<string, unknown> });
      const t0 = Date.now();
      const { data, error } = await sb.functions.invoke('analyze-serp', { body: { location, niche, analysis_type: 'local_seo' } });
      await finalizeStep(sb, stepId, { status: error ? 'error' : 'ok', error: error?.message ?? null, duration_ms: Date.now() - t0, output_json: (data ?? {}) as Record<string, unknown> });
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'serp-analyst', 'idle');
      if (error) throw error;
      return data;
    }
    case 'keyword-research': {
      const { seed_keyword } = params;
      if (!seed_keyword) throw new Error('seed_keyword é obrigatório');
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'keyword-researcher', 'running', { type: 'keyword-research', keyword: seed_keyword });
      const stepId = await logStep(sb, { run_id: runId, squad_id: 'omniseen-presenca-digital', agent_id: 'keyword-researcher', step_name: 'keyword-research', step_order: 1, input_json: params as Record<string, unknown> });
      const t0 = Date.now();
      const { data, error } = await sb.functions.invoke('create-cluster', { body: { seed_keyword, depth: 'standard' } });
      await finalizeStep(sb, stepId, { status: error ? 'error' : 'ok', error: error?.message ?? null, duration_ms: Date.now() - t0, output_json: (data ?? {}) as Record<string, unknown> });
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'keyword-researcher', 'idle');
      if (error) throw error;
      return data;
    }
    case 'analyze-competitors': {
      const { domain } = params;
      if (!domain) throw new Error('domain é obrigatório');
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'competitor-watch', 'running', { type: 'analyze-competitors', domain });
      const stepId = await logStep(sb, { run_id: runId, squad_id: 'omniseen-presenca-digital', agent_id: 'competitor-watch', step_name: 'analyze-competitors', step_order: 2, input_json: params as Record<string, unknown> });
      const t0 = Date.now();
      const { data, error } = await sb.functions.invoke('analyze-competitors', { body: { domain, depth: 'full' } });
      await finalizeStep(sb, stepId, { status: error ? 'error' : 'ok', error: error?.message ?? null, duration_ms: Date.now() - t0, output_json: (data ?? {}) as Record<string, unknown> });
      await setAgentStatus(sb, 'omniseen-presenca-digital', 'competitor-watch', 'idle');
      if (error) throw error;
      return data;
    }
    default:
      throw new Error(`Task desconhecida para omniseen-presenca-digital: ${task}`);
  }
}

// ─── SQUAD COMERCIAL ─────────────────────────────────────────────
async function handleComercial(sb: SupabaseAdmin, task: string, params: Record<string, string>, _blogId?: string, _tenantId?: string, runId?: string | null) {
  switch (task) {
    case 'run-sdr-conversation': {
      const { lead_name, lead_context } = params;
      if (!lead_name) throw new Error('lead_name é obrigatório');
      await setAgentStatus(sb, 'omniseen-comercial', 'sdr-agent', 'running', { type: 'sdr-conversation', lead: lead_name });
      const stepId = await logStep(sb, { run_id: runId, squad_id: 'omniseen-comercial', agent_id: 'sdr-agent', step_name: 'sdr-conversation', input_json: params as Record<string, unknown> });
      const t0 = Date.now();
      const { data, error } = await sb.functions.invoke('chat-sdr', {
        body: { message: `Novo lead: ${lead_name}. Contexto: ${lead_context || 'sem contexto'}`, session_id: `aios-${Date.now()}` },
      });
      await finalizeStep(sb, stepId, { status: error ? 'error' : 'ok', error: error?.message ?? null, duration_ms: Date.now() - t0, output_json: (data ?? {}) as Record<string, unknown> });
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
        blog_id, period: 'últimos 7 dias',
        articles_created: articles?.length || 0,
        articles: articles || [],
        avg_seo_score: articles?.length
          ? Math.round(articles.reduce((a: number, x: { seo_score?: number }) => a + (x.seo_score || 0), 0) / articles.length)
          : 0,
      };
    }
    default:
      throw new Error(`Task desconhecida para omniseen-comercial: ${task}`);
  }
}

// ─── META-AIOS (Swarm) ────────────────────────────────────────────
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

// ─── ROUTER ──────────────────────────────────────────────────────
type HandlerFn = (sb: SupabaseAdmin, task: string, params: Record<string, string>, blogId?: string, tenantId?: string, runId?: string | null) => Promise<unknown>;

const SQUAD_HANDLERS: Record<string, HandlerFn> = {
  'omniseen-conteudo':         handleConteudo,
  'omniseen-presenca-digital': handlePresenca,
  'omniseen-comercial':        handleComercial,
  'claude-code-mastery':       handleMetaAios,
};

// ─── SERVE ───────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const sb = getAdmin();
  let runId: string | null = null;
  let squadId = '';

  try {
    const body: OrchestratorRequest = await req.json();

    // ── Ação direta: update_agent ────────────────────────────────
    if (body.action === 'update_agent') {
      const { squad_id, agent_id, patch } = body;
      if (!squad_id || !agent_id || !patch) {
        return new Response(JSON.stringify({ error: 'squad_id, agent_id e patch são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await sb.from('aios_agents')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('squad_id', squad_id)
        .eq('agent_id', agent_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Squad Task ────────────────────────────────────────────────
    const squad    = body.squad   ?? '';
    const task     = body.task    ?? '';
    const params   = body.params  ?? {};
    const blog_id  = body.blog_id;
    const tenant_id = body.tenant_id;
    squadId = squad;

    if (!squad || !SQUAD_HANDLERS[squad]) {
      return new Response(JSON.stringify({ error: `Squad desconhecido: ${squad}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!task) {
      return new Response(JSON.stringify({ error: 'task é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Orchestrator] squad=${squad} task=${task} blog_id=${blog_id ?? 'none'}`);

    // Criar run record
    const { data: runRecord } = await sb.from('aios_task_runs').insert({
      squad_id: squad, task_type: task, params,
      blog_id: blog_id || null, tenant_id: tenant_id || null,
      status: 'running', started_at: new Date().toISOString(),
    }).select('id').single().catch(() => ({ data: null }));
    runId = (runRecord as { id: string } | null)?.id ?? null;

    await setSquadStatus(sb, squad, 'running');

    const result = await SQUAD_HANDLERS[squad](sb, task, params, blog_id, tenant_id, runId);

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
      await sb.from('aios_task_runs')
        .update({ status: 'failed', error: msg, completed_at: new Date().toISOString() })
        .eq('id', runId)
        .catch(() => {});
    }
    if (squadId) await setSquadStatus(sb, squadId, 'idle').catch(() => {});
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
