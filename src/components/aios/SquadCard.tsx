import { Bot, ChevronRight, Zap } from 'lucide-react';

export type SquadStatus = 'idle' | 'running' | 'error' | 'offline';

export interface Squad {
  id: string;
  name: string;
  description: string;
  agentCount: number;
  status: SquadStatus;
  runningAgents?: number;
  lastRun?: string;
  color: string;
  colorSoft: string;
  icon: string;
}

interface SquadCardProps {
  squad: Squad;
  onDispatch?: (squad: Squad) => void;
  onViewDetail?: (squad: Squad) => void;
}

const statusConfig: Record<SquadStatus, { label: string; dot: string; bg: string }> = {
  idle:    { label: 'Aguardando', dot: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  running: { label: 'Em Execução', dot: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  error:   { label: 'Erro',       dot: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  offline: { label: 'Offline',    dot: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
};

export function SquadCard({ squad, onDispatch, onViewDetail }: SquadCardProps) {
  const st = statusConfig[squad.status];

  return (
    <div
      className="relative rounded-2xl border border-white/8 p-5 overflow-hidden group hover:border-white/20 transition-all duration-300 cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.03)' }}
      onClick={() => onViewDetail?.(squad)}
    >
      {/* Glow hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top left, ${squad.colorSoft} 0%, transparent 70%)` }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: squad.colorSoft }}>
            {squad.icon}
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{squad.name}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">{squad.description}</p>
          </div>
        </div>
        <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-300 transition-colors mt-0.5 shrink-0" />
      </div>

      {/* Status */}
      <div className="flex items-center justify-between mb-4 relative">
        <span
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ color: st.dot, background: st.bg }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: st.dot, boxShadow: squad.status === 'running' ? `0 0 6px ${st.dot}` : 'none' }}
          />
          {st.label}
        </span>
        <span className="text-xs text-gray-500">
          {squad.runningAgents ?? 0}/{squad.agentCount} agentes
        </span>
      </div>

      {/* Progress bar de agentes */}
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${squad.agentCount > 0 ? ((squad.runningAgents ?? 0) / squad.agentCount) * 100 : 0}%`,
            background: squad.color,
          }}
        />
      </div>

      {/* Dispatch button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDispatch?.(squad); }}
        className="relative w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border border-white/10 hover:border-white/25 transition-all duration-200 group/btn"
        style={{ color: squad.color }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none"
          style={{ background: squad.colorSoft }}
        />
        <Zap size={12} className="relative" />
        <span className="relative">Disparar Task</span>
      </button>

      {squad.lastRun && (
        <p className="text-xs text-gray-600 text-center mt-2 relative">Última run: {squad.lastRun}</p>
      )}
    </div>
  );
}
