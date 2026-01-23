import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSection } from "../types/landingPageTypes";
import { buildSimpleWhatsAppLink } from "@/lib/whatsappBuilder";

interface HeroBlockProps {
  data: HeroSection;
  whatsapp?: string;
  primaryColor?: string;
  companyName?: string;
  onEdit?: (field: keyof HeroSection, value: string) => void;
  isEditing?: boolean;
}

export function HeroBlock({ 
  data, 
  whatsapp, 
  primaryColor = "hsl(var(--primary))",
  companyName,
  onEdit,
  isEditing = false 
}: HeroBlockProps) {
  const handleCall = () => {
    if (data.cta_phone) {
      window.open(`tel:${data.cta_phone.replace(/\D/g, '')}`, '_self');
    }
  };

  const handleWhatsApp = () => {
    if (whatsapp) {
      window.open(buildSimpleWhatsAppLink(whatsapp), '_blank');
    }
  };

  return (
    <section 
      className="relative min-h-[500px] flex items-center justify-center py-16 px-4"
      style={{
        background: data.background_image_url 
          ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${data.background_image_url}) center/cover`
          : `linear-gradient(135deg, ${primaryColor} 0%, hsl(var(--primary)/0.8) 100%)`
      }}
    >
      <div className="container max-w-4xl mx-auto text-center text-white">
        {/* Badge */}
        {companyName && (
          <div className="inline-block mb-6 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
            <span className="text-sm font-medium">{companyName}</span>
          </div>
        )}

        {/* Title */}
        {isEditing ? (
          <input
            type="text"
            value={data.title}
            onChange={(e) => onEdit?.('title', e.target.value)}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight bg-transparent border-b-2 border-white/50 text-center w-full focus:outline-none focus:border-white"
          />
        ) : (
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            {data.title}
          </h1>
        )}

        {/* Subtitle */}
        {isEditing ? (
          <textarea
            value={data.subtitle}
            onChange={(e) => onEdit?.('subtitle', e.target.value)}
            className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto bg-transparent border-b border-white/30 text-center w-full resize-none focus:outline-none focus:border-white/50"
            rows={2}
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
            className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-6 text-lg shadow-lg"
          >
            <Phone className="w-5 h-5 mr-2" />
            {data.cta_text || "Ligar Agora"}
          </Button>

          {whatsapp && (
            <Button
              size="lg"
              variant="outline"
              onClick={handleWhatsApp}
              className="border-2 border-white text-white hover:bg-white hover:text-primary font-semibold px-8 py-6 text-lg"
            >
              💬 WhatsApp
            </Button>
          )}
        </div>

        {/* Phone Number Display */}
        {data.cta_phone && (
          <p className="mt-6 text-2xl font-bold tracking-wide">
            📞 {data.cta_phone}
          </p>
        )}
      </div>
    </section>
  );
}
