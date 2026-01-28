import { InlineEditableText } from "../editor/InlineEditableText";
import { EditableBlockWrapper } from "../editor/EditableBlockWrapper";

interface FooterCTAProps {
  brandName: string;
  phone: string;
  primaryColor: string;
  isEditing?: boolean;
  onEdit?: (field: string, value: string) => void;
}

export function FooterCTA({ brandName, phone, primaryColor, isEditing = false, onEdit }: FooterCTAProps) {
  const handleFieldChange = (field: string) => (value: string) => {
    onEdit?.(field, value);
  };

  return (
    <EditableBlockWrapper
      blockType="Footer CTA"
      isEditing={isEditing}
    >
      <section 
        className="py-20 px-6 text-center text-white"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="container max-w-4xl mx-auto">
          {/* Headline - Inline Editable */}
          <InlineEditableText
            value="Ready to Start Your Project?"
            onChange={handleFieldChange('headline')}
            as="h2"
            className="text-4xl md:text-5xl font-black mb-8 tracking-tight italic uppercase"
            placeholder="Título do CTA"
            canEdit={isEditing}
          />
          
          <p className="text-xl text-slate-400 mb-12 font-medium">
            Join thousands of satisfied homeowners who trust {brandName || "our experts"} for their professional service needs.
          </p>
          
          <div className="flex flex-col items-center gap-6">
            <a 
              href={`tel:${phone}`}
              className="px-12 py-6 rounded-2xl font-black text-3xl shadow-2xl hover:scale-105 transition-transform"
              style={{ backgroundColor: primaryColor }}
            >
              Call {phone}
            </a>
            <span className="text-slate-500 font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} {brandName} • All Rights Reserved
            </span>
          </div>
        </div>
      </section>
    </EditableBlockWrapper>
  );
}
