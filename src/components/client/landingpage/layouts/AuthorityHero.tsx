import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { InlineEditableText } from "../editor/InlineEditableText";
import { EditableBlockWrapper } from "../editor/EditableBlockWrapper";

interface AuthorityHeroProps {
  data: any;
  primaryColor: string;
  isEditing?: boolean;
  onEdit?: (field: string, value: string) => void;
}

export function AuthorityHero({ data, primaryColor, isEditing = false, onEdit }: AuthorityHeroProps) {
  const heroImageUrl = data.image_url;

  const handleFieldChange = (field: string) => (value: string) => {
    onEdit?.(field, value);
  };

  return (
    <EditableBlockWrapper
      blockType="Hero"
      isEditing={isEditing}
    >
      <section className="relative min-h-[600px] flex items-center bg-slate-900 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          {heroImageUrl ? (
            <img 
              src={heroImageUrl} 
              alt="Service Hero" 
              className="w-full h-full object-cover opacity-40"
            />
          ) : (
            <div className="w-full h-full bg-slate-800 animate-pulse" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="container relative z-10 max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            {/* Headline - Inline Editable */}
            <InlineEditableText
              value={data.headline || "Professional Service Experts"}
              onChange={handleFieldChange('headline')}
              as="h1"
              className="text-5xl md:text-7xl font-black text-white leading-tight mb-6 tracking-tight"
              placeholder="Título Principal"
              canEdit={isEditing}
            />
            
            {/* Subheadline - Inline Editable */}
            <InlineEditableText
              value={data.subheadline || "Delivering exceptional solutions with decades of local experience."}
              onChange={handleFieldChange('subheadline')}
              as="p"
              className="text-xl md:text-2xl text-slate-300 mb-10 leading-relaxed font-medium"
              placeholder="Subtítulo descritivo"
              canEdit={isEditing}
            />
            
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <Button 
                size="lg" 
                className="h-20 px-10 text-2xl font-black rounded-xl shadow-2xl hover:scale-105 transition-transform gap-3"
                style={{ backgroundColor: primaryColor }}
                asChild
              >
                <a href={`tel:${data.phone || ''}`}>
                  <Phone className="w-8 h-8 fill-current" />
                  CALL NOW
                </a>
              </Button>
              
              <div className="flex flex-col">
                <span className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">
                  Expert Support 24/7
                </span>
                {isEditing ? (
                  <InlineEditableText
                    value={data.phone || "555-0199"}
                    onChange={handleFieldChange('phone')}
                    as="span"
                    className="text-white text-3xl font-black tabular-nums"
                    placeholder="Telefone"
                    canEdit={isEditing}
                  />
                ) : (
                  <span className="text-white text-3xl font-black tabular-nums">
                    {data.phone || "555-0199"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </EditableBlockWrapper>
  );
}
