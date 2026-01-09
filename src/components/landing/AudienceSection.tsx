import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  Building2, 
  MapPin, 
  User, 
  Rocket, 
  Briefcase, 
  Palette,
  Target 
} from "lucide-react";

export const AudienceSection = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.2);

  const audiences = [
    {
      icon: Building2,
      title: t('landing.audience.service.title'),
      description: t('landing.audience.service.desc'),
    },
    {
      icon: MapPin,
      title: t('landing.audience.local.title'),
      description: t('landing.audience.local.desc'),
    },
    {
      icon: User,
      title: t('landing.audience.freelancer.title'),
      description: t('landing.audience.freelancer.desc'),
    },
    {
      icon: Rocket,
      title: t('landing.audience.startup.title'),
      description: t('landing.audience.startup.desc'),
    },
    {
      icon: Briefcase,
      title: t('landing.audience.agency.title'),
      description: t('landing.audience.agency.desc'),
    },
    {
      icon: Palette,
      title: t('landing.audience.creator.title'),
      description: t('landing.audience.creator.desc'),
    },
  ];

  return (
    <section ref={ref} className="py-20 bg-muted/30 relative overflow-hidden">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            <Target className="h-4 w-4" />
            {t('landing.audience.badge')}
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
            {t('landing.audience.title')}
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('landing.audience.subtitle')}
          </p>
        </div>
        
        {/* Audience cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {audiences.map((audience, index) => (
            <div
              key={index}
              className={`group relative bg-card rounded-2xl p-6 border hover:border-primary/50 shadow-sm hover-lift hover-glow transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${100 + index * 80}ms` }}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ${isVisible ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: `${200 + index * 80}ms` }}>
                <audience.icon className="h-7 w-7 text-primary" />
              </div>
              
              {/* Content */}
              <h3 className="text-xl font-display font-bold mb-2">{audience.title}</h3>
              <p className="text-muted-foreground">{audience.description}</p>
              
              {/* Hover gradient */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
