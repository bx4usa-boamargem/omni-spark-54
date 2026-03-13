/**
 * Squad Meta-AIOS — Handler
 * Tasks: run-swarm (dispara múltiplos squads em paralelo)
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
    .eq('squad_id', 'claude-code-mastery')
    .eq('agent_id', agentId);
}

const VALID_SQUADS = ['omniseen-conteudo', 'omniseen-presenca-digital', 'omniseen-comercial'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = getAdmin();

  try {
    const body: SquadRequest = await req.json();
    const { task, params } = body;

    console.log(`[Meta-AIOS] task=${task}`, params);

    switch (task) {
      // ─── Swarm: dispara múltiplos squads ───
      case 'run-swarm': {
        const { squads: squadsRaw, objective } = params;
        if (!squadsRaw) throw new Error('squads é obrigatório (lista separada por vírgula)');

        const squadsToRun = squadsRaw
          .split(',')
          .map(s => s.trim())
          .filter(s => VALID_SQUADS.includes(s));

        if (squadsToRun.length === 0) throw new Error('Nenhum squad válido na lista');

        await setAgentStatus(supabase, 'swarm-coordinator', 'running', { type: 'run-swarm', squads: squadsToRun });

        console.log(`[Meta-AIOS] Iniciando swarm: squads=${squadsToRun.join(',')} objetivo=${objective}`);

        // Dispara todos os squads em paralelo via orchestrator
        const results = await Promise.allSettled(
          squadsToRun.map(squad =>
            supabase.functions.invoke('aios-orchestrator', {
              body: {
                squad,
                task: 'create-article', // default task do swarm
                params: { objective: objective || 'swarm automático' },
                blog_id: body.blog_id,
                tenant_id: body.tenant_id,
              },
            })
          )
        );

        await setAgentStatus(supabase, 'swarm-coordinator', 'idle');

        const summary = results.map((r, i) => ({
          squad: squadsToRun[i],
          status: r.status,
          ...(r.status === 'fulfilled' ? { result: r.value.data } : { error: String(r.reason) }),
        }));

        return new Response(
          JSON.stringify({ success: true, task: 'run-swarm', summary }),
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
    console.error('[Meta-AIOS] Error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
