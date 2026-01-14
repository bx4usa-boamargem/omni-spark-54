import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useCaptureReferral } from "@/hooks/useReferral";
import { useLandingTracking, LandingTrackingContext } from "@/hooks/useLandingTracking";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { OmniseenLogoHeader } from "@/components/ui/OmniseenLogoHeader";
import { TrackingScripts } from "@/components/analytics/TrackingScripts";
import { SalesAssistantChat } from "@/components/landing/SalesAssistantChat";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { RealAutomationSection } from "@/components/landing/RealAutomationSection";
import { SEOSection } from "@/components/landing/SEOSection";
import { AudienceSection } from "@/components/landing/AudienceSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { PricingTable } from "@/components/landing/PricingTable";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ArrowRight, Loader2, Menu } from "lucide-react";

export default function Index() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { trackPageView, trackSectionView, trackCTAClick, trackPlanSelect } = useLandingTracking();
  const hasTrackedPageView = useRef(false);

  useCaptureReferral();

  // Track page view on mount
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      trackPageView();
      hasTrackedPageView.current = true;
    }
  }, [trackPageView]);

  // No automatic redirect - users can browse the public site even when logged in

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <TrackingScripts />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border/40 h-[64px] md:h-[72px]">
        <div className="container h-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" onClick={scrollToTop}>
            <OmniseenLogoHeader />
          </Link>

          {/* Navigation - Hidden on mobile */}
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={scrollToTop}
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              {t('landing.header.home')}
            </button>
            <a 
              href="#pricing"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              {t('landing.header.plans')}
            </a>
            <Link 
              to="/blog"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              {t('landing.header.blog')}
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <LanguageSwitcher />
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <a href="#pricing" className="hidden sm:block">
              <Button size="sm">
                {t('landing.header.startFree', 'Começar grátis')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-6 mt-8">
                  <OmniseenLogoHeader />
                  <nav className="flex flex-col gap-4">
                    <button 
                      onClick={() => { scrollToTop(); closeMobileMenu(); }} 
                      className="text-left text-lg font-medium hover:text-[#4D148C] transition-colors"
                    >
                      {t('landing.header.home')}
                    </button>
                    <a 
                      href="#pricing" 
                      onClick={closeMobileMenu}
                      className="text-lg font-medium hover:text-[#4D148C] transition-colors"
                    >
                      {t('landing.header.plans')}
                    </a>
                    <Link 
                      to="/blog" 
                      onClick={closeMobileMenu}
                      className="text-lg font-medium hover:text-[#4D148C] transition-colors"
                    >
                      {t('landing.header.blog')}
                    </Link>
                  </nav>
                  <div className="flex flex-col gap-3 pt-4 border-t">
                    <Link to="/auth" onClick={closeMobileMenu}>
                      <Button variant="outline" className="w-full">
                        Login
                      </Button>
                    </Link>
                    <a href="#pricing" onClick={closeMobileMenu}>
                      <Button className="w-full">
                        {t('landing.header.startFree', 'Começar grátis')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* 9 Sections with tracking context */}
      <LandingTrackingContext.Provider value={{ trackSectionView, trackCTAClick, trackPlanSelect }}>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <RealAutomationSection />
        <SEOSection />
        <AudienceSection />
        <HowItWorksSection />
        <PricingTable />
        <FinalCTASection />
      </LandingTrackingContext.Provider>

      {/* Footer */}
      <footer className="py-12 bg-[#1a0a2e]">
        <div className="container">
          {/* Main row: Logo + Links + Copyright */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <OmniseenLogoHeader variant="light" />
            
            {/* Links */}
            <div className="flex gap-6 text-sm text-white/70">
              <a href="#pricing" className="hover:text-white transition-colors">
                {t('landing.header.plans')}
              </a>
              <Link to="/auth" className="hover:text-white transition-colors">
                {t('landing.header.login')}
              </Link>
            </div>
            
            {/* Copyright */}
            <p className="text-sm text-white/50">
              © {new Date().getFullYear()} OMNISEEN
            </p>
          </div>
          
          {/* Tagline */}
          <p className="text-center text-sm text-white/40 mt-6">
            {t('landing.footer.tagline')}
          </p>

          {/* Legal Links */}
          <div className="flex justify-center gap-4 text-xs text-white/40 mt-4">
            <Link to="/terms" className="hover:text-white/60 transition-colors">
              {t('auth.terms.termsOfUse')}
            </Link>
            <span>|</span>
            <Link to="/privacy" className="hover:text-white/60 transition-colors">
              {t('auth.terms.privacyPolicy')}
            </Link>
          </div>

          {/* All Rights Reserved */}
          <p className="text-center text-xs text-white/30 mt-2">
            {t('landing.footer.allRightsReserved', 'Todos os direitos reservados')}
          </p>
        </div>
      </footer>

      {/* AI Support Chat */}
      {/* Sales AI Chat for Lead Conversion */}
      <SalesAssistantChat />
    </div>
  );
}
