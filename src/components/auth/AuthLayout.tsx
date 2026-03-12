/**
 * AuthLayout — Layout compartilhado para todas as telas de autenticação
 * Split: painel esquerdo visual + painel direito form
 */
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { OmniseenLogo } from '@/components/ui/OmniseenLogo';

interface AuthLayoutProps {
  children: ReactNode;
  /** Título do painel esquerdo */
  headline?: string;
  /** Subtítulo do painel esquerdo */
  subheadline?: string;
  /** Badges/depoimentos exibidos no painel esquerdo */
  showTestimonial?: boolean;
}

const testimonial = {
  text: '"Com o OMNISEEN, triplicamos nosso tráfego orgânico em 4 meses sem aumentar a equipe."',
  author: 'Marina Costa',
  role: 'Head de Marketing, Loja Integrada',
  avatar: 'MC',
};

const stats = [
  { value: '+340%', label: 'tráfego orgânico médio' },
  { value: '1 min', label: 'para criar um artigo completo' },
  { value: '50k+', label: 'artigos gerados' },
];

export function AuthLayout({
  children,
  headline = 'Transforme seu blog em uma máquina de crescimento orgânico',
  subheadline = 'Crie conteúdo SEO com IA, conecte seu WordPress e veja seu tráfego decolar.',
  showTestimonial = true,
}: AuthLayoutProps) {
  return (
    <div className="auth-root">
      {/* ── Painel Esquerdo — Branding ── */}
      <div className="auth-left">
        {/* Noise texture overlay */}
        <div className="auth-left-noise" aria-hidden />

        {/* Glow orbs */}
        <div className="auth-orb auth-orb-1" aria-hidden />
        <div className="auth-orb auth-orb-2" aria-hidden />

        <div className="auth-left-content">
          {/* Logo */}
          <Link to="/" className="auth-logo">
            <OmniseenLogo size="md" variant="light" />
          </Link>

          {/* Headline */}
          <div className="auth-headline-block">
            <h1 className="auth-headline">{headline}</h1>
            <p className="auth-subheadline">{subheadline}</p>
          </div>

          {/* Stats */}
          <div className="auth-stats">
            {stats.map((s) => (
              <div key={s.label} className="auth-stat">
                <span className="auth-stat-value">{s.value}</span>
                <span className="auth-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          {showTestimonial && (
            <div className="auth-testimonial">
              <p className="auth-testimonial-text">{testimonial.text}</p>
              <div className="auth-testimonial-author">
                <div className="auth-testimonial-avatar">{testimonial.avatar}</div>
                <div>
                  <div className="auth-testimonial-name">{testimonial.author}</div>
                  <div className="auth-testimonial-role">{testimonial.role}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Painel Direito — Form ── */}
      <div className="auth-right">
        <div className="auth-form-wrapper">
          {/* Mobile logo */}
          <Link to="/" className="auth-logo auth-logo-mobile">
            <OmniseenLogo size="sm" variant="light" />
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}
