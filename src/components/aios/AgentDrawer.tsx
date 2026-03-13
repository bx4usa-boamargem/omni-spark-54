import { X, Clock, CheckCircle2, XCircle, Loader2, RefreshCcw } from 'lucide-react';

export interface AgentInfo {
  agent_id: string;
  squad_id: string;
  role: string;
  status: 'idle' | 'running' | 'blocked' | 'error';
  last_active?: string;
  current_task?: { type: string; keyword?: string; article_id?: string } | null;
  metrics?: {
    total_runs?: number;
    success_rate?: number;
    avg_latency_ms?: number;
  };
}

interface AgentDrawerProps {
  agent: AgentInfo | null;
  onClose: () => void;
  recentRuns?: {
    id: string;
    task_type: string;
    status: string;
    created_at: string;
    completed_at?: string;
  }[];
}

const statusColorMap: Record<string, { color: string; bg: string; label: string }> = {
  idle:    { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Aguardando' },
  running: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Em Execução' },
  blocked: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Bloqueado' },
  error:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Erro' },
  completed: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Concluído' },
  failed:  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Falhou' },
  queued:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Na Fila' },
};

function getDuration(start: string, end?: string): string {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const diff = Math.round((e.getTime() - s.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
}

export function AgentDrawer({ agent, onClose, recentRuns = [] }: AgentDrawerProps) {
  if (!agent) return null;

  const st = statusColorMap[agent.status] || statusColorMap.idle;
  const metrics = agent.metrics || {};

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 w-full max-w-sm overflow-y-auto border-l border-white/10 shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #1A1030 0%, #12112A 100%)' }}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-white/8 px-5 py-4 flex items-center justify-between" style={{ background: 'rgba(26,16,48,0.95)', backdropFilter: 'blur(12px)' }}>
          <div>
            <p className="text-sm font-bold text-white">{agent.agent_id}</p>
            <p className="text-xs text-gray-400">{agent.squad_id} · {agent.role}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Status atual */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status Atual</p>
            <span className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl w-fit"
              style={{ color: st.color, background: st.bg }}>
              <span className="w-2 h-2 rounded-full" style={{ background: st.color,
                boxShadow: agent.status === 'running' ? `0 0 8px ${st.color}` : 'none' }} />
              {st.label}
            </span>

            {agent.current_task && (
              <div className="mt-3 p-3 rounded-xl border border-white/8 bg-white/3">
                <p className="text-xs font-semibold text-gray-400 mb-1">Task Atual</p>
                <p className="text-sm text-white">{agent.current_task.type}</p>
                {agent.current_task.keyword && (
                  <p className="text-xs text-gray-500 mt-0.5">keyword: {agent.current_task.keyword}</p>
                )}
              </div>
            )}
          </div>

          {/* Métricas */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Métricas</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-white">{metrics.total_runs ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Runs</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xl font-black" style={{ color: (metrics.success_rate ?? 0) > 85 ? '#10B981' : '#F59E0B' }}>
                  {metrics.success_rate ?? 0}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Sucesso</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-white">{metrics.avg_latency_ms ? `${(metrics.avg_latency_ms / 1000).toFixed(1)}s` : '—'}</p>
                <p className="text-xs text-gray-500 mt-0.5">Latência</p>
              </div>
            </div>
          </div>

          {/* Histórico de runs */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Últimas Execuções</p>
            {recentRuns.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">Nenhuma execução registrada</p>
            ) : (
              <div className="space-y-2">
                {recentRuns.slice(0, 8).map((run) => {
                  const rst = statusColorMap[run.status] || statusColorMap.idle;
                  return (
                    <div key={run.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/3">
                      <div className="flex items-center gap-2">
                        {run.status === 'completed'
                          ? <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                          : run.status === 'failed'
                          ? <XCircle size={14} style={{ color: '#EF4444' }} />
                          : run.status === 'running'
                          ? <Loader2 size={14} style={{ color: '#3B82F6' }} className="animate-spin" />
                          : <Clock size={14} style={{ color: '#F59E0B' }} />
                        }
                        <div>
                          <p className="text-xs font-semibold text-gray-200">{run.task_type}</p>
                          <p className="text-xs text-gray-600">{getDuration(run.created_at, run.completed_at)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: rst.color, background: rst.bg }}>
                        {rst.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Last active */}
          {agent.last_active && (
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <RefreshCcw size={10} /> Ativo: {new Date(agent.last_active).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
