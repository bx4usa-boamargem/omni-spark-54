import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  Lightbulb, 
  PenTool, 
  Search, 
  Send, 
  BarChart3,
  MessageSquare,
  Smartphone,
  ArrowRight,
  Check 
} from "lucide-react";

export const SolutionSection = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.2);

  const features = [
    { icon: Lightbulb, text: t('landing.solution.feature1') },
    { icon: PenTool, text: t('landing.solution.feature2') },
    { icon: Search, text: t('landing.solution.feature3') },
    { icon: Send, text: t('landing.solution.feature4') },
    { icon: BarChart3, text: t('landing.solution.feature5') },
  ];

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      <div className="container max-w-6xl relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            <h2 
              className={`text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
              }`}
            >
              {t('landing.solution.title')}
            </h2>
            
            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-4 transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                  }`}
                  style={{ transitionDelay: `${200 + index * 100}ms` }}
                >
                  <div className={`p-2 rounded-lg bg-primary/10 transition-transform duration-500 ${isVisible ? 'scale-100 rotate-0' : 'scale-0 -rotate-12'}`} style={{ transitionDelay: `${250 + index * 100}ms` }}>
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-lg font-medium">{feature.text}</span>
                  <div className={`ml-auto transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} style={{ transitionDelay: `${400 + index * 100}ms` }}>
                    <Check className="h-5 w-5 text-success" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Special highlight */}
            <div 
              className={`p-4 rounded-xl bg-accent/10 border border-accent/20 hover-lift transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '800ms' }}
            >
              <div className="flex items-start gap-3">
                <Smartphone className="h-6 w-6 text-accent mt-1" />
                <div>
                  <p className="font-semibold text-accent mb-1">
                    {t('landing.solution.highlight')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('landing.solution.highlightDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right visual - Animated flow */}
          <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} style={{ transitionDelay: '300ms' }}>
            <div className="relative">
              {/* Flow diagram */}
              <div className="space-y-4">
                {/* Step 1: Chat */}
                <div className={`flex items-center gap-4 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
                  <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg hover-scale">
                    <MessageSquare className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div className="flex-1 bg-card rounded-xl p-4 border shadow-sm hover-lift">
                    <p className="text-sm text-muted-foreground mb-1">{t('landing.solution.step1Label')}</p>
                    <p className="font-medium">"best running shoes 2024"</p>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className={`flex justify-center transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '500ms' }}>
                  <ArrowRight className="h-6 w-6 text-primary rotate-90 animate-pulse" />
                </div>
                
                {/* Step 2: Article */}
                <div className={`flex items-center gap-4 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '600ms' }}>
                  <div className="w-16 h-16 rounded-2xl bg-card border flex items-center justify-center shadow-sm hover-scale">
                    <PenTool className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 bg-card rounded-xl p-4 border shadow-sm hover-lift">
                    <p className="text-sm text-muted-foreground mb-1">{t('landing.solution.step2Label')}</p>
                    <p className="font-medium">{t('landing.solution.step2Text')}</p>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className={`flex justify-center transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '700ms' }}>
                  <ArrowRight className="h-6 w-6 text-primary rotate-90 animate-pulse" />
                </div>
                
                {/* Step 3: SEO */}
                <div className={`flex items-center gap-4 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '800ms' }}>
                  <div className="w-16 h-16 rounded-2xl bg-card border flex items-center justify-center shadow-sm hover-scale">
                    <Search className="h-8 w-8 text-accent" />
                  </div>
                  <div className="flex-1 bg-card rounded-xl p-4 border shadow-sm hover-lift">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{t('landing.solution.step3Label')}</p>
                        <p className="font-medium text-success">92/100</p>
                      </div>
                      <div className="w-12 h-12 rounded-full border-4 border-success flex items-center justify-center animate-pulse">
                        <span className="text-xs font-bold text-success">A+</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className={`flex justify-center transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '900ms' }}>
                  <ArrowRight className="h-6 w-6 text-primary rotate-90 animate-pulse" />
                </div>
                
                {/* Step 4: Published */}
                <div className={`flex items-center gap-4 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '1000ms' }}>
                  <div className="w-16 h-16 rounded-2xl bg-success/20 flex items-center justify-center shadow-sm hover-scale">
                    <Send className="h-8 w-8 text-success" />
                  </div>
                  <div className="flex-1 bg-success/10 rounded-xl p-4 border border-success/20 shadow-sm hover-lift">
                    <p className="text-sm text-success mb-1">{t('landing.solution.step4Label')}</p>
                    <p className="font-medium">{t('landing.solution.step4Text')}</p>
                  </div>
                </div>
              </div>
              
              {/* Decorative glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-3xl -z-10 blur-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
