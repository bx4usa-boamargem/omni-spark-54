import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Check, Globe, Palette, Zap, ArrowRight } from "lucide-react";

export function NoBlogSection() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.1);

  const features = [
    { icon: Palette, text: t('landing.noBlog.features.design', 'Professional design in minutes') },
    { icon: Zap, text: t('landing.noBlog.features.noCoding', 'No coding required') },
    { icon: Check, text: t('landing.noBlog.features.seo', 'SEO optimized from day 1') },
    { icon: Globe, text: t('landing.noBlog.features.domain', 'Custom domain support') },
  ];

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text */}
          <div className={`space-y-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              <Globe className="h-4 w-4" />
              {t('landing.noBlog.badge', 'Complete Solution')}
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-tight">
              {t('landing.noBlog.title', "Don't have a blog?")}
              <span className="gradient-text block">
                {t('landing.noBlog.titleHighlight', "We'll create one for you!")}
              </span>
            </h2>
            
            <p className="text-lg text-muted-foreground">
              {t('landing.noBlog.description', 'OMNISEEN creates a professional, SEO-optimized blog for your business in minutes. No technical knowledge needed.')}
            </p>

            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li 
                  key={index} 
                  className="flex items-center gap-3"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                    <feature.icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-medium">{feature.text}</span>
                </li>
              ))}
            </ul>

            <Link to="/auth">
              <Button size="lg" className="text-lg">
                {t('landing.noBlog.cta', 'Create My Blog')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Right - Mockup */}
          <div className={`transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="relative">
              {/* Browser frame */}
              <div className="bg-card rounded-xl border shadow-2xl overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-destructive/60" />
                    <div className="h-3 w-3 rounded-full bg-warning/60" />
                    <div className="h-3 w-3 rounded-full bg-success/60" />
                  </div>
                  <div className="flex-1 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                    yourblog.omniseen.com
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {/* Header mockup */}
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-24 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg" />
                    <div className="flex gap-2">
                      <div className="h-4 w-12 bg-muted rounded" />
                      <div className="h-4 w-12 bg-muted rounded" />
                      <div className="h-4 w-12 bg-muted rounded" />
                    </div>
                  </div>
                  
                  {/* Hero mockup */}
                  <div className="pt-8 pb-4 text-center space-y-3">
                    <div className="h-6 w-48 bg-muted rounded mx-auto" />
                    <div className="h-4 w-64 bg-muted/60 rounded mx-auto" />
                    <div className="h-10 w-32 bg-primary rounded-lg mx-auto" />
                  </div>

                  {/* Articles mockup */}
                  <div className="grid grid-cols-3 gap-3 pt-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-20 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg" />
                        <div className="h-3 w-full bg-muted rounded" />
                        <div className="h-2 w-2/3 bg-muted/60 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 h-24 w-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 h-32 w-32 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
