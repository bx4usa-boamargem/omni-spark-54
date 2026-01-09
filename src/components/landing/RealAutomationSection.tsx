import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Calendar, Clock, Layers, Wrench, Check, Zap } from "lucide-react";

export const RealAutomationSection = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.2);

  const features = [
    {
      icon: Calendar,
      title: t('landing.realAutomation.feature1.title'),
      description: t('landing.realAutomation.feature1.desc'),
    },
    {
      icon: Clock,
      title: t('landing.realAutomation.feature2.title'),
      description: t('landing.realAutomation.feature2.desc'),
    },
    {
      icon: Layers,
      title: t('landing.realAutomation.feature3.title'),
      description: t('landing.realAutomation.feature3.desc'),
    },
    {
      icon: Wrench,
      title: t('landing.realAutomation.feature4.title'),
      description: t('landing.realAutomation.feature4.desc'),
    },
  ];

  return (
    <section ref={ref} className="py-20 bg-muted/30 relative overflow-hidden">
      <div className="container max-w-6xl relative">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Zap className="h-4 w-4" />
            {t('landing.realAutomation.badge')}
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            {t('landing.realAutomation.title1')}
            <span className="gradient-text block mt-2">
              {t('landing.realAutomation.title2')}
            </span>
          </h2>
        </div>
        
        {/* Feature cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative bg-card rounded-2xl p-6 border shadow-sm hover:shadow-xl hover-lift transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              {/* Status indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-success font-medium">{t('landing.realAutomation.active')}</span>
              </div>
              
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 ${isVisible ? 'scale-100 rotate-0' : 'scale-0 -rotate-12'}`} style={{ transitionDelay: `${300 + index * 100}ms` }}>
                <feature.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              
              {/* Content */}
              <h3 className="text-lg font-display font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{feature.description}</p>
              
              {/* Animated checkmark */}
              <div className={`flex items-center gap-2 text-success transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: `${500 + index * 100}ms` }}>
                <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
                <span className="text-sm font-medium">{t('landing.realAutomation.running')}</span>
              </div>
              
              {/* Hover effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
          ))}
        </div>
        
        {/* Visual: automation in action */}
        <div className={`mt-16 transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ transitionDelay: '600ms' }}>
          <div className="bg-card rounded-2xl border p-6 md:p-8 max-w-3xl mx-auto hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-display font-bold">{t('landing.realAutomation.liveStatus')}</h4>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                {t('landing.realAutomation.allSystems')}
              </div>
            </div>
            
            {/* Progress bars */}
            <div className="space-y-4">
              {[
                { label: t('landing.realAutomation.progress.seo'), progress: 92 },
                { label: t('landing.realAutomation.progress.content'), progress: 78 },
                { label: t('landing.realAutomation.progress.publishing'), progress: 100 },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className={`text-sm font-semibold transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${800 + index * 200}ms` }}>
                      {item.progress}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full gradient-primary rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: isVisible ? `${item.progress}%` : '0%', 
                        transitionDelay: `${800 + index * 200}ms` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
