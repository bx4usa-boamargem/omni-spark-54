/**
 * Squad Conteúdo — Handler
 * Tasks: create-article, optimize-seo, publish-article
 * Reroutes para as Edge Functions existentes do OmniSeen.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface SquadRequest {
  task: string;
  params: Record<string, string>;
  run_id?: string;
  blog_id?: string;
  tenant_id?: string;
}

function getAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function setAgentStatus(supabase: ReturnType<typeof getAdmin>, agentId: string, status: string, task?: object) {
  await supabase.from('aios_agents')
    .update({ status, current_task: task || null, last_active: new Date().toISOString() })
    .eq('squad_id', 'omniseen-conteudo')
    .eq('agent_id', agentId);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = getAdmin();

  try {
    const body: SquadRequest = await req.json();
    const { task, params } = body;

    console.log(`[Squad Conteúdo] task=${task}`, params);

    switch (task) {
      // ─── Criar Artigo ───
      case 'create-article': {
        const { keyword, blog_id } = params;
        if (!keyword || !blog_id) throw new Error('keyword e blog_id são obrigatórios');

        await setAgentStatus(supabase, 'content-architect', 'running', { type: 'create-article', keyword });

        // 1. Criar job de geração (usa a function existente)
        const { data, error } = await supabase.functions.invoke('create-generation-job', {
          body: { blog_id, keywords: [keyword], mode: 'single', article_goal: 'informational' },
        });

        await setAgentStatus(supabase, 'content-architect', 'idle');

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, task: 'create-article', result: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ─── Otimizar SEO ───
      case 'optimize-seo': {
        const { article_id } = params;
        if (!article_id) throw new Error('article_id é obrigatório');

        await setAgentStatus(supabase, 'seo-optimizer', 'running', { type: 'optimize-seo', article_id });

        const { data, error } = await supabase.functions.invoke('fix-seo-with-ai', {
          body: { article_id },
        });

        await setAgentStatus(supabase, 'seo-optimizer', 'idle');
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, task: 'optimize-seo', result: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ─── Publicar Artigo ───
      case 'publish-article': {
        const { article_id } = params;
        if (!article_id) throw new Error('article_id é obrigatório');

        await setAgentStatus(supabase, 'publisher', 'running', { type: 'publish-article', article_id });

        // Atualiza status do artigo para published
        const { error } = await supabase
          .from('articles')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', article_id);

        await setAgentStatus(supabase, 'publisher', 'idle');
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, task: 'publish-article', article_id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Task desconhecida: ${task}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Squad Conteúdo] Error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
