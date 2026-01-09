import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { UserPlus, Globe, Settings, Zap, Sparkles } from "lucide-react";

export const HowItWorksSection = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.2);

  const steps = [
    {
      icon: UserPlus,
      number: 1,
      title: t('landing.howItWorks.step1.title'),
      description: t('landing.howItWorks.step1.desc'),
    },
    {
      icon: Globe,
      number: 2,
      title: t('landing.howItWorks.step2.title'),
      description: t('landing.howItWorks.step2.desc'),
    },
    {
      icon: Settings,
      number: 3,
      title: t('landing.howItWorks.step3.title'),
      description: t('landing.howItWorks.step3.desc'),
    },
    {
      icon: Zap,
      number: 4,
      title: t('landing.howItWorks.step4.title'),
      description: t('landing.howItWorks.step4.desc'),
    },
    {
      icon: Sparkles,
      number: 5,
      title: t('landing.howItWorks.step5.title'),
      description: t('landing.howItWorks.step5.desc'),
    },
  ];

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container max-w-6xl relative">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            {t('landing.howItWorks.title')}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t('landing.howItWorks.subtitle')}
          </p>
        </div>
        
        {/* Timeline */}
        <div className="relative">
          {/* Connecting line - animated */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 z-0 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-1500 ease-out ${isVisible ? 'w-full' : 'w-0'}`}
              style={{ transitionDelay: '200ms' }}
            />
          </div>
          
          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`relative transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${200 + index * 150}ms` }}
              >
                {/* Card */}
                <div className="bg-card rounded-2xl border p-6 text-center hover-lift hover:shadow-xl transition-all relative z-10">
                  {/* Number badge */}
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg transition-all duration-500 ${isVisible ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: `${300 + index * 150}ms` }}>
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mt-2 mb-4 transition-all duration-500 ${isVisible ? 'scale-100 rotate-0' : 'scale-0 -rotate-12'}`} style={{ transitionDelay: `${400 + index * 150}ms` }}>
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="font-display font-bold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
