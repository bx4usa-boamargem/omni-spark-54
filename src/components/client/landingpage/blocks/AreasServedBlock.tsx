import { MapPin } from "lucide-react";
import { AreasServed } from "../types/landingPageTypes";

interface AreasServedBlockProps {
  data: AreasServed;
  primaryColor?: string;
  mapEmbedUrl?: string;
  onEdit?: (field: string, value: any) => void;
  isEditing?: boolean;
}

export function AreasServedBlock({ 
  data,
  primaryColor,
  mapEmbedUrl,
  onEdit,
  isEditing = false 
}: AreasServedBlockProps) {
  return (
    <section className="py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}
          >
            <MapPin 
              className="w-5 h-5" 
              style={{ color: primaryColor || 'hsl(var(--primary))' }}
            />
            <span 
              className="font-medium"
              style={{ color: primaryColor || 'hsl(var(--primary))' }}
            >
              Áreas de Atendimento
            </span>
          </div>
          
          {isEditing ? (
            <input
              type="text"
              value={data.title}
              onChange={(e) => onEdit?.('title', e.target.value)}
              className="text-3xl md:text-4xl font-bold text-foreground bg-transparent border-b-2 border-muted w-full text-center focus:outline-none focus:border-primary"
            />
          ) : (
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              {data.title}
            </h2>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Regions List */}
          <div className="space-y-6">
            {data.regions.map((region, regionIndex) => (
              <div key={regionIndex} className="bg-muted/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin 
                    className="w-5 h-5" 
                    style={{ color: primaryColor || 'hsl(var(--primary))' }}
                  />
                  {region.name}
                </h3>
                
                <div className="flex flex-wrap gap-2">
                  {region.neighborhoods.map((neighborhood, nhIndex) => (
                    <span
                      key={nhIndex}
                      className="px-3 py-1.5 bg-background rounded-full text-sm text-foreground border border-border hover:border-primary/50 transition-colors"
                    >
                      {neighborhood}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Map Embed */}
          <div className="sticky top-4">
            {mapEmbedUrl ? (
              <div className="rounded-xl overflow-hidden shadow-lg border border-border">
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização"
                  className="w-full"
                />
              </div>
            ) : (
              <div 
                className="h-[400px] rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}10` }}
              >
                <div className="text-center">
                  <MapPin 
                    className="w-16 h-16 mx-auto mb-4 opacity-50" 
                    style={{ color: primaryColor || 'hsl(var(--primary))' }}
                  />
                  <p className="text-muted-foreground">
                    Mapa de localização
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
