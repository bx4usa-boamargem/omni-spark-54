import { Phone, Wrench, Shield, Clock, Star, Home, Settings, Zap, Heart, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceCard } from "../types/landingPageTypes";

interface ServiceCardsBlockProps {
  services: ServiceCard[];
  phone: string;
  primaryColor?: string;
  onEdit?: (index: number, field: keyof ServiceCard, value: string) => void;
  isEditing?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  wrench: Wrench,
  shield: Shield,
  clock: Clock,
  star: Star,
  home: Home,
  settings: Settings,
  zap: Zap,
  heart: Heart,
  check: CheckCircle,
  phone: Phone,
};

function getIcon(iconName: string) {
  const Icon = ICON_MAP[iconName.toLowerCase()] || Wrench;
  return Icon;
}

export function ServiceCardsBlock({ 
  services, 
  phone,
  primaryColor,
  onEdit,
  isEditing = false 
}: ServiceCardsBlockProps) {
  const handleCallForService = (service: ServiceCard) => {
    if (phone) {
      window.open(`tel:${phone.replace(/\D/g, '')}`, '_self');
    }
  };

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nossos Serviços
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Oferecemos uma gama completa de serviços para atender todas as suas necessidades
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const Icon = getIcon(service.icon);
            
            return (
              <Card 
                key={service.id || index} 
                className="group hover:shadow-xl transition-all duration-300 border-0 bg-card overflow-hidden"
              >
                <CardContent className="p-6">
                  {/* Icon */}
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}20` }}
                  >
                    <Icon 
                      className="w-8 h-8" 
                      style={{ color: primaryColor || 'hsl(var(--primary))' }}
                    />
                  </div>

                  {/* Title */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={service.title}
                      onChange={(e) => onEdit?.(index, 'title', e.target.value)}
                      className="text-xl font-semibold text-foreground mb-3 bg-transparent border-b border-muted w-full focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {service.title}
                    </h3>
                  )}

                  {/* Description */}
                  {isEditing ? (
                    <textarea
                      value={service.description}
                      onChange={(e) => onEdit?.(index, 'description', e.target.value)}
                      className="text-muted-foreground mb-5 leading-relaxed bg-transparent border border-muted rounded p-2 w-full resize-none focus:outline-none focus:border-primary"
                      rows={3}
                    />
                  ) : (
                    <p className="text-muted-foreground mb-5 leading-relaxed">
                      {service.description}
                    </p>
                  )}

                  {/* CTA Button */}
                  <Button
                    variant="outline"
                    onClick={() => handleCallForService(service)}
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {service.cta_text || "Solicitar Orçamento"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
