import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight, TrendingDown } from "lucide-react";

export function CostComparison() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.1);

  const traditionalCosts = [
    { item: t('landing.costComparison.traditional.writer', 'Freelance writer'), cost: '$500' },
    { item: t('landing.costComparison.traditional.seo', 'SEO specialist'), cost: '$400' },
    { item: t('landing.costComparison.traditional.designer', 'Designer'), cost: '$300' },
    { item: t('landing.costComparison.traditional.time', 'Your time'), cost: '40h/month' },
  ];

  const omniseenFeatures = [
    t('landing.costComparison.omniseen.articles', '100 optimized articles/month'),
    t('landing.costComparison.omniseen.seo', 'Automatic SEO optimization'),
    t('landing.costComparison.omniseen.images', 'AI-generated images'),
    t('landing.costComparison.omniseen.time', 'Only 2h/month of your time'),
  ];

  return (
    <section ref={ref} className="py-20">
      <div className="container">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium mb-6">
            <TrendingDown className="h-4 w-4" />
            {t('landing.costComparison.badge', 'Save 90% on content creation')}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('landing.costComparison.title', 'Why Pay More?')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.costComparison.subtitle', 'See how OMNISEEN compares to traditional content creation costs.')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Traditional Method */}
          <div 
            className={`bg-card rounded-2xl border p-8 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="text-xl font-display font-semibold">
                {t('landing.costComparison.traditional.title', 'Traditional Method')}
              </h3>
            </div>

            <div className="space-y-4 mb-6">
              {traditionalCosts.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                  <span className="text-muted-foreground">{item.item}</span>
                  <span className="font-semibold text-destructive">{item.cost}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {t('landing.costComparison.traditional.total', 'Total Monthly Cost')}
                </span>
                <span className="text-2xl font-bold text-destructive">$1,200+</span>
              </div>
            </div>
          </div>

          {/* OMNISEEN */}
          <div 
            className={`bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border-2 border-primary/20 p-8 relative overflow-hidden transition-all duration-700 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            <div className="absolute top-4 right-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
              {t('landing.costComparison.omniseen.badge', 'RECOMMENDED')}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                <Check className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold">
                {t('landing.costComparison.omniseen.title', 'With OMNISEEN')}
              </h3>
            </div>

            <div className="space-y-4 mb-6">
              {omniseenFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 py-3 border-b border-primary/10 last:border-0">
                  <Check className="h-5 w-5 text-success flex-shrink-0" />
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-primary/10">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">
                  {t('landing.costComparison.omniseen.total', 'Starting at')}
                </span>
                <div className="text-right">
                  <span className="text-3xl font-bold gradient-text">$13.49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              <div className="bg-success/10 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {t('landing.costComparison.savings.label', 'You save every month')}
                </p>
                <p className="text-2xl font-bold text-success">
                  $1,170+
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={`text-center mt-12 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8">
              {t('landing.costComparison.cta', 'Start Saving Today')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
