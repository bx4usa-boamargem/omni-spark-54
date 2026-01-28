import { InlineEditableText } from "../editor/InlineEditableText";
import { EditableBlockWrapper } from "../editor/EditableBlockWrapper";

interface EmergencyCTAProps {
  data: any;
  phone: string;
  isEditing?: boolean;
  onEdit?: (field: string, value: string) => void;
}

export function EmergencyCTA({ data, phone, isEditing = false, onEdit }: EmergencyCTAProps) {
  const handleFieldChange = (field: string) => (value: string) => {
    onEdit?.(field, value);
  };

  return (
    <EditableBlockWrapper
      blockType="Emergency CTA"
      isEditing={isEditing}
    >
      <section className="py-16 px-6">
        <div className="container max-w-5xl mx-auto">
          <div className="bg-red-600 rounded-3xl p-10 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            {/* Subtle pattern or glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-50" />
            
            <div className="relative z-10">
              {/* Headline - Inline Editable */}
              <InlineEditableText
                value={data.headline || "Emergency Services Available 24/7"}
                onChange={handleFieldChange('headline')}
                as="h2"
                className="text-4xl md:text-6xl font-black mb-6 tracking-tighter italic uppercase"
                placeholder="Título de emergência"
                canEdit={isEditing}
              />
              
              {/* Subtext - Inline Editable */}
              <InlineEditableText
                value={data.subtext || "Don't wait until it's too late. Our rapid response team is standing by to help you right now."}
                onChange={handleFieldChange('subtext')}
                as="p"
                className="text-xl md:text-2xl text-red-100 mb-10 font-bold max-w-2xl mx-auto"
                placeholder="Subtexto de emergência"
                canEdit={isEditing}
                multiline
              />
              
              <a 
                href={`tel:${phone}`}
                className="inline-flex items-center gap-4 bg-white text-red-600 px-12 py-6 rounded-2xl font-black text-3xl shadow-xl hover:scale-105 transition-transform"
              >
                Call {phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </EditableBlockWrapper>
  );
}
