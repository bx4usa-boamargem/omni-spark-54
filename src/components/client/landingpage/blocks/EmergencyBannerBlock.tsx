import { Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmergencyBanner } from "../types/landingPageTypes";

interface EmergencyBannerBlockProps {
  data: EmergencyBanner;
  primaryColor?: string;
  onEdit?: (field: keyof EmergencyBanner, value: string | boolean) => void;
  isEditing?: boolean;
}

export function EmergencyBannerBlock({ 
  data,
  primaryColor = "hsl(var(--destructive))",
  onEdit,
  isEditing = false 
}: EmergencyBannerBlockProps) {
  const handleCall = () => {
    if (data.phone) {
      window.open(`tel:${data.phone.replace(/\D/g, '')}`, '_self');
    }
  };

  return (
    <section 
      className="py-12 px-4 relative overflow-hidden"
      style={{ 
        background: `linear-gradient(135deg, ${primaryColor} 0%, hsl(var(--destructive)/0.9) 100%)`
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container max-w-4xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          {/* Left: Icon + Text */}
          <div className="flex items-center gap-4 text-center md:text-left">
            {data.is_24h && (
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-8 h-8" />
              </div>
            )}
            
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => onEdit?.('title', e.target.value)}
                  className="text-2xl md:text-3xl font-bold bg-transparent border-b-2 border-white/50 w-full focus:outline-none focus:border-white"
                />
              ) : (
                <h2 className="text-2xl md:text-3xl font-bold">
                  {data.title}
                </h2>
              )}
              
              {isEditing ? (
                <input
                  type="text"
                  value={data.subtitle}
                  onChange={(e) => onEdit?.('subtitle', e.target.value)}
                  className="text-white/90 mt-1 bg-transparent border-b border-white/30 w-full focus:outline-none focus:border-white/50"
                />
              ) : (
                <p className="text-white/90 mt-1">
                  {data.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right: Phone + CTA */}
          <div className="flex flex-col items-center md:items-end gap-3">
            <Button
              size="lg"
              onClick={handleCall}
              className="bg-white text-destructive hover:bg-white/90 font-bold px-8 py-6 text-lg shadow-lg"
            >
              <Phone className="w-5 h-5 mr-2 animate-pulse" />
              Ligar Agora
            </Button>
            
            <p className="text-xl font-bold tracking-wider">
              📞 {data.phone}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
