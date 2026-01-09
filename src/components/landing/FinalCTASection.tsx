import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Clock } from "lucide-react";
import { trackEvent } from "@/components/analytics/TrackingScripts";

export const FinalCTASection = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.2);

  const handleCTAClick = () => {
    trackEvent.signUpClick();
  };

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      <div className="container max-w-4xl">
        <div 
          className={`relative rounded-3xl p-12 text-center overflow-hidden transition-all duration-700 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Gradient background with animation */}
          <div className="absolute inset-0 gradient-primary gradient-animated" style={{ backgroundSize: '200% 200%' }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
          
          {/* Content */}
          <div className="relative z-10 text-primary-foreground">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 transition-all duration-700 ${isVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-45'}`} style={{ transitionDelay: '200ms' }}>
              <Clock className="h-8 w-8" />
            </div>
            
            <h2 className={`text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '300ms' }}>
              {t('landing.finalCta.title')}
            </h2>
            
            <p className={`text-xl opacity-90 mb-8 max-w-xl mx-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
              {t('landing.finalCta.subtitle')}
            </p>
            
            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '500ms' }}>
              <a href="#pricing" onClick={handleCTAClick}>
                <Button size="lg" variant="secondary" className="text-lg px-8 font-semibold hover-scale">
                  {t('landing.finalCta.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="#pricing" onClick={handleCTAClick}>
                <Button size="lg" variant="ghost" className="text-lg px-8 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground hover-scale">
                  {t('landing.finalCta.ctaSecondary')}
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </div>
            
            {/* Trust note */}
            <p className={`mt-6 text-sm opacity-80 transition-all duration-700 ${isVisible ? 'opacity-80' : 'opacity-0'}`} style={{ transitionDelay: '600ms' }}>
              {t('landing.finalCta.note')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
