import { ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTABannerProps {
  title?: string | null;
  description?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  ctaType?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
}

export const CTABanner = ({
  title,
  description,
  ctaText,
  ctaUrl,
  ctaType,
  primaryColor,
  secondaryColor,
}: CTABannerProps) => {
  if (!title && !description) return null;

  const getCtaHref = () => {
    if (!ctaUrl) return "#";
    if (ctaType === "whatsapp") {
      const phone = ctaUrl.replace(/\D/g, "");
      return `https://wa.me/${phone}`;
    }
    return ctaUrl;
  };

  const isWhatsApp = ctaType === "whatsapp";

  return (
    <div 
      className="rounded-xl p-8 text-center"
      style={{
        background: `linear-gradient(135deg, ${primaryColor || "hsl(var(--primary))"}, ${secondaryColor || "hsl(var(--primary))"})`,
      }}
    >
      {title && (
        <h3 className="font-heading font-bold text-xl md:text-2xl text-white mb-3">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-white/90 mb-6 max-w-lg mx-auto">
          {description}
        </p>
      )}
      {ctaText && ctaUrl && (
        <Button
          size="lg"
          variant="secondary"
          className="bg-white text-foreground hover:bg-white/90 font-semibold"
          asChild
        >
          <a href={getCtaHref()} target="_blank" rel="noopener noreferrer">
            {isWhatsApp ? (
              <MessageCircle className="h-5 w-5 mr-2" />
            ) : (
              <ExternalLink className="h-5 w-5 mr-2" />
            )}
            {ctaText}
          </a>
        </Button>
      )}
    </div>
  );
};
