import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAIOSRealtime } from '@/hooks/useAIOSRealtime';
import { AgentEditModal } from '@/components/aios/AgentEditModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Play, Bot, Zap, AlertCircle, Clock, ChevronRight,
  Settings, Activity, Layers, Users,
} from 'lucide-react';

// ─── Squad metadata ───────────────────────────────────────────────────────────

const SQUAD_META: Record<string, { label: string; emoji: string; color: string; description: string }> = {
  'omniseen-conteudo': {
    label: 'Conteúdo',
    emoji: '✍️',
    color: '#6366f1',
    description: 'Redação, SEO e publicação de artigos',
  },
  'omniseen-presenca-digital': {
    label: 'Presença Digital',
    emoji: '🌐',
    color: '#10b981',
    description: 'SERP, keywords e análise de concorrentes',
  },
  'omniseen-comercial': {
    label: 'Comercial',
    emoji: '💼',
    color: '#f59e0b',
    description: 'SDR, follow-up e relatórios semanais',
  },
  'claude-code-mastery': {
    label: 'Meta-AIOS',
    emoji: '🤖',
    color: '#8b5cf6',
    description: 'Orquestração de múltiplos squads',
  },
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; dot: string }> = {
    idle:    { label: 'Ocioso',    color: 'rgba(255,255,255,0.08)', dot: '#6b7280' },
    running: { label: 'Rodando',   color: 'rgba(99,102,241,0.15)',  dot: '#6366f1' },
    error:   { label: 'Erro',      color: 'rgba(239,68,68,0.15)',   dot: '#ef4444' },
    paused:  { label: 'Pausado',   color: 'rgba(245,158,11,0.15)',  dot: '#f59e0b' },
  };
  const s = map[status] ?? map.idle;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.color, borderRadius: 20, padding: '2px 10px',
      fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
      color: 'rgba(255,255,255,0.85)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: s.dot,
        boxShadow: status === 'running' ? `0 0 6px ${s.dot}` : 'none',
        animation: status === 'running' ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }} />
      {s.label}
    </span>
  );
}

// ─── Agent card ───────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onEdit,
}: {
  agent: {
    agent_id: string;
    squad_id: string;
    display_name?: string | null;
    role: string;
    status?: string;
    avatar_emoji?: string | null;
    avatar_color?: string | null;
    skills?: string[] | null;
    is_enabled?: boolean;
    metrics?: Record<string, number> | null;
  };
  onEdit: () => void;
}) {
  const emoji = agent.avatar_emoji || '🤖';
  const color = agent.avatar_color || '#6366f1';
  const name  = agent.display_name || agent.role;
  const status = agent.status || 'idle';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }}
      onClick={onEdit}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
    >
      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${color}22`,
        border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          {agent.role}
        </div>
      </div>

      {/* Status + edit icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <StatusBadge status={status} />
        <Settings size={13} color="rgba(255,255,255,0.25)" />
      </div>
    </div>
  );
}

// ─── Squad card ───────────────────────────────────────────────────────────────

function SquadCard({
  squadId,
  agents,
  onRunSquad,
  onEditAgent,
  runningSquads,
}: {
  squadId: string;
  agents: ReturnType<typeof useAIOSRealtime>['agents'];
  onRunSquad: (squadId: string) => void;
  onEditAgent: (agent: ReturnType<typeof useAIOSRealtime>['agents'][0]) => void;
  runningSquads: Set<string>;
}) {
  const meta    = SQUAD_META[squadId] ?? { label: squadId, emoji: '🔧', color: '#6366f1', description: '' };
  const members = agents.filter(a => a.squad_id === squadId);
  const isRunning = runningSquads.has(squadId);
  const hasError  = members.some(a => a.status === 'error');

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${hasError ? 'rgba(239,68,68,0.3)' : isRunning ? `${meta.color}44` : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 16,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      transition: 'border-color 0.3s ease',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${meta.color}22`,
          border: `1.5px solid ${meta.color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          {meta.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{meta.label}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{meta.description}</div>
        </div>
        {/* Run button */}
        <button
          onClick={() => onRunSquad(squadId)}
          disabled={isRunning}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: isRunning ? 'rgba(255,255,255,0.06)' : `${meta.color}22`,
            border: `1px solid ${isRunning ? 'rgba(255,255,255,0.1)' : `${meta.color}55`}`,
            borderRadius: 8, padding: '6px 14px',
            color: isRunning ? 'rgba(255,255,255,0.3)' : meta.color,
            fontSize: 12, fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {isRunning ? <Activity size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={13} />}
          {isRunning ? 'Rodando…' : 'Run Squad'}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { icon: <Users size={11} />, label: `${members.length} agentes` },
          { icon: <Activity size={11} />, label: `${members.filter(a => a.status === 'running').length} ativos` },
          { icon: <AlertCircle size={11} />, label: `${members.filter(a => a.status === 'error').length} erros` },
        ].map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: 'rgba(255,255,255,0.4)',
          }}>
            {s.icon}{s.label}
          </div>
        ))}
      </div>

      {/* Agents list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {members.length === 0 ? (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '12px 0' }}>
            Nenhum agente cadastrado
          </div>
        ) : (
          members.map(agent => (
            <AgentCard key={agent.agent_id} agent={agent} onEdit={() => onEditAgent(agent)} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentSquadPage() {
  const navigate = useNavigate();
  const { agents, stepLogs, updateAgent } = useAIOSRealtime();
  const [editingAgent, setEditingAgent] = useState<typeof agents[0] | null>(null);
  const [runningSquads, setRunningSquads] = useState<Set<string>>(new Set());

  // Compute stats from agents array
  const stats = useMemo(() => ({
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'running').length,
    errorCount: agents.filter(a => a.status === 'error').length,
  }), [agents]);

  // Unique squad IDs from agents + known squads
  const squadIds = useMemo(() => {
    const fromAgents = [...new Set(agents.map(a => a.squad_id))];
    const known = Object.keys(SQUAD_META);
    return [...new Set([...known, ...fromAgents])];
  }, [agents]);

  // Run squad handler
  const handleRunSquad = async (squadId: string) => {
    setRunningSquads(prev => new Set(prev).add(squadId));
    try {
      const { error } = await supabase.functions.invoke('aios-orchestrator', {
        body: {
          squad: squadId,
          task: squadId === 'claude-code-mastery'
            ? 'run-swarm'
            : squadId === 'omniseen-conteudo'
            ? 'create-article'
            : squadId === 'omniseen-comercial'
            ? 'weekly-report'
            : 'local-seo-audit',
          params: {},
        },
      });
      if (error) throw error;
      toast.success(`Squad ${SQUAD_META[squadId]?.label ?? squadId} iniciado!`);
    } catch (err) {
      toast.error(`Falha ao rodar squad: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunningSquads(prev => {
        const next = new Set(prev);
        next.delete(squadId);
        return next;
      });
    }
  };

  // Save agent — delegates to hook.updateAgent which calls Supabase directly
  const handleSaveAgent = async (
    squadId: string,
    agentId: string,
    patch: Partial<Pick<typeof agents[0], 'display_name' | 'description' | 'avatar_emoji' | 'avatar_color' | 'skills' | 'system_prompt' | 'is_enabled'>>
  ) => {
    try {
      await updateAgent(squadId, agentId, patch);
      toast.success('Agente atualizado!');
      setEditingAgent(null);
    } catch (err) {
      toast.error(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const recentErrors = stepLogs.filter(l => l.status === 'error').slice(0, 5);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d0f1a 50%, #0a0c14 100%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#e2e8f0',
      padding: '32px 24px',
    }}>
      {/* CSS keyframes */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.3)',
          }}>
            <Bot size={22} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>
              Agent Squads
            </h1>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Gerencie e execute seus times de agentes AIOS
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/workflow-monitor')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 16px',
            color: 'rgba(255,255,255,0.7)', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Activity size={14} />
          Workflow Monitor
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28,
      }}>
        {[
          { icon: <Layers size={16} />, label: 'Squads', value: squadIds.length, color: '#6366f1' },
          { icon: <Bot size={16} />,    label: 'Agentes',  value: stats.totalAgents,  color: '#10b981' },
          { icon: <Zap size={16} />,    label: 'Ativos',   value: stats.activeAgents, color: '#f59e0b' },
          { icon: <AlertCircle size={16} />, label: 'Erros', value: stats.errorCount, color: '#ef4444' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${s.color}28`,
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `${s.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: s.color,
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Squads grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 28 }}>
        {squadIds.map(squadId => (
          <SquadCard
            key={squadId}
            squadId={squadId}
            agents={agents}
            onRunSquad={handleRunSquad}
            onEditAgent={setEditingAgent}
            runningSquads={runningSquads}
          />
        ))}
      </div>

      {/* Recent errors */}
      {recentErrors.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 14, padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertCircle size={15} color="#ef4444" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>Erros Recentes</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentErrors.map(log => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                <Clock size={11} color="#ef4444" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                  {log.agent_id}
                </span>
                <span style={{ fontSize: 11, color: '#f87171', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.error || 'Erro desconhecido'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Edit Modal */}
      {editingAgent && (
        <AgentEditModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          onSave={handleSaveAgent}
        />
      )}
    </div>
  );
}
