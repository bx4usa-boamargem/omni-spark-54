import React, { useState, useMemo } from 'react';
import {
  Activity, RefreshCcw, AlertTriangle, CheckCircle2,
  Bot, Zap, Clock, Terminal, ChevronDown, Edit2,
  TrendingUp, DollarSign, Layers,
} from 'lucide-react';
import { useAIOSRealtime } from '@/hooks/useAIOSRealtime';
import type { AIOSAgent, AIOSRun, AIOSStepLog } from '@/hooks/useAIOSRealtime';
import { AgentEditModal } from '@/components/aios/AgentEditModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number) {
  if (ms < 1000)  return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)  return `${Math.round(diff / 1000)}s atrás`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
  return `${Math.floor(diff / 3600000)}h atrás`;
}

const STATUS_CONFIG = {
  idle:      { label: 'Aguardando', dot: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  running:   { label: 'Executando', dot: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  blocked:   { label: 'Bloqueado',  dot: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  error:     { label: 'Erro',       dot: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  queued:    { label: 'Na Fila',    dot: '#F59E0B', bg: 'rgba(245,158,11,0.12)'   },
  completed: { label: 'Concluído', dot: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  failed:    { label: 'Falhou',     dot: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  ok:        { label: 'OK',         dot: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  skipped:   { label: 'Pulou',      dot: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, color, sub
}: { icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="p-4 rounded-2xl border border-white/8 bg-white/3 flex items-center gap-4">
      <div className="p-2.5 rounded-xl" style={{ background: `${color}18` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-black text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  onClick,
  onEdit,
}: { agent: AIOSAgent; onClick: () => void; onEdit: () => void }) {
  const st = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
  const name = agent.display_name || agent.agent_id;
  const color = agent.avatar_color || '#7C3AED';

  return (
    <div
      className="group relative p-3.5 rounded-xl border border-white/8 bg-white/3 hover:border-white/20 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Edit button */}
      <button
        className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/15 text-gray-500 hover:text-gray-200 transition-all z-10"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
      >
        <Edit2 size={12} />
      </button>

      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: `${color}20`, border: `1.5px solid ${color}40` }}
        >
          {agent.avatar_emoji || '🤖'}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{agent.role}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ color: st.dot, background: st.bg }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: st.dot,
              boxShadow: agent.status === 'running' ? `0 0 6px ${st.dot}` : 'none',
            }}
          />
          {st.label}
        </span>
        {agent.last_active && (
          <span className="text-xs text-gray-600">{timeSince(agent.last_active)}</span>
        )}
      </div>

      {/* Skills */}
      {agent.skills && agent.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.skills.slice(0, 2).map(skill => (
            <span
              key={skill}
              className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/5"
            >
              {skill}
            </span>
          ))}
          {agent.skills.length > 2 && (
            <span className="text-xs text-gray-600">+{agent.skills.length - 2}</span>
          )}
        </div>
      )}
    </div>
  );
}

function RunRow({ run, isActive }: { run: AIOSRun; isActive: boolean }) {
  const st = STATUS_CONFIG[run.status] || STATUS_CONFIG.idle;
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
        isActive ? 'bg-white/8 border border-white/12' : 'hover:bg-white/4'
      }`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: st.dot, boxShadow: run.status === 'running' ? `0 0 6px ${st.dot}` : 'none' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-200 truncate">{run.task_type}</p>
        <p className="text-xs text-gray-600">{run.squad_id} · {timeSince(run.created_at)}</p>
      </div>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
        style={{ color: st.dot, background: st.bg }}
      >
        {st.label}
      </span>
    </div>
  );
}

function StepLogLine({ log }: { log: AIOSStepLog }) {
  const statusColors: Record<string, string> = {
    ok: '#10B981', error: '#EF4444', running: '#3B82F6', skipped: '#6B7280',
  };
  const color = statusColors[log.status] || '#6B7280';
  const time  = new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex gap-3 items-start py-1.5 border-b border-white/3 font-mono text-xs">
      <span className="text-gray-600 shrink-0 w-16">{time}</span>
      <span className="shrink-0 w-14" style={{ color }}>
        {log.status.toUpperCase()}
      </span>
      <span className="text-gray-400 flex-1">[{log.agent_id}] {log.step_name}</span>
      {log.duration_ms > 0 && (
        <span className="text-gray-600 shrink-0">{formatDuration(log.duration_ms)}</span>
      )}
      {log.cost_usd > 0 && (
        <span className="text-amber-600 shrink-0">${log.cost_usd.toFixed(4)}</span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface WorkflowMonitorProps {
  squadId?: string;
}

export const WorkflowMonitor: React.FC<WorkflowMonitorProps> = ({ squadId }) => {
  const {
    agents, runs, stepLogs, activeRun,
    loading, error,
    updateAgent, refresh,
  } = useAIOSRealtime({ squadId, maxRuns: 30, maxLogs: 80 });

  const [editingAgent, setEditingAgent] = useState<AIOSAgent | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<string | 'all'>('all');
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'running'>('all');

  // ── derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const running  = runs.filter(r => r.status === 'running').length;
    const success  = runs.filter(r => r.status === 'completed').length;
    const failures = runs.filter(r => r.status === 'failed').length;
    const totalTokens = stepLogs.reduce((s, l) => s + l.tokens_in + l.tokens_out, 0);
    const totalCost   = stepLogs.reduce((s, l) => s + l.cost_usd, 0);
    return { running, success, failures, totalTokens, totalCost };
  }, [runs, stepLogs]);

  // Squad list
  const squads = useMemo(() => {
    const seen = new Set<string>();
    agents.forEach(a => seen.add(a.squad_id));
    return Array.from(seen);
  }, [agents]);

  const filteredAgents = useMemo(() =>
    selectedSquad === 'all' ? agents : agents.filter(a => a.squad_id === selectedSquad),
    [agents, selectedSquad]
  );

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all')     return stepLogs.slice(-50);
    if (logFilter === 'error')   return stepLogs.filter(l => l.status === 'error').slice(-50);
    if (logFilter === 'running') return stepLogs.filter(l => l.status === 'running').slice(-50);
    return stepLogs.slice(-50);
  }, [stepLogs, logFilter]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0F0D1F 0%, #12112A 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-sm text-gray-500">Conectando ao AIOS...</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0F0D1F 0%, #12112A 100%)' }}>
        <div className="text-center p-8 rounded-2xl border border-red-500/20 bg-red-500/5 max-w-md">
          <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-300 font-semibold mb-1">Erro de conexão</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0F0D1F 0%, #12112A 100%)' }}
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/8 px-6 py-3.5 flex items-center justify-between" style={{ background: 'rgba(15,13,31,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/15">
            <Activity size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">AIOS Monitor</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs text-gray-500">
                {stats.running > 0 ? `${stats.running} runs ativas` : 'Sistema aguardando'}
                {' · '}
                {agents.filter(a => a.status === 'running').length} agentes ativos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Squad filter */}
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 focus:outline-none focus:border-violet-500/50"
              value={selectedSquad}
              onChange={e => setSelectedSquad(e.target.value)}
            >
              <option value="all">Todos os Squads</option>
              {squads.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-2 text-gray-500 pointer-events-none" />
          </div>

          <button
            onClick={refresh}
            className="p-2 rounded-lg border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Coluna esquerda: agentes + runs ── */}
        <div className="w-[340px] shrink-0 border-r border-white/8 flex flex-col overflow-hidden">
          {/* Stats mini */}
          <div className="p-4 border-b border-white/8 grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-white/3 border border-white/8 text-center">
              <p className="text-xl font-black text-emerald-400">{stats.success}</p>
              <p className="text-xs text-gray-600">Concluídos</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/3 border border-white/8 text-center">
              <p className="text-xl font-black text-red-400">{stats.failures}</p>
              <p className="text-xs text-gray-600">Falhas</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/3 border border-white/8 text-center">
              <p className="text-xl font-black text-blue-400">
                {stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(1)}k` : stats.totalTokens}
              </p>
              <p className="text-xs text-gray-600">Tokens</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/3 border border-white/8 text-center">
              <p className="text-xl font-black text-amber-400">${stats.totalCost.toFixed(3)}</p>
              <p className="text-xs text-gray-600">Custo</p>
            </div>
          </div>

          {/* Agentes */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Agentes ({filteredAgents.length})
              </p>
              <div className="space-y-2">
                {filteredAgents.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">Nenhum agente encontrado</p>
                ) : filteredAgents.map(agent => (
                  <AgentCard
                    key={`${agent.squad_id}-${agent.agent_id}`}
                    agent={agent}
                    onClick={() => {/* abrir AgentDrawer se quiser */}}
                    onEdit={() => setEditingAgent(agent)}
                  />
                ))}
              </div>
            </div>

            {/* Runs recentes */}
            <div className="p-3 border-t border-white/8">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Runs Recentes ({runs.length})
              </p>
              <div className="space-y-1">
                {runs.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">Nenhuma run registrada</p>
                ) : runs.slice(0, 15).map(run => (
                  <RunRow key={run.id} run={run} isActive={activeRun?.id === run.id} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Área central: Step Log Console ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Console header */}
          <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-violet-400" />
              <p className="text-xs font-bold text-gray-300">Step Log Console</p>
              {activeRun && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  ● Live: {activeRun.task_type}
                </span>
              )}
            </div>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {(['all', 'error', 'running'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${
                    logFilter === f ? 'bg-violet-600/50 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'error' ? 'Erros' : 'Ativos'}
                </button>
              ))}
            </div>
          </div>

          {/* Console body */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{ background: '#0A0910' }}
          >
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                <Terminal size={32} className="text-gray-700" />
                <p className="text-xs text-gray-600">Aguardando execuções...</p>
                <p className="text-xs text-gray-700 font-mono">{'> Sistema conectado e monitorando'}</p>
              </div>
            ) : (
              filteredLogs.map(log => (
                <StepLogLine key={log.id} log={log} />
              ))
            )}
          </div>

          {/* Active Run progress bar */}
          {activeRun && (
            <div className="px-5 py-3 border-t border-white/8 bg-emerald-500/5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-emerald-400">
                  ● {activeRun.task_type} · {activeRun.squad_id}
                </p>
                <p className="text-xs text-gray-500">
                  {timeSince(activeRun.created_at)}
                </p>
              </div>
              {/* Pulsing progress bar (indeterminate) */}
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full animate-pulse"
                  style={{ width: '60%', background: 'linear-gradient(90deg, #10B981, #059669)' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Agent Edit Modal ── */}
      {editingAgent && (
        <AgentEditModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onSave={updateAgent}
        />
      )}
    </div>
  );
};
