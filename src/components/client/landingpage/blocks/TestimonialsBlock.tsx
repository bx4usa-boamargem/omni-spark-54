import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Testimonial } from "../types/landingPageTypes";

interface TestimonialsBlockProps {
  testimonials: Testimonial[];
  primaryColor?: string;
  onEdit?: (index: number, field: keyof Testimonial, value: string | number) => void;
  isEditing?: boolean;
}

export function TestimonialsBlock({ 
  testimonials,
  primaryColor,
  onEdit,
  isEditing = false 
}: TestimonialsBlockProps) {
  const renderStars = (rating: number = 5) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`}
      />
    ));
  };

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A satisfação dos nossos clientes é nossa maior conquista
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={testimonial.id || index}
              className="bg-card border-0 shadow-lg hover:shadow-xl transition-shadow"
            >
              <CardContent className="p-6">
                {/* Quote Icon */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}
                >
                  <Quote 
                    className="w-5 h-5" 
                    style={{ color: primaryColor || 'hsl(var(--primary))' }}
                  />
                </div>

                {/* Quote Text */}
                {isEditing ? (
                  <textarea
                    value={testimonial.quote}
                    onChange={(e) => onEdit?.(index, 'quote', e.target.value)}
                    className="text-foreground italic mb-5 leading-relaxed bg-transparent border border-muted rounded p-2 w-full resize-none focus:outline-none focus:border-primary"
                    rows={4}
                  />
                ) : (
                  <p className="text-foreground italic mb-5 leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                )}

                {/* Rating Stars */}
                <div className="flex gap-1 mb-4">
                  {renderStars(testimonial.rating)}
                </div>

                {/* Author */}
                <div className="flex items-center gap-3">
                  {testimonial.avatar_url ? (
                    <img
                      src={testimonial.avatar_url}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                      style={{ backgroundColor: primaryColor || 'hsl(var(--primary))' }}
                    >
                      {testimonial.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={testimonial.name}
                          onChange={(e) => onEdit?.(index, 'name', e.target.value)}
                          className="font-semibold text-foreground bg-transparent border-b border-muted w-full focus:outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          value={testimonial.location}
                          onChange={(e) => onEdit?.(index, 'location', e.target.value)}
                          className="text-sm text-muted-foreground bg-transparent border-b border-muted w-full focus:outline-none focus:border-primary"
                        />
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-foreground">
                          {testimonial.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.location}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
