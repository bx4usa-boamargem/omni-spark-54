import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { StatsSection } from "@/components/landing/StatsSection";
import { BlogShowcase } from "@/components/landing/BlogShowcase";
import { Testimonials } from "@/components/landing/Testimonials";
import { PricingTable } from "@/components/landing/PricingTable";
import { FAQ } from "@/components/landing/FAQ";
import { NoBlogSection } from "@/components/landing/NoBlogSection";
import { AutomationSection } from "@/components/landing/AutomationSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { CostComparison } from "@/components/landing/CostComparison";
import { CaseStudies } from "@/components/landing/CaseStudies";
import { LandingChat } from "@/components/landing/LandingChat";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { OmniseenLogo } from "@/components/ui/OmniseenLogo";
import { Sparkles, ArrowRight, Zap, Globe, ArrowLeft } from "lucide-react";

export default function LandingPageInternal() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Back Button */}
        <div className="container py-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>

        {/* Hero */}
        <section className="py-16 px-4">
          <div className="container max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6 animate-fade-in">
              <Zap className="h-4 w-4" />
              {t('landing.hero.badge')}
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6 animate-fade-in-up">
              {t('landing.hero.title1')}
              <span className="gradient-text block">{t('landing.hero.title2')}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              {t('landing.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <Link to="/articles/new">
                <Button size="lg" className="text-lg px-8">
                  Criar Artigo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Ver Planos
                </Button>
              </Link>
            </div>

            {/* Trial badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Sparkles className="h-4 w-4" />
              {t('landing.hero.trialBadge', '7-day free trial + 5 bonus articles')}
            </div>

            {/* Social proof */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background" />
                  ))}
                </div>
                <span className="text-sm">{t('landing.hero.users')}</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-yellow-500">★</span>
                ))}
                <span className="text-sm ml-1">{t('landing.hero.rating')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <StatsSection />

        {/* No Blog Section */}
        <NoBlogSection />

        {/* Automation Section */}
        <AutomationSection />

        {/* Features Grid */}
        <FeaturesGrid />

        {/* Landing Chat */}
        <LandingChat />

        {/* Cost Comparison */}
        <CostComparison />

        {/* Case Studies */}
        <CaseStudies />

        {/* Testimonials */}
        <Testimonials />

        {/* Pricing Table */}
        <PricingTable />

        {/* CTA */}
        <section className="py-20">
          <div className="container max-w-4xl">
            <div className="gradient-primary rounded-3xl p-12 text-center text-primary-foreground relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
              <div className="relative z-10">
                <Globe className="h-12 w-12 mx-auto mb-6 opacity-80" />
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  {t('landing.cta.title')}
                </h2>
                <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
                  {t('landing.cta.subtitle')}
                </p>
                <Link to="/subscription">
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    Fazer Upgrade
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <FAQ />

        {/* Footer */}
        <footer className="py-12 border-t">
          <div className="container">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <OmniseenLogo size="sm" />
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} OMNISEEN. {t('landing.footer.rights')}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}
