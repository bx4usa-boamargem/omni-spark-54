/**
 * Login Page — OMNISEEN V4
 * Design dark premium com layout split
 */
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { toast } from 'sonner';
import { z } from 'zod';
import '@/styles/auth.css';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

function GoogleIcon() {
  return (
    <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function LoginContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signInWithGoogle, loading: authLoading } = useAuth();
  const redirectedRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const em = searchParams.get('email');
    if (em) setEmail(em);
  }, [searchParams]);

  const safeRedirect = (path: string) => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    navigate(path, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => { if (e.path[0]) errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrors({ form: 'Email ou senha incorretos.' });
        return;
      }
      await supabase.auth.getSession();
      toast.success('Bem-vindo de volta! 👋');
      safeRedirect('/client/dashboard');
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

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
        <div className="auth-spinner" style={{ width: 32, height: 32, borderColor: 'rgba(0,217,126,0.2)', borderTopColor: '#00d97e' }} />
      </div>
    );
  }

  return (
    <AuthLayout
      headline="Bem-vindo de volta ao OMNISEEN"
      subheadline="Entre na sua conta e continue crescendo seu tráfego orgânico com IA."
    >
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Entrar</h1>
          <p className="auth-subtitle">Acesse sua conta para continuar</p>
        </div>

        {/* Google */}
        <button className="auth-btn auth-btn-google" type="button" onClick={handleGoogle} disabled={isLoading}>
          {isLoading ? <div className="auth-spinner" /> : <GoogleIcon />}
          Continuar com Google
        </button>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">ou</span>
          <div className="auth-divider-line" />
        </div>

        {/* Form Error */}
        {errors.form && (
          <div className="auth-alert error">
            <AlertCircle size={14} className="auth-alert-icon" />
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-fields" noValidate>
          {/* Email */}
          <div className="auth-field">
            <label htmlFor="login-email" className="auth-label">Email</label>
            <div className="auth-input-wrap">
              <Mail size={15} className="auth-input-icon" />
              <input
                id="login-email"
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
            <div className="auth-label-row">
              <label htmlFor="login-password" className="auth-label">Senha</label>
              <Link to="/forgot-password" className="auth-label-link">Esqueceu a senha?</Link>
            </div>
            <div className="auth-input-wrap">
              <Lock size={15} className="auth-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
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
          </div>

          <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
            {isLoading ? <div className="auth-spinner" /> : (
              <>Entrar <ArrowRight size={15} /></>
            )}
          </button>
        </form>

        <p className="auth-footer">
          Não tem uma conta?{' '}
          <Link to="/signup">Criar conta grátis</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function Login() {
  return (
    <ErrorBoundary fallback={<div style={{ padding: 32, color: '#fff', textAlign: 'center' }}>Erro ao carregar. <button onClick={() => window.location.reload()} style={{ color: '#00d97e', background: 'none', border: 'none', cursor: 'pointer' }}>Recarregar</button></div>}>
      <LoginContent />
    </ErrorBoundary>
  );
}
