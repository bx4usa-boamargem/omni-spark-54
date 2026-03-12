/**
 * Signup Page — OMNISEEN V4
 * Cadastro com senha forte, aceite de termos, Google OAuth
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { toast } from 'sonner';
import { z } from 'zod';
import '@/styles/auth.css';

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Inclua uma letra maiúscula')
    .regex(/[0-9]/, 'Inclua um número'),
  terms: z.literal(true, { errorMap: () => ({ message: 'Aceite os termos para continuar' }) }),
});

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

function GoogleIcon() {
  return (
    <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function SignupContent() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const strength = getStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = schema.safeParse({ name, email, password, terms: terms as true });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(email, password, { full_name: name });
      if (error) {
        if (error.message?.includes('already registered')) {
          setErrors({ form: 'Este email já está cadastrado.' });
        } else {
          setErrors({ form: error.message || 'Erro ao criar conta.' });
        }
        return;
      }
      setSuccess(true);
    } catch {
      setErrors({ form: 'Erro inesperado. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) toast.error(error.message || 'Erro ao entrar com Google');
    } catch {
      toast.error('Erro ao entrar com Google');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout headline="Quase lá! 🎉" subheadline="Verifique seu email para ativar sua conta." showTestimonial={false}>
        <div className="auth-card">
          <div className="auth-success-screen">
            <div className="auth-success-icon">✉️</div>
            <h2 className="auth-success-title">Confirme seu email</h2>
            <p className="auth-success-desc">
              Enviamos um link de confirmação para <strong style={{ color: '#fff' }}>{email}</strong>.
              Verifique sua caixa de entrada (e spam).
            </p>
            <button
              className="auth-btn auth-btn-primary"
              style={{ maxWidth: 280 }}
              onClick={() => navigate(`/login?email=${encodeURIComponent(email)}`)}
            >
              Ir para o login <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      headline="Cresça seu tráfego orgânico com IA"
      subheadline="Crie sua conta grátis e comece a gerar artigos otimizados em minutos."
    >
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Criar conta grátis</h1>
          <p className="auth-subtitle">14 dias grátis, sem cartão de crédito</p>
        </div>

        {/* Google */}
        <button className="auth-btn auth-btn-google" type="button" onClick={handleGoogle} disabled={isLoading}>
          {isLoading ? <div className="auth-spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} /> : <GoogleIcon />}
          Continuar com Google
        </button>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">ou cadastre pelo email</span>
          <div className="auth-divider-line" />
        </div>

        {errors.form && (
          <div className="auth-alert error">
            <AlertCircle size={14} className="auth-alert-icon" />
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-fields" noValidate>
          {/* Name */}
          <div className="auth-field">
            <label htmlFor="su-name" className="auth-label">Nome completo</label>
            <div className="auth-input-wrap">
              <User size={15} className="auth-input-icon" />
              <input
                id="su-name"
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`auth-input${errors.name ? ' error' : ''}`}
              />
            </div>
            {errors.name && <span className="auth-field-error">{errors.name}</span>}
          </div>

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="su-email" className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <Mail size={15} className="auth-input-icon" />
              <input
                id="su-email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`auth-input${errors.email ? ' error' : ''}`}
              />
            </div>
            {errors.email && <span className="auth-field-error">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="su-password" className="auth-label">Senha</label>
            <div className="auth-input-wrap">
              <Lock size={15} className="auth-input-icon" />
              <input
                id="su-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`auth-input has-right-icon${errors.password ? ' error' : ''}`}
              />
              <button
                type="button"
                className="auth-input-icon-right"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <span className="auth-field-error">{errors.password}</span>}
            {password && (
              <div className="auth-password-strength">
                <div className="auth-password-bars">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className={`auth-password-bar ${strength.level >= n ? (strength.level === 1 ? 'weak' : strength.level === 2 ? 'medium' : 'strong') : ''}`}
                    />
                  ))}
                </div>
                <span className="auth-password-label">Senha {strength.label}</span>
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="auth-checkbox-row">
            <input
              id="su-terms"
              type="checkbox"
              className="auth-checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <label htmlFor="su-terms" className="auth-checkbox-label">
              Aceito os{' '}
              <a href="/terms" target="_blank" className="auth-checkbox-link">Termos de Uso</a>
              {' '}e a{' '}
              <a href="/privacy" target="_blank" className="auth-checkbox-link">Política de Privacidade</a>
            </label>
          </div>
          {errors.terms && <span className="auth-field-error" style={{ marginTop: -8 }}>{errors.terms}</span>}

          <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
            {isLoading ? <div className="auth-spinner" /> : (
              <>Criar conta grátis <ArrowRight size={15} /></>
            )}
          </button>
        </form>

        <p className="auth-footer">
          Já tem uma conta?{' '}
          <Link to="/login">Entrar</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function Signup() {
  return (
    <ErrorBoundary fallback={<div style={{ padding: 32, color: '#fff', textAlign: 'center' }}>Erro <button onClick={() => window.location.reload()} style={{ color: '#00d97e', background: 'none', border: 'none', cursor: 'pointer' }}>Recarregar</button></div>}>
      <SignupContent />
    </ErrorBoundary>
  );
}
