/**
 * VerifyEmail Page — OMNISEEN V4
 * Tela de aguardo de verificação de email com reenvio
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertCircle, Mail, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthLayout } from '@/components/auth/AuthLayout';
import '@/styles/auth.css';

function VerifyEmailContent() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      setMessage('Email reenviado com sucesso!');
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setMessage(err.message || 'Erro ao reenviar. Tente novamente.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      headline="Confirme seu email para continuar"
      subheadline="Após verificar, você terá acesso completo à plataforma."
      showTestimonial={false}
    >
      <div className="auth-card">
        <div className="auth-success-screen">
          <div className="auth-success-icon">
            <Mail size={32} strokeWidth={1.5} style={{ color: '#00d97e' }} />
          </div>
          <h1 className="auth-success-title">Verifique seu email</h1>
          <p className="auth-success-desc">
            Enviamos um link de confirmação para{' '}
            {email ? <strong style={{ color: '#fff' }}>{email}</strong> : 'o email informado'}.
            <br />
            Clique no link para ativar sua conta.
          </p>
        </div>

        <div className="auth-alert info">
          <AlertCircle size={14} className="auth-alert-icon" />
          Não encontrou? Verifique a pasta de spam.
        </div>

        {message && (
          <div className={`auth-alert ${message.includes('sucesso') ? 'success' : 'error'}`}>
            <AlertCircle size={14} className="auth-alert-icon" />
            {message}
          </div>
        )}

        {email && (
          <button
            type="button"
            className="auth-btn auth-btn-google"
            onClick={handleResend}
            disabled={countdown > 0 || isResending}
          >
            {isResending ? (
              <div className="auth-spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
            ) : (
              <RefreshCw size={15} />
            )}
            {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar email'}
          </button>
        )}

        <p className="auth-footer">
          Email errado? <Link to="/signup">Voltar ao cadastro</Link>
          {' · '}
          <Link to="/login">Entrar</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmail() {
  return (
    <ErrorBoundary fallback={<div style={{ padding: 32, color: '#fff', textAlign: 'center' }}>Erro <button onClick={() => window.location.reload()} style={{ color: '#00d97e', background: 'none', border: 'none', cursor: 'pointer' }}>Recarregar</button></div>}>
      <VerifyEmailContent />
    </ErrorBoundary>
  );
}
