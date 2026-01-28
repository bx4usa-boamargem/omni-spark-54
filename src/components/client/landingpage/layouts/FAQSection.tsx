import { InlineEditableText } from "../editor/InlineEditableText";
import { EditableBlockWrapper } from "../editor/EditableBlockWrapper";

interface FAQSectionProps {
  faqs: any[];
  primaryColor: string;
  isEditing?: boolean;
  onEdit?: (index: number, field: string, value: string) => void;
}

export function FAQSection({ faqs, primaryColor, isEditing = false, onEdit }: FAQSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <EditableBlockWrapper
      blockType="FAQ"
      isEditing={isEditing}
    >
      <section className="py-24 px-6 bg-white">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-4xl font-black text-slate-900 mb-12 text-center tracking-tight">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                {/* Question - Inline Editable */}
                <InlineEditableText
                  value={faq.question}
                  onChange={(value) => onEdit?.(index, 'question', value)}
                  as="h3"
                  className="text-xl font-black text-slate-900 mb-3 tracking-tight"
                  placeholder="Pergunta"
                  canEdit={isEditing}
                />
                
                {/* Answer - Inline Editable */}
                <InlineEditableText
                  value={faq.answer}
                  onChange={(value) => onEdit?.(index, 'answer', value)}
                  as="p"
                  className="text-slate-600 leading-relaxed font-medium"
                  placeholder="Resposta"
                  canEdit={isEditing}
                  multiline
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </EditableBlockWrapper>
  );
}
