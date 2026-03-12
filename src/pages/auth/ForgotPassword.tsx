/**
 * ForgotPassword Page — OMNISEEN V4
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { z } from 'zod';
import '@/styles/auth.css';

const schema = z.object({
  email: z.string().email('Email inválido'),
});

function ForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Email inválido');
      return;
    }

    setIsLoading(true);
    try {
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (sbError) throw sbError;
      setSent(true);
      // countdown para reenviar
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      headline="Recupere o acesso à sua conta"
      subheadline="Enviaremos um link seguro para você redefinir sua senha."
      showTestimonial={false}
    >
      <div className="auth-card">
        {sent ? (
          <>
            <div className="auth-success-screen">
              <div className="auth-success-icon">📧</div>
              <h2 className="auth-success-title">Email enviado!</h2>
              <p className="auth-success-desc">
                Enviamos o link de recuperação para{' '}
                <strong style={{ color: '#fff' }}>{email}</strong>.
                <br />Verifique também a pasta de spam.
              </p>
            </div>
            <div className="auth-alert info" style={{ marginTop: 8 }}>
              <AlertCircle size={14} className="auth-alert-icon" />
              O link expira em 1 hora.
            </div>
            <button
              type="button"
              className="auth-btn auth-btn-primary"
              disabled={countdown > 0 || isLoading}
              onClick={handleSubmit as any}
            >
              {countdown > 0 ? `Reenviar em ${countdown}s` : isLoading ? <div className="auth-spinner" /> : 'Reenviar email'}
            </button>
            <p className="auth-footer"><Link to="/login">← Voltar ao login</Link></p>
          </>
        ) : (
          <>
            <div className="auth-header">
              <h1 className="auth-title">Esqueceu a senha?</h1>
              <p className="auth-subtitle">Digite seu email e enviaremos um link para redefinir.</p>
            </div>

            {error && (
              <div className="auth-alert error">
                <AlertCircle size={14} className="auth-alert-icon" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-fields" noValidate>
              <div className="auth-field">
                <label htmlFor="fp-email" className="auth-label">Email</label>
                <div className="auth-input-wrap">
                  <Mail size={15} className="auth-input-icon" />
                  <input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`auth-input${error ? ' error' : ''}`}
                  />
                </div>
              </div>

              <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading}>
                {isLoading ? <div className="auth-spinner" /> : 'Enviar link de recuperação'}
              </button>
            </form>

            <p className="auth-footer">
              <Link to="/login"><ArrowLeft size={12} style={{ display: 'inline', marginRight: 4 }} />Voltar ao login</Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

export default function ForgotPassword() {
  return (
    <ErrorBoundary fallback={<div style={{ padding: 32, color: '#fff', textAlign: 'center' }}>Erro <button onClick={() => window.location.reload()} style={{ color: '#00d97e', background: 'none', border: 'none', cursor: 'pointer' }}>Recarregar</button></div>}>
      <ForgotPasswordContent />
    </ErrorBoundary>
  );
}
