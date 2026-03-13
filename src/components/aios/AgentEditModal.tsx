import { useState } from 'react';
import { X, Sparkles, Save, Bot, Palette, FileText, Zap } from 'lucide-react';
import type { AIOSAgent } from '@/hooks/useAIOSRealtime';

// ─── Paleta de cores para avatar ─────────────────────────────────────────────

const AVATAR_COLORS = [
  { hex: '#7C3AED', label: 'Violeta' },
  { hex: '#2563EB', label: 'Azul' },
  { hex: '#059669', label: 'Verde' },
  { hex: '#D97706', label: 'Âmbar' },
  { hex: '#DC2626', label: 'Vermelho' },
  { hex: '#DB2777', label: 'Rosa' },
  { hex: '#0891B2', label: 'Ciano' },
  { hex: '#92400E', label: 'Marrom' },
  { hex: '#1D4ED8', label: 'Índigo' },
  { hex: '#6D28D9', label: 'Roxo' },
];

const AVATAR_EMOJIS = [
  '🤖','🧠','✍️','🏗️','🔍','🎨','🚀','📊','📋','💼',
  '🎯','📈','👁️','🔑','🕸️','🔬','📍','⚡','🌐','🛡️',
  '📡','💡','🛠️','🔧','🌟','💎','🏆','🎤','📣','🤝',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface AgentEditModalProps {
  agent: AIOSAgent;
  onClose: () => void;
  onSave: (
    squadId: string,
    agentId: string,
    patch: Partial<Pick<AIOSAgent, 'display_name' | 'description' | 'avatar_emoji' | 'avatar_color' | 'skills' | 'system_prompt' | 'is_enabled'>>
  ) => Promise<void>;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AgentEditModal({ agent, onClose, onSave }: AgentEditModalProps) {
  const [displayName,   setDisplayName]   = useState(agent.display_name  ?? agent.agent_id);
  const [description,   setDescription]   = useState(agent.description   ?? '');
  const [avatarEmoji,   setAvatarEmoji]   = useState(agent.avatar_emoji  ?? '🤖');
  const [avatarColor,   setAvatarColor]   = useState(agent.avatar_color  ?? '#7C3AED');
  const [systemPrompt,  setSystemPrompt]  = useState(agent.system_prompt ?? '');
  const [skillsRaw,     setSkillsRaw]     = useState((agent.skills ?? []).join(', '));
  const [isEnabled,     setIsEnabled]     = useState(agent.is_enabled);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [tab,           setTab]           = useState<'identity' | 'prompt' | 'skills'>('identity');

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(agent.squad_id, agent.agent_id, {
        display_name:  displayName.trim() || agent.agent_id,
        description:   description.trim(),
        avatar_emoji:  avatarEmoji,
        avatar_color:  avatarColor,
        system_prompt: systemPrompt.trim() || undefined,
        skills:        skillsRaw.split(',').map(s => s.trim()).filter(Boolean),
        is_enabled:    isEnabled,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="relative w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(180deg, #1A1030 0%, #12112A 100%)',
            pointerEvents: 'all',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
                style={{ background: `${avatarColor}20`, border: `2px solid ${avatarColor}40` }}
              >
                {avatarEmoji}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Editar Agente</p>
                <p className="text-xs text-gray-500">{agent.squad_id} · {agent.agent_id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/8">
            {(['identity', 'prompt', 'skills'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                  tab === t
                    ? 'text-white border-b-2 border-violet-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t === 'identity' ? '🎭 Identidade' : t === 'prompt' ? '🧠 Prompt' : '⚡ Skills'}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

            {/* ── Tab: Identity ── */}
            {tab === 'identity' && (
              <>
                {/* Avatar Emoji */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Avatar</p>
                  <div className="grid grid-cols-10 gap-1.5 p-3 rounded-xl bg-white/3 border border-white/8">
                    {AVATAR_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => setAvatarEmoji(emoji)}
                        className={`text-lg w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          avatarEmoji === emoji
                            ? 'ring-2 ring-violet-500 bg-violet-500/20 scale-110'
                            : 'hover:bg-white/10'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar Color */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Palette size={11} /> Cor do Avatar
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c.hex}
                        onClick={() => setAvatarColor(c.hex)}
                        title={c.label}
                        className={`w-7 h-7 rounded-full transition-all ${
                          avatarColor === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ background: c.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Nome de exibição */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Bot size={11} /> Nome de Exibição
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/60"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    maxLength={60}
                    placeholder="Nome visível no painel"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={11} /> Descrição / Responsabilidade
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/60 resize-none"
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={300}
                    placeholder="O que este agente faz e qual sua responsabilidade no squad..."
                  />
                  <p className="text-xs text-gray-600 text-right mt-0.5">{description.length}/300</p>
                </div>

                {/* Habilitado */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/8">
                  <div>
                    <p className="text-sm font-semibold text-white">Agente ativo</p>
                    <p className="text-xs text-gray-500">Desativar remove o agente do workflow</p>
                  </div>
                  <button
                    onClick={() => setIsEnabled(v => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      isEnabled ? 'bg-violet-600' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        isEnabled ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </>
            )}

            {/* ── Tab: Prompt ── */}
            {tab === 'prompt' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={11} /> System Prompt Personalizado
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Sobrescreve o prompt padrão do agente. Deixe vazio para usar o padrão.
                  Pode incluir contexto do nicho, tom de voz, restrições, etc.
                </p>
                <textarea
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/60 resize-none font-mono text-xs"
                  rows={14}
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  placeholder={`Você é um especialista em [nicho]...\n\nTom de voz: profissional, direto.\nEspecialdiade: [descreva aqui]\n\nRegras:\n- Sempre inclua...`}
                />
                <p className="text-xs text-gray-600 text-right mt-0.5">{systemPrompt.length} chars</p>
              </div>
            )}

            {/* ── Tab: Skills ── */}
            {tab === 'skills' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Zap size={11} /> Skills / Competências
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Separe com vírgulas. Estas skills aparecem no tooltip do agente.
                </p>
                <textarea
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500/60 resize-none"
                  rows={3}
                  value={skillsRaw}
                  onChange={e => setSkillsRaw(e.target.value)}
                  placeholder="redação, SEO, copywriting, formatação markdown"
                />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skillsRaw.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                    <span
                      key={skill}
                      className="text-xs px-2 py-0.5 rounded-full border"
                      style={{
                        background: `${avatarColor}18`,
                        borderColor: `${avatarColor}40`,
                        color: avatarColor,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/8 flex items-center justify-between gap-3">
            {error && (
              <p className="text-xs text-red-400 flex-1">{error}</p>
            )}
            {!error && <div className="flex-1" />}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
            >
              {saving ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={13} />
                  Salvar Agente
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
