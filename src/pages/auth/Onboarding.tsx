/**
 * Onboarding — OMNISEEN V4
 * Wizard 4 steps: Perfil → Empresa → Objetivo → Conectar
 * Design dark premium, CSS vars de auth.css
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import {
  User,
  Building2,
  Target,
  Plug,
  ArrowRight,
  ArrowLeft,
  Check,
  Globe,
  Rocket,
  BarChart3,
  ShoppingBag,
  BookOpen,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import '@/styles/auth.css';

/* ─────────── Types ─────────── */
interface OnboardingData {
  // Step 1 – Perfil
  fullName: string;
  phone: string;
  // Step 2 – Empresa
  companyName: string;
  website: string;
  segment: string;
  // Step 3 – Objetivo
  mainGoal: string;
  monthlyVolume: string;
  // Step 4 – Conectar
  wpUrl: string;
}

/* ─────────── Opções ─────────── */
const SEGMENTS = [
  { value: 'ecommerce', label: 'E-commerce', icon: ShoppingBag },
  { value: 'blog', label: 'Blog / Conteúdo', icon: BookOpen },
  { value: 'servicos', label: 'Serviços', icon: Briefcase },
  { value: 'saas', label: 'SaaS / Tech', icon: Globe },
];

const GOALS = [
  { value: 'trafego', label: 'Aumentar tráfego orgânico', icon: BarChart3 },
  { value: 'leads', label: 'Gerar mais leads', icon: Target },
  { value: 'autoridade', label: 'Construir autoridade', icon: Rocket },
  { value: 'escala', label: 'Escalar produção de conteúdo', icon: Globe },
];

const VOLUMES = [
  { value: '1-4', label: '1 – 4 artigos/mês' },
  { value: '5-10', label: '5 – 10 artigos/mês' },
  { value: '11-30', label: '11 – 30 artigos/mês' },
  { value: '30+', label: 'Mais de 30 artigos/mês' },
];

/* ─────────── Step indicator ─────────── */
const STEPS = [
  { label: 'Perfil', icon: User },
  { label: 'Empresa', icon: Building2 },
  { label: 'Objetivo', icon: Target },
  { label: 'Conectar', icon: Plug },
];

/* ─────────── Helpers ─────────── */
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="onb-steps">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="onb-step-item">
            <div className={`onb-step-circle ${done ? 'done' : active ? 'active' : ''}`}>
              {done ? <Check size={14} /> : <Icon size={14} />}
            </div>
            <span className={`onb-step-label ${active ? 'active' : ''}`}>{s.label}</span>
            {i < STEPS.length - 1 && <div className={`onb-step-line ${done ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

function SelectCard({
  selected,
  onSelect,
  options,
}: {
  selected: string;
  onSelect: (v: string) => void;
  options: { value: string; label: string; icon?: React.ComponentType<{ size?: number }> }[];
}) {
  return (
    <div className="onb-cards">
      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            className={`onb-card ${selected === opt.value ? 'selected' : ''}`}
            onClick={() => onSelect(opt.value)}
          >
            {Icon && <Icon size={20} />}
            <span>{opt.label}</span>
            {selected === opt.value && <Check size={12} className="onb-card-check" />}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────── Step 1: Perfil ─────────── */
function StepPerfil({
  data,
  onChange,
  onNext,
}: {
  data: OnboardingData;
  onChange: (k: keyof OnboardingData, v: string) => void;
  onNext: () => void;
}) {
  const handleNext = () => {
    if (!data.fullName.trim()) {
      toast.error('Informe seu nome completo.');
      return;
    }
    onNext();
  };
  return (
    <div className="onb-step-content">
      <div className="auth-header">
        <h2 className="auth-title">Olá! Como você se chama?</h2>
        <p className="auth-subtitle">Vamos personalizar sua experiência</p>
      </div>
      <div className="auth-fields">
        <div className="auth-field">
          <label className="auth-label">Nome completo *</label>
          <div className="auth-input-wrap">
            <User size={15} className="auth-input-icon" />
            <input
              type="text"
              placeholder="Seu nome completo"
              value={data.fullName}
              onChange={(e) => onChange('fullName', e.target.value)}
              className="auth-input"
              autoFocus
            />
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-label">Telefone / WhatsApp <span className="onb-optional">(opcional)</span></label>
          <div className="auth-input-wrap">
            <span className="auth-input-icon onb-flag">🇧🇷</span>
            <input
              type="tel"
              placeholder="+55 (11) 99999-9999"
              value={data.phone}
              onChange={(e) => onChange('phone', e.target.value)}
              className="auth-input"
            />
          </div>
        </div>
      </div>
      <button className="auth-btn auth-btn-primary" type="button" onClick={handleNext}>
        Continuar <ArrowRight size={15} />
      </button>
    </div>
  );
}

/* ─────────── Step 2: Empresa ─────────── */
function StepEmpresa({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onChange: (k: keyof OnboardingData, v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const handleNext = () => {
    if (!data.companyName.trim()) {
      toast.error('Informe o nome da empresa ou blog.');
      return;
    }
    onNext();
  };
  return (
    <div className="onb-step-content">
      <div className="auth-header">
        <h2 className="auth-title">Sobre sua empresa</h2>
        <p className="auth-subtitle">Nos ajude a entender seu negócio</p>
      </div>
      <div className="auth-fields">
        <div className="auth-field">
          <label className="auth-label">Nome da empresa / blog *</label>
          <div className="auth-input-wrap">
            <Building2 size={15} className="auth-input-icon" />
            <input
              type="text"
              placeholder="Minha Empresa Ltda"
              value={data.companyName}
              onChange={(e) => onChange('companyName', e.target.value)}
              className="auth-input"
              autoFocus
            />
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-label">Site <span className="onb-optional">(opcional)</span></label>
          <div className="auth-input-wrap">
            <Globe size={15} className="auth-input-icon" />
            <input
              type="url"
              placeholder="https://meusite.com.br"
              value={data.website}
              onChange={(e) => onChange('website', e.target.value)}
              className="auth-input"
            />
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-label">Segmento *</label>
          <SelectCard
            selected={data.segment}
            onSelect={(v) => onChange('segment', v)}
            options={SEGMENTS}
          />
        </div>
      </div>
      <div className="onb-nav">
        <button className="auth-btn onb-btn-back" type="button" onClick={onBack}>
          <ArrowLeft size={15} /> Voltar
        </button>
        <button className="auth-btn auth-btn-primary" type="button" onClick={handleNext}>
          Continuar <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─────────── Step 3: Objetivo ─────────── */
function StepObjetivo({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: OnboardingData;
  onChange: (k: keyof OnboardingData, v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const handleNext = () => {
    if (!data.mainGoal) {
      toast.error('Selecione seu objetivo principal.');
      return;
    }
    onNext();
  };
  return (
    <div className="onb-step-content">
      <div className="auth-header">
        <h2 className="auth-title">Qual seu objetivo?</h2>
        <p className="auth-subtitle">Vamos configurar a IA para o que importa</p>
      </div>
      <div className="auth-fields">
        <div className="auth-field">
          <label className="auth-label">Objetivo principal *</label>
          <SelectCard
            selected={data.mainGoal}
            onSelect={(v) => onChange('mainGoal', v)}
            options={GOALS}
          />
        </div>
        <div className="auth-field">
          <label className="auth-label">Volume de publicação esperado</label>
          <div className="onb-radios">
            {VOLUMES.map((v) => (
              <label key={v.value} className={`onb-radio ${data.monthlyVolume === v.value ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="volume"
                  value={v.value}
                  checked={data.monthlyVolume === v.value}
                  onChange={() => onChange('monthlyVolume', v.value)}
                />
                {v.label}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="onb-nav">
        <button className="auth-btn onb-btn-back" type="button" onClick={onBack}>
          <ArrowLeft size={15} /> Voltar
        </button>
        <button className="auth-btn auth-btn-primary" type="button" onClick={handleNext}>
          Continuar <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─────────── Step 4: Conectar WordPress ─────────── */
function StepConectar({
  data,
  onChange,
  onSubmit,
  onBack,
  submitting,
}: {
  data: OnboardingData;
  onChange: (k: keyof OnboardingData, v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
}) {
  return (
    <div className="onb-step-content">
      <div className="auth-header">
        <h2 className="auth-title">Conecte seu WordPress</h2>
        <p className="auth-subtitle">Publique artigos diretamente do OMNISEEN. Você pode pular e configurar depois.</p>
      </div>
      <div className="auth-fields">
        <div className="onb-wp-box">
          <div className="onb-wp-icon">🔌</div>
          <div>
            <p className="onb-wp-title">WordPress (opcional)</p>
            <p className="onb-wp-desc">Conecte uma vez e publique com um clique</p>
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-label">URL do WordPress</label>
          <div className="auth-input-wrap">
            <Globe size={15} className="auth-input-icon" />
            <input
              type="url"
              placeholder="https://meublog.com.br"
              value={data.wpUrl}
              onChange={(e) => onChange('wpUrl', e.target.value)}
              className="auth-input"
            />
          </div>
          <span className="auth-field-hint">
            Você precisará instalar o plugin OMNISEEN no WordPress após esse passo.
          </span>
        </div>
      </div>
      <div className="onb-nav">
        <button className="auth-btn onb-btn-back" type="button" onClick={onBack} disabled={submitting}>
          <ArrowLeft size={15} /> Voltar
        </button>
        <button
          className="auth-btn auth-btn-primary"
          type="button"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? <div className="auth-spinner" /> : <><Rocket size={15} /> Começar agora</>}
        </button>
      </div>
      <p className="onb-skip" onClick={onSubmit}>
        Pular essa etapa →
      </p>
    </div>
  );
}

/* ─────────── Main Onboarding ─────────── */
function OnboardingContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<OnboardingData>({
    fullName: user?.user_metadata?.full_name ?? '',
    phone: '',
    companyName: '',
    website: '',
    segment: '',
    mainGoal: '',
    monthlyVolume: '',
    wpUrl: '',
  });

  const onChange = (k: keyof OnboardingData, v: string) =>
    setData((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      // 1. Atualiza metadados do usuário
      const { error: userErr } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
          phone: data.phone,
          onboarding_completed: true,
        },
      });
      if (userErr) throw userErr;

      // 2. Salva perfil na tabela profiles (se existir) - melhor esforço
      if (user?.id) {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: data.fullName,
          phone: data.phone,
          company_name: data.companyName,
          website: data.website,
          segment: data.segment,
          main_goal: data.mainGoal,
          monthly_volume: data.monthlyVolume,
          updated_at: new Date().toISOString(),
        });
      }

      toast.success('🎉 Bem-vindo ao OMNISEEN! Conta configurada.');
      navigate('/client/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar configurações';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="onb-root">
      {/* Noise + orbs de fundo */}
      <div className="onb-bg-noise" aria-hidden />
      <div className="auth-orb onb-orb-1" aria-hidden />
      <div className="auth-orb onb-orb-2" aria-hidden />

      <div className="onb-wrapper">
        {/* Logo */}
        <div className="onb-logo">
          <span className="auth-logo-icon">⬡</span>
          <span className="auth-logo-text">OMNISEEN</span>
        </div>

        {/* Progress */}
        <StepIndicator current={step} />

        {/* Card */}
        <div className="auth-card onb-card">
          {error && (
            <div className="auth-alert error" style={{ marginBottom: 16 }}>
              <AlertCircle size={14} className="auth-alert-icon" />
              {error}
            </div>
          )}

          {step === 0 && (
            <StepPerfil data={data} onChange={onChange} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <StepEmpresa
              data={data}
              onChange={onChange}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StepObjetivo
              data={data}
              onChange={onChange}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepConectar
              data={data}
              onChange={onChange}
              onSubmit={handleSubmit}
              onBack={() => setStep(2)}
              submitting={submitting}
            />
          )}
        </div>

        {/* Footer progress text */}
        <p className="onb-progress-text">
          Passo {step + 1} de {STEPS.length}
        </p>
      </div>
    </div>
  );
}

export default function Onboarding() {
  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: 32, color: '#fff', textAlign: 'center' }}>
          Erro ao carregar onboarding.{' '}
          <button
            onClick={() => window.location.reload()}
            style={{ color: '#00d97e', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Recarregar
          </button>
        </div>
      }
    >
      <OnboardingContent />
    </ErrorBoundary>
  );
}
