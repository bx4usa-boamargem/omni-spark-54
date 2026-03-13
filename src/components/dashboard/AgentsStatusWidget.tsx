import { useEffect, useState } from 'react';
import { Bot, Zap, Brain, Target, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AgentStatusItem {
  id: string;
  squad_id: string;
  agent_id: string;
  role: string;
  status: 'idle' | 'running' | 'blocked' | 'error';
  current_task?: { type: string } | null;
  metrics?: { total_runs?: number } | null;
}

interface AgentsStatusWidgetProps {
  tenantId?: string;
}

const SQUAD_META: Record<string, { icon: React.ElementType; color: string; colorSoft: string; label: string }> = {
  'omniseen-conteudo':         { icon: Bot,    color: '#7C3AED', colorSoft: 'rgba(124,58,237,0.12)',  label: 'Conteúdo' },
  'omniseen-presenca-digital': { icon: Target, color: '#F97316', colorSoft: 'rgba(249,115,22,0.12)', label: 'Presença' },
  'omniseen-comercial':        { icon: Zap,    color: '#3B82F6', colorSoft: 'rgba(59,130,246,0.12)', label: 'Comercial' },
  'claude-code-mastery':       { icon: Brain,  color: '#10B981', colorSoft: 'rgba(16,185,129,0.12)', label: 'Meta-AIOS' },
};

const STATUS_DOT: Record<string, string> = {
  idle:    '#6B7280',
  running: '#10B981',
  blocked: '#F59E0B',
  error:   '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  idle: 'Aguardando', running: 'Ativo', blocked: 'Pausado', error: 'Erro',
};

// Dados mock para quando tabela ainda não existe
const MOCK_AGENTS: AgentStatusItem[] = [
  { id: '1', squad_id: 'omniseen-conteudo',         agent_id: 'content-writer',  role: 'writer',     status: 'idle',    metrics: { total_runs: 0 } },
  { id: '2', squad_id: 'omniseen-presenca-digital', agent_id: 'serp-analyst',    role: 'analyst',    status: 'idle',    metrics: { total_runs: 0 } },
  { id: '3', squad_id: 'omniseen-comercial',        agent_id: 'sdr-agent',       role: 'sdr',        status: 'idle',    metrics: { total_runs: 0 } },
];

export function AgentsStatusWidget({ tenantId }: AgentsStatusWidgetProps) {
  const [agents, setAgents] = useState<AgentStatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const { data, error } = await supabase
          .from('aios_agents' as any)
          .select('id, squad_id, agent_id, role, status, current_task, metrics')
          .limit(6);

        if (error || !data) {
          // Tabela ainda não existe — usar mock
          setAgents(MOCK_AGENTS);
        } else {
          setAgents(data as AgentStatusItem[]);
        }
      } catch {
        setAgents(MOCK_AGENTS);
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, [tenantId]);

  const runningCount = agents.filter(a => a.status === 'running').length;

  if (loading) {
    return (
      <div className="mb-8">
        <div className="h-32 bg-muted/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10">
            <Bot className="h-4 w-4 text-violet-500" />
          </div>
          <h2 className="font-semibold text-sm">Agentes AIOS Ativos</h2>
          {runningCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500">
              {runningCount} rodando
            </span>
          )}
        </div>
        <a
          href="/admin/command-center"
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          Painel completo <ChevronRight className="h-3 w-3" />
        </a>
      </div>

      {/* Agents grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {agents.slice(0, 3).map((agent) => {
          const meta = SQUAD_META[agent.squad_id];
          const Icon = meta?.icon ?? Bot;
          const dot = STATUS_DOT[agent.status] ?? '#6B7280';

          return (
            <div
              key={agent.id}
              className="relative flex items-start gap-3 p-4 rounded-xl border border-muted/60 hover:border-primary/20 transition-all group overflow-hidden"
            >
              {/* Glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
                style={{ background: meta ? `radial-gradient(ellipse at top left, ${meta.colorSoft} 0%, transparent 80%)` : undefined }}
              />

              <div
                className="relative p-2 rounded-lg shrink-0"
                style={{ background: meta?.colorSoft ?? 'rgba(107,114,128,0.1)' }}
              >
                <Icon className="h-4 w-4" style={{ color: meta?.color ?? '#6B7280' }} />
              </div>

              <div className="relative min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{agent.agent_id}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {agent.current_task?.type ?? (meta?.label ?? agent.squad_id)}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: dot,
                      boxShadow: agent.status === 'running' ? `0 0 6px ${dot}` : 'none',
                    }}
                  />
                  <span className="text-xs font-medium" style={{ color: dot }}>
                    {STATUS_LABEL[agent.status] ?? 'Aguardando'}
                  </span>
                  {(agent.metrics?.total_runs ?? 0) > 0 && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {agent.metrics!.total_runs} runs
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {agents.length === 0 && (
          <div className="col-span-3 text-center py-6 text-muted-foreground text-sm">
            <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhum agente ativo ainda. Configure os squads AIOS no painel admin.
          </div>
        )}
      </div>
    </div>
  );
}
