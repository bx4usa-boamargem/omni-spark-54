import { Check } from "lucide-react";
import { ServiceDetail } from "../types/landingPageTypes";

interface ServiceDetailBlockProps {
  details: ServiceDetail[];
  primaryColor?: string;
  onEdit?: (index: number, field: keyof ServiceDetail, value: string | string[]) => void;
  isEditing?: boolean;
}

export function ServiceDetailBlock({ 
  details,
  primaryColor,
  onEdit,
  isEditing = false 
}: ServiceDetailBlockProps) {
  return (
    <section className="py-16 px-4">
      <div className="container max-w-6xl mx-auto space-y-20">
        {details.map((detail, index) => {
          const isImageLeft = detail.side === 'left';
          
          return (
            <div 
              key={detail.id || index}
              className={`flex flex-col ${isImageLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-12 items-center`}
            >
              {/* Image Side */}
              <div className="w-full lg:w-1/2">
                {detail.image_url ? (
                  <img
                    src={detail.image_url}
                    alt={detail.title}
                    className="w-full h-64 lg:h-80 object-cover rounded-2xl shadow-lg"
                  />
                ) : (
                  <div 
                    className="w-full h-64 lg:h-80 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}
                  >
                    <span className="text-6xl">🏠</span>
                  </div>
                )}
              </div>

              {/* Content Side */}
              <div className="w-full lg:w-1/2 space-y-5">
                {isEditing ? (
                  <input
                    type="text"
                    value={detail.title}
                    onChange={(e) => onEdit?.(index, 'title', e.target.value)}
                    className="text-2xl md:text-3xl font-bold text-foreground bg-transparent border-b-2 border-muted w-full focus:outline-none focus:border-primary"
                  />
                ) : (
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                    {detail.title}
                  </h3>
                )}

                {isEditing ? (
                  <textarea
                    value={detail.content}
                    onChange={(e) => onEdit?.(index, 'content', e.target.value)}
                    className="text-muted-foreground leading-relaxed bg-transparent border border-muted rounded p-3 w-full resize-none focus:outline-none focus:border-primary"
                    rows={4}
                  />
                ) : (
                  <p className="text-muted-foreground leading-relaxed">
                    {detail.content}
                  </p>
                )}

                {/* Bullet Points */}
                <ul className="space-y-3">
                  {detail.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex} className="flex items-start gap-3">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}20` }}
                      >
                        <Check 
                          className="w-4 h-4" 
                          style={{ color: primaryColor || 'hsl(var(--primary))' }}
                        />
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) => {
                            const newBullets = [...detail.bullets];
                            newBullets[bulletIndex] = e.target.value;
                            onEdit?.(index, 'bullets', newBullets);
                          }}
                          className="text-foreground bg-transparent border-b border-muted flex-1 focus:outline-none focus:border-primary"
                        />
                      ) : (
                        <span className="text-foreground">{bullet}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
