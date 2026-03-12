/**
 * ResetPassword Page — OMNISEEN V4
 * Redefine a senha com token da URL
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { z } from 'zod';
import '@/styles/auth.css';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres').regex(/[A-Z]/, 'Inclua uma letra maiúscula').regex(/[0-9]/, 'Inclua um número'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'As senhas não coincidem', path: ['confirm'] });

function getStrength(pw: string): { level: number; label: string } {
  if (!pw) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Fraca' };
  if (score <= 2) return { level: 2, label: 'Média' };
  return { level: 3, label: 'Forte' };
}

function ResetPasswordContent() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const strength = getStrength(password);

  useEffect(() => {
    // Verifica se a sessão foi estabelecida via token (link do email)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setTokenValid(true);
      } else {
        // Tenta parsear do hash da URL para recovery
        const hash = window.location.hash;
        if (hash.includes('type=recovery') || hash.includes('access_token')) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
        }
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setErrors({ form: err.message || 'Erro ao redefinir senha.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
        <div className="auth-spinner" style={{ width: 32, height: 32, borderColor: 'rgba(0,217,126,0.2)', borderTopColor: '#00d97e' }} />
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <AuthLayout headline="Link inválido" subheadline="Solicite um novo link de recuperação." showTestimonial={false}>
        <div className="auth-card">
          <div className="auth-alert error">
            <AlertCircle size={14} className="auth-alert-icon" />
            Este link expirou ou é inválido.
          </div>
          <button className="auth-btn auth-btn-primary" onClick={() => navigate('/forgot-password')}>
            Solicitar novo link
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout headline="Senha redefinida!" subheadline="Você será redirecionado em instantes." showTestimonial={false}>
        <div className="auth-card">
          <div className="auth-success-screen">
            <div className="auth-success-icon">🔒</div>
            <h2 className="auth-success-title">Senha atualizada!</h2>
            <p className="auth-success-desc">Sua senha foi redefinida com sucesso. Redirecionando para o login...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Defina sua nova senha" subheadline="Escolha uma senha forte para proteger seu acesso." showTestimonial={false}>
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Nova senha</h1>
          <p className="auth-subtitle">Escolha uma senha segura para sua conta.</p>
        </div>

        {errors.form && (
          <div className="auth-alert error">
            <AlertCircle size={14} className="auth-alert-icon" />
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-fields" noValidate>
          {/* Password */}
          <div className="auth-field">
            <label htmlFor="rp-password" className="auth-label">Nova senha</label>
            <div className="auth-input-wrap">
              <Lock size={15} className="auth-input-icon" />
              <input
                id="rp-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`auth-input has-right-icon${errors.password ? ' error' : ''}`}
              />
              <button type="button" className="auth-input-icon-right" onClick={() => setShowPw((v) => !v)} aria-label="Mostrar/ocultar senha">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <span className="auth-field-error">{errors.password}</span>}
            {password && (
              <div className="auth-password-strength">
                <div className="auth-password-bars">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className={`auth-password-bar ${strength.level >= n ? (strength.level === 1 ? 'weak' : strength.level === 2 ? 'medium' : 'strong') : ''}`} />
                  ))}
                </div>
                <span className="auth-password-label">Senha {strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div className="auth-field">
            <label htmlFor="rp-confirm" className="auth-label">Confirmar senha</label>
            <div className="auth-input-wrap">
              <Lock size={15} className="auth-input-icon" />
              <input
                id="rp-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`auth-input has-right-icon${errors.confirm ? ' error' : ''}`}
              />
              <button type="button" className="auth-input-icon-right" onClick={() => setShowConfirm((v) => !v)} aria-label="Mostrar/ocultar confirmação">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.confirm && <span className="auth-field-error">{errors.confirm}</span>}
            {confirm && password === confirm && (
              <p className="auth-field-error" style={{ color: 'var(--auth-green)' }}>
                <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                Senhas coincidem
              </p>
            )}
          </div>

          <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
            {isLoading ? <div className="auth-spinner" /> : (
              <>Redefinir senha <ArrowRight size={15} /></>
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

export default function ResetPassword() {
  return (
    <ErrorBoundary fallback={<div style={{ padding: 32, color: '#fff', textAlign: 'center' }}>Erro <button onClick={() => window.location.reload()} style={{ color: '#00d97e', background: 'none', border: 'none', cursor: 'pointer' }}>Recarregar</button></div>}>
      <ResetPasswordContent />
    </ErrorBoundary>
  );
}
