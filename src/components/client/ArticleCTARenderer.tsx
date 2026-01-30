/**
 * Article CTA Renderer
 * 
 * Renders the CTA block from articles.cta with fallbacks
 * for missing fields (whatsapp → phone, booking_url → site).
 */

import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Calendar, ExternalLink, Building2 } from 'lucide-react';

interface ArticleCTA {
  company_name?: string;
  phone?: string;
  whatsapp?: string;
  booking_url?: string;
  site?: string;
  email?: string;
}

interface ArticleCTARendererProps {
  cta: ArticleCTA | null | undefined;
  className?: string;
  variant?: 'compact' | 'full';
}

export function ArticleCTARenderer({ cta, className = '', variant = 'full' }: ArticleCTARendererProps) {
  if (!cta) return null;

  const { company_name, phone, whatsapp, booking_url, site, email } = cta;

  // Determine which contact method to use (with fallbacks)
  const contactNumber = whatsapp || phone;
  const contactUrl = booking_url || site;

  // Format WhatsApp link
  const formatWhatsAppLink = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}`;
  };

  // Format phone link
  const formatPhoneLink = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    return `tel:+${cleanNumber}`;
  };

  // Don't render if no contact info at all
  if (!contactNumber && !contactUrl && !email) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {whatsapp && (
          <Button asChild size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
            <a href={formatWhatsAppLink(whatsapp)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        )}
        {!whatsapp && phone && (
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href={formatPhoneLink(phone)}>
              <Phone className="h-4 w-4" />
              Ligar
            </a>
          </Button>
        )}
        {contactUrl && (
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href={contactUrl} target="_blank" rel="noopener noreferrer">
              {booking_url ? <Calendar className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
              {booking_url ? 'Agendar' : 'Site'}
            </a>
          </Button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`rounded-xl border bg-card p-6 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Entre em contato</p>
          {company_name && (
            <p className="font-semibold text-foreground">{company_name}</p>
          )}
        </div>
      </div>

      {/* Contact Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Primary: WhatsApp */}
        {whatsapp && (
          <Button asChild className="flex-1 gap-2 bg-green-600 hover:bg-green-700">
            <a href={formatWhatsAppLink(whatsapp)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              Falar no WhatsApp
            </a>
          </Button>
        )}

        {/* Fallback: Phone (only if no WhatsApp) */}
        {!whatsapp && phone && (
          <Button asChild className="flex-1 gap-2" variant="default">
            <a href={formatPhoneLink(phone)}>
              <Phone className="h-5 w-5" />
              Ligar: {phone}
            </a>
          </Button>
        )}

        {/* Secondary: Booking or Site */}
        {booking_url && (
          <Button asChild variant="outline" className="flex-1 gap-2">
            <a href={booking_url} target="_blank" rel="noopener noreferrer">
              <Calendar className="h-5 w-5" />
              Agendar Consulta
            </a>
          </Button>
        )}

        {!booking_url && site && (
          <Button asChild variant="outline" className="flex-1 gap-2">
            <a href={site} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-5 w-5" />
              Visitar Site
            </a>
          </Button>
        )}
      </div>

      {/* Phone (if WhatsApp is present, show phone as secondary) */}
      {whatsapp && phone && (
        <p className="text-sm text-center text-muted-foreground">
          Ou ligue: <a href={formatPhoneLink(phone)} className="text-primary hover:underline">{phone}</a>
        </p>
      )}
    </div>
  );
}
