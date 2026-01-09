import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { SEOScoreGauge } from "@/components/seo/SEOScoreGauge";
import { 
  PenTool, 
  Search, 
  Zap, 
  BarChart3, 
  Target, 
  Youtube,
  Instagram,
  FileText
} from "lucide-react";

export function FeaturesGrid() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.1);

  const features = [
    {
      icon: PenTool,
      title: t('landing.featuresGrid.write.title', 'Write Articles Fast'),
      description: t('landing.featuresGrid.write.description', 'Generate complete, SEO-optimized articles in seconds with our advanced AI.'),
      demo: (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Generate about</span>
            <span className="px-2 py-1 bg-primary/10 text-primary rounded font-medium">
              digital marketing trends
            </span>
          </div>
        </div>
      ),
    },
    {
      icon: Search,
      title: t('landing.featuresGrid.seo.title', 'AI-Powered SEO'),
      description: t('landing.featuresGrid.seo.description', 'Automatic optimization with real-time score and improvement suggestions.'),
      demo: (
        <div className="mt-4 flex justify-center">
          <SEOScoreGauge score={85} size="sm" showLabel={false} />
        </div>
      ),
    },
    {
      icon: Zap,
      title: t('landing.featuresGrid.autopilot.title', 'Autopilot Blogging'),
      description: t('landing.featuresGrid.autopilot.description', 'Schedule articles and let OMNISEEN publish automatically for you.'),
      demo: (
        <div className="mt-4 flex justify-center gap-3">
          <div className="px-3 py-2 bg-muted rounded-lg text-xs font-medium">WordPress</div>
          <div className="px-3 py-2 bg-muted rounded-lg text-xs font-medium">Webflow</div>
          <div className="px-3 py-2 bg-muted rounded-lg text-xs font-medium">Custom</div>
        </div>
      ),
    },
    {
      icon: BarChart3,
      title: t('landing.featuresGrid.competitors.title', 'Competitor Analysis'),
      description: t('landing.featuresGrid.competitors.description', 'Monitor competitors and discover content opportunities they are missing.'),
      demo: (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Your blog</span>
            <div className="flex-1 mx-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-4/5 bg-primary rounded-full" />
            </div>
            <span className="font-medium">85</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Competitor</span>
            <div className="flex-1 mx-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-3/5 bg-muted-foreground/30 rounded-full" />
            </div>
            <span className="font-medium text-muted-foreground">62</span>
          </div>
        </div>
      ),
    },
    {
      icon: Target,
      title: t('landing.featuresGrid.keywords.title', 'Keyword Research'),
      description: t('landing.featuresGrid.keywords.description', 'Discover high-impact keywords with AI-powered analysis and suggestions.'),
      demo: (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">seo tips</span>
          <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full">content marketing</span>
          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">ai writing</span>
        </div>
      ),
    },
    {
      icon: FileText,
      title: t('landing.featuresGrid.multiSource.title', 'Multi-Source Content'),
      description: t('landing.featuresGrid.multiSource.description', 'Transform YouTube videos, Instagram posts, and PDFs into blog articles.'),
      demo: (
        <div className="mt-4 flex justify-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Youtube className="h-5 w-5 text-destructive" />
          </div>
          <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <Instagram className="h-5 w-5 text-pink-500" />
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('landing.featuresGrid.title', 'Powerful Features')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.featuresGrid.subtitle', 'Everything you need to create, optimize, and grow your blog with AI.')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`bg-card rounded-2xl p-6 border hover:shadow-xl transition-all duration-500 group ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
              {feature.demo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
