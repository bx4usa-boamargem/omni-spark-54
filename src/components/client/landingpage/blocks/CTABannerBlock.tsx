import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTABanner } from "../types/landingPageTypes";
import { buildSimpleWhatsAppLink } from "@/lib/whatsappBuilder";

interface CTABannerBlockProps {
  data: CTABanner;
  whatsapp?: string;
  primaryColor?: string;
  onEdit?: (field: keyof CTABanner, value: string) => void;
  isEditing?: boolean;
}

export function CTABannerBlock({ 
  data,
  whatsapp,
  primaryColor,
  onEdit,
  isEditing = false 
}: CTABannerBlockProps) {
  const handleCall = () => {
    if (data.phone) {
      window.open(`tel:${data.phone.replace(/\D/g, '')}`, '_self');
    }
  };

  const handleWhatsApp = () => {
    if (whatsapp) {
      window.open(buildSimpleWhatsAppLink(whatsapp), '_blank');
    }
  };

  const bgColor = data.background_color || primaryColor || 'hsl(var(--primary))';

  return (
    <section 
      className="py-16 px-4 relative overflow-hidden"
      style={{ 
        background: `linear-gradient(135deg, ${bgColor} 0%, hsl(var(--primary)/0.85) 100%)`
      }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="container max-w-4xl mx-auto relative z-10 text-center text-white">
        {/* Title */}
        {isEditing ? (
          <input
            type="text"
            value={data.title}
            onChange={(e) => onEdit?.('title', e.target.value)}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-transparent border-b-2 border-white/50 w-full text-center focus:outline-none focus:border-white"
          />
        ) : (
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {data.title}
          </h2>
        )}

        {/* Subtitle */}
        {isEditing ? (
          <input
            type="text"
            value={data.subtitle}
            onChange={(e) => onEdit?.('subtitle', e.target.value)}
            className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto bg-transparent border-b border-white/30 w-full text-center focus:outline-none focus:border-white/50"
          />
        ) : (
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {data.subtitle}
          </p>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            onClick={handleCall}
            className="bg-white text-primary hover:bg-white/90 font-bold px-10 py-7 text-lg shadow-xl"
          >
            <Phone className="w-6 h-6 mr-2" />
            {data.cta_text || "Ligar Agora"}
          </Button>

          {whatsapp && (
            <Button
              size="lg"
              variant="outline"
              onClick={handleWhatsApp}
              className="border-2 border-white text-white hover:bg-white hover:text-primary font-bold px-10 py-7 text-lg"
            >
              <MessageCircle className="w-6 h-6 mr-2" />
              WhatsApp
            </Button>
          )}
        </div>

        {/* Phone Display */}
        {data.phone && (
          <p className="mt-8 text-2xl md:text-3xl font-bold tracking-wide">
            📞 {data.phone}
          </p>
        )}
      </div>
    </section>
  );
}
