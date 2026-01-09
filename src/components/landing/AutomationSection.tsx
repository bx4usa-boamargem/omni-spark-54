import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  Check, 
  ArrowRight, 
  Bot, 
  FileText, 
  Search, 
  Calendar, 
  Share2, 
  BarChart3,
  Layers
} from "lucide-react";

export function AutomationSection() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.1);

  const automationItems = [
    { icon: Layers, text: t('landing.automation.items.blog', 'Build your professional blog') },
    { icon: Search, text: t('landing.automation.items.topics', 'Research trending topics in your niche') },
    { icon: BarChart3, text: t('landing.automation.items.competitors', 'Analyze competitor content') },
    { icon: FileText, text: t('landing.automation.items.write', 'Write SEO-optimized articles') },
    { icon: Calendar, text: t('landing.automation.items.schedule', 'Schedule automatic publishing') },
    { icon: Share2, text: t('landing.automation.items.social', 'Share on social media') },
    { icon: BarChart3, text: t('landing.automation.items.reports', 'Generate weekly reports') },
  ];

  return (
    <section ref={ref} className="py-20">
      <div className="container">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
              <Bot className="h-4 w-4" />
              {t('landing.automation.badge', '100% Automated')}
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold leading-tight mb-4">
              {t('landing.automation.title', "Don't have time?")}
              <span className="gradient-text block mt-2">
                {t('landing.automation.titleHighlight', "We'll do everything for you")}
              </span>
            </h2>

            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              {t('landing.automation.description', 'OMNISEEN handles your entire content workflow automatically. Just set it up once and watch your blog grow.')}
            </p>
          </div>

          {/* Automation items grid */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
            {automationItems.map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-xl bg-card border hover:shadow-md transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-medium text-left">{item.text}</span>
                </div>
                <Check className="h-5 w-5 text-success flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className={`transition-all duration-700 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                {t('landing.automation.cta', 'Start Your Free Trial')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              {t('landing.automation.trialInfo', '7-day free trial • No credit card required')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
