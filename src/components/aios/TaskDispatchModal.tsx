import { useState } from 'react';
import { X, Zap, Loader2, ChevronDown } from 'lucide-react';
import type { Squad } from './SquadCard';

interface TaskDispatchModalProps {
  squad: Squad | null;
  onClose: () => void;
  onDispatch: (squad: Squad, task: string, params: Record<string, string>) => Promise<void>;
}

const SQUAD_TASKS: Record<string, { label: string; value: string; fields: { key: string; label: string; placeholder: string }[] }[]> = {
  'omniseen-conteudo': [
    { label: 'Criar Artigo', value: 'create-article', fields: [
      { key: 'keyword', label: 'Keyword', placeholder: 'ex: dentista em são paulo' },
      { key: 'blog_id', label: 'Blog ID (opcional)', placeholder: 'UUID do blog...' },
    ]},
    { label: 'Otimizar SEO', value: 'optimize-seo', fields: [
      { key: 'article_id', label: 'Article ID', placeholder: 'UUID do artigo...' },
    ]},
    { label: 'Publicar Artigo', value: 'publish-article', fields: [
      { key: 'article_id', label: 'Article ID', placeholder: 'UUID do artigo...' },
    ]},
  ],
  'omniseen-presenca-digital': [
    { label: 'Auditoria SEO Local', value: 'local-seo-audit', fields: [
      { key: 'location', label: 'Localização', placeholder: 'ex: São Paulo, SP' },
      { key: 'niche', label: 'Nicho', placeholder: 'ex: odontologia' },
    ]},
    { label: 'Pesquisa de Keywords', value: 'keyword-research', fields: [
      { key: 'seed_keyword', label: 'Keyword Semente', placeholder: 'ex: clínica dental' },
    ]},
    { label: 'Análise de Concorrentes', value: 'analyze-competitors', fields: [
      { key: 'domain', label: 'Domínio', placeholder: 'ex: concorrente.com.br' },
    ]},
  ],
  'omniseen-comercial': [
    { label: 'Conversa SDR', value: 'run-sdr-conversation', fields: [
      { key: 'lead_name', label: 'Nome do Lead', placeholder: 'ex: João Silva' },
      { key: 'lead_context', label: 'Contexto', placeholder: 'ex: dentista, interesse em marketing...' },
    ]},
    { label: 'Gerar Relatório Semanal', value: 'weekly-report', fields: [
      { key: 'blog_id', label: 'Blog ID', placeholder: 'UUID do blog...' },
    ]},
  ],
  'claude-code-mastery': [
    { label: 'Executar Swarm', value: 'run-swarm', fields: [
      { key: 'squads', label: 'Squads (lista separada por vírgula)', placeholder: 'conteudo,presenca' },
      { key: 'objective', label: 'Objetivo', placeholder: 'Descreva o objetivo...' },
    ]},
  ],
};

export function TaskDispatchModal({ squad, onClose, onDispatch }: TaskDispatchModalProps) {
  const tasks = squad ? (SQUAD_TASKS[squad.id] || []) : [];
  const [selectedTask, setSelectedTask] = useState(tasks[0]?.value || '');
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!squad) return null;

  const currentTaskDef = tasks.find(t => t.value === selectedTask);

  const handleDispatch = async () => {
    if (!currentTaskDef) return;
    setLoading(true);
    try {
      await onDispatch(squad, selectedTask, params);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #1A1030 0%, #12112A 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: squad.colorSoft }}>
              {squad.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-white">Disparar Task</p>
              <p className="text-xs text-gray-400">{squad.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Task selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipo de Task</label>
          <div className="relative">
            <select
              value={selectedTask}
              onChange={(e) => { setSelectedTask(e.target.value); setParams({}); }}
              className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 pr-8"
            >
              {tasks.map(t => (
                <option key={t.value} value={t.value} style={{ background: '#1A1030' }}>{t.label}</option>
              ))}
              {tasks.length === 0 && <option value="">Nenhuma task disponível</option>}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Dynamic fields */}
        {currentTaskDef?.fields.map(field => (
          <div key={field.key} className="mb-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{field.label}</label>
            <input
              type="text"
              placeholder={field.placeholder}
              value={params[field.key] || ''}
              onChange={(e) => setParams(prev => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        ))}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-gray-400 hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDispatch}
            disabled={loading || tasks.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-50"
            style={{ background: success ? '#10B981' : `linear-gradient(135deg, ${squad.color}, #F97316)` }}
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Executando...</>
            ) : success ? (
              <>✓ Enviado!</>
            ) : (
              <><Zap size={14} /> Executar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
