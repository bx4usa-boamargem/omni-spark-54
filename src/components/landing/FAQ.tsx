import { useTranslation } from 'react-i18next';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqKeys = [
  'howWorks',
  'plagiarism',
  'customDomain',
  'trial',
  'cancel',
  'limit',
  'support',
  'yearlyDiscount',
  'noBlog',
  'googlePenalty'
];

export const FAQ = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.1);

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('landing.faq.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.faq.subtitle')}
          </p>
        </div>

        <Accordion 
          type="single" 
          collapsible 
          className={`space-y-4 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {faqKeys.map((key, index) => (
            <AccordionItem 
              key={key} 
              value={key}
              className="bg-card border rounded-xl px-6 data-[state=open]:shadow-md transition-shadow"
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                {t(`landing.faq.questions.${key}.question`)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                {t(`landing.faq.questions.${key}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
