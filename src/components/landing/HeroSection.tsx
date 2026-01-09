import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, TrendingUp, BarChart3 } from "lucide-react";
import { trackEvent } from "@/components/analytics/TrackingScripts";
import { useMouseParallax } from "@/hooks/useParallax";
import { useLandingTrackingContext } from "@/hooks/useLandingTracking";

export const HeroSection = () => {
  const { t } = useTranslation();
  const mousePosition = useMouseParallax(0.02);
  const tracking = useLandingTrackingContext();
  const sectionRef = useRef<HTMLElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!tracking || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            tracking.trackSectionView('hero');
            hasTracked.current = true;
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [tracking]);

  const handleCTAClick = () => {
    trackEvent.signUpClick();
    tracking?.trackCTAClick('hero_cta', 'hero');
  };

  return (
    <section ref={sectionRef} className="pt-24 md:pt-28 pb-20 px-4 relative overflow-hidden">
      {/* Background effects with parallax */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div 
        className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-slow"
        style={{ transform: `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2}px)` }}
      />
      <div 
        className="absolute top-40 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float-slow"
        style={{ transform: `translate(${-mousePosition.x * 1.5}px, ${-mousePosition.y * 1.5}px)`, animationDelay: '-3s' }}
      />
      
      <div className="container max-w-6xl relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-6 animate-fade-in opacity-0" style={{ animationDelay: '0.1s' }}>
              <Zap className="h-4 w-4" />
              {t('landing.newHero.badge')}
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6 animate-slide-up opacity-0" style={{ animationDelay: '0.2s' }}>
              {t('landing.newHero.title1')}
              <span className="gradient-text block mt-2">
                {t('landing.newHero.title2')}
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-4 animate-slide-up opacity-0" style={{ animationDelay: '0.3s' }}>
              {t('landing.newHero.subtitle')}
            </p>
            
            <p className="text-base text-muted-foreground/80 mb-8 animate-slide-up opacity-0" style={{ animationDelay: '0.4s' }}>
              {t('landing.newHero.subheadline')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-scale-up opacity-0" style={{ animationDelay: '0.5s' }}>
              <a href="#pricing" onClick={handleCTAClick}>
                <Button size="lg" className="text-lg px-8 w-full sm:w-auto gradient-primary hover:opacity-90 hover-glow transition-all">
                  {t('landing.newHero.cta')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="#pricing" onClick={handleCTAClick}>
                <Button size="lg" variant="outline" className="text-lg px-8 w-full sm:w-auto hover-lift">
                  {t('landing.newHero.ctaSecondary')}
                </Button>
              </a>
            </div>

            {/* Trust badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm animate-fade-in opacity-0" style={{ animationDelay: '0.6s' }}>
              <Sparkles className="h-4 w-4 text-accent" />
              {t('landing.newHero.noCreditCard')}
            </div>
          </div>

          {/* Right visual - Futuristic dashboard mockup */}
          <div className="relative animate-blur-in opacity-0" style={{ animationDelay: '0.4s' }}>
            <div 
              className="relative bg-card rounded-2xl border shadow-2xl p-6 glass-3d hover:shadow-[0_20px_60px_-10px_hsl(var(--primary)/0.3)] transition-all duration-500"
              style={{ transform: `perspective(1000px) rotateY(${mousePosition.x * 0.5}deg) rotateX(${-mousePosition.y * 0.5}deg)` }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 bg-muted rounded-lg h-6 flex items-center px-3">
                  <span className="text-xs text-muted-foreground">omniseen.app/dashboard</span>
                </div>
              </div>
              
              {/* Dashboard content */}
              <div className="space-y-4">
                {/* SEO Score animation */}
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('landing.newHero.seoScore')}</span>
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold gradient-text">87</span>
                    <span className="text-success text-sm mb-1">+24</span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-[87%] gradient-primary rounded-full animate-pulse" />
                  </div>
                </div>
                
                {/* Automation status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span className="text-xs text-muted-foreground">{t('landing.newHero.automation')}</span>
                    </div>
                    <span className="text-sm font-semibold">{t('landing.newHero.active')}</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="h-3 w-3 text-accent" />
                      <span className="text-xs text-muted-foreground">{t('landing.newHero.thisMonth')}</span>
                    </div>
                    <span className="text-sm font-semibold">12 {t('landing.newHero.articles')}</span>
                  </div>
                </div>
                
                {/* Article list preview */}
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 bg-background rounded-lg p-3 border hover-lift cursor-pointer">
                      <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-muted rounded w-3/4 mb-1" />
                        <div className="h-2 bg-muted/50 rounded w-1/2" />
                      </div>
                      <div className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">
                        {t('landing.newHero.published')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-float-slow hover-glow">
              +340% {t('landing.newHero.traffic')}
            </div>
            <div className="absolute -bottom-4 -left-4 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg animate-float-slow hover-glow" style={{ animationDelay: '-2s' }}>
              100% {t('landing.newHero.automated')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
