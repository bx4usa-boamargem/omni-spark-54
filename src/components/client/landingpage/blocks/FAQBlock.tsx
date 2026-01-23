import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQItem } from "../types/landingPageTypes";

interface FAQBlockProps {
  faqs: FAQItem[];
  phone?: string;
  primaryColor?: string;
  onEdit?: (index: number, field: keyof FAQItem, value: string) => void;
  isEditing?: boolean;
}

export function FAQBlock({ 
  faqs,
  phone,
  primaryColor,
  onEdit,
  isEditing = false 
}: FAQBlockProps) {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}15` }}
          >
            <HelpCircle 
              className="w-5 h-5" 
              style={{ color: primaryColor || 'hsl(var(--primary))' }}
            />
            <span 
              className="font-medium"
              style={{ color: primaryColor || 'hsl(var(--primary))' }}
            >
              Dúvidas Frequentes
            </span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Encontre respostas para as dúvidas mais comuns sobre nossos serviços
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-card rounded-xl shadow-lg p-6 md:p-8">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={faq.id || index} 
                value={`item-${index}`}
                className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/50"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  {isEditing ? (
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        e.stopPropagation();
                        onEdit?.(index, 'question', e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-foreground bg-transparent border-b border-muted w-full focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <span className="font-semibold text-foreground pr-4">
                      {faq.question}
                    </span>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  {isEditing ? (
                    <textarea
                      value={faq.answer}
                      onChange={(e) => onEdit?.(index, 'answer', e.target.value)}
                      className="text-muted-foreground leading-relaxed bg-transparent border border-muted rounded p-3 w-full resize-none focus:outline-none focus:border-primary"
                      rows={4}
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA */}
        {phone && (
          <div className="text-center mt-8 p-6 bg-card rounded-xl border border-border">
            <p className="text-foreground mb-2">
              <strong>Tem mais dúvidas?</strong>
            </p>
            <p className="text-muted-foreground mb-4">
              Nossa equipe está pronta para esclarecer todas as suas questões.
            </p>
            <a
              href={`tel:${phone.replace(/\D/g, '')}`}
              className="inline-flex items-center gap-2 font-semibold text-lg"
              style={{ color: primaryColor || 'hsl(var(--primary))' }}
            >
              📞 Ligue agora: {phone}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
