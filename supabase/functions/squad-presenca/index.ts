/**
 * Squad Presença Digital — Handler
 * Tasks: local-seo-audit, keyword-research, analyze-competitors
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface SquadRequest {
  task: string;
  params: Record<string, string>;
  run_id?: string;
  blog_id?: string;
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
    .eq('squad_id', 'omniseen-presenca-digital')
    .eq('agent_id', agentId);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = getAdmin();

  try {
    const body: SquadRequest = await req.json();
    const { task, params } = body;

    console.log(`[Squad Presença] task=${task}`, params);

    switch (task) {
      // ─── Auditoria SEO Local ───
      case 'local-seo-audit': {
        const { location, niche } = params;
        if (!location || !niche) throw new Error('location e niche são obrigatórios');

        await setAgentStatus(supabase, 'serp-analyst', 'running', { type: 'local-seo-audit', location });

        const { data, error } = await supabase.functions.invoke('analyze-serp', {
          body: { location, niche, analysis_type: 'local_seo' },
        });

        await setAgentStatus(supabase, 'serp-analyst', 'idle');
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, task: 'local-seo-audit', result: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ─── Pesquisa de Keywords ───
      case 'keyword-research': {
        const { seed_keyword } = params;
        if (!seed_keyword) throw new Error('seed_keyword é obrigatório');

        await setAgentStatus(supabase, 'keyword-researcher', 'running', { type: 'keyword-research', keyword: seed_keyword });

        const { data, error } = await supabase.functions.invoke('create-cluster', {
          body: { seed_keyword, depth: 'standard' },
        });

        await setAgentStatus(supabase, 'keyword-researcher', 'idle');
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, task: 'keyword-research', result: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // ─── Análise de Concorrentes ───
      case 'analyze-competitors': {
        const { domain } = params;
        if (!domain) throw new Error('domain é obrigatório');

        await setAgentStatus(supabase, 'competitor-watch', 'running', { type: 'analyze-competitors', domain });

        const { data, error } = await supabase.functions.invoke('analyze-competitors', {
          body: { domain, depth: 'full' },
        });

        await setAgentStatus(supabase, 'competitor-watch', 'idle');
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, task: 'analyze-competitors', result: data }),
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
    console.error('[Squad Presença] Error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
