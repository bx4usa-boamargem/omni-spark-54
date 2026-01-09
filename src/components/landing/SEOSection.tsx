import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  Check, 
  Type, 
  FileText, 
  Target, 
  Gauge, 
  BookOpen, 
  Image,
  Sparkles,
  TrendingUp 
} from "lucide-react";
import { useState, useEffect } from "react";

export const SEOSection = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.2);
  const [score, setScore] = useState(37);

  // Animate score from 37 to 87 when visible
  useEffect(() => {
    if (isVisible && score < 87) {
      const timer = setTimeout(() => {
        setScore(prev => Math.min(prev + 2, 87));
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isVisible, score]);

  const seoItems = [
    { icon: Type, label: t('landing.seo.item1') },
    { icon: FileText, label: t('landing.seo.item2') },
    { icon: Target, label: t('landing.seo.item3') },
    { icon: Gauge, label: t('landing.seo.item4') },
    { icon: BookOpen, label: t('landing.seo.item5') },
    { icon: Image, label: t('landing.seo.item6') },
  ];

  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-success';
    if (s >= 40) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      <div className="container max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: SEO panel mockup */}
          <div className={`order-2 lg:order-1 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="bg-card rounded-2xl border shadow-xl p-6 hover:shadow-2xl transition-shadow">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-display font-bold">{t('landing.seo.panelTitle')}</h4>
                <div className={`px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} style={{ transitionDelay: '500ms' }}>
                  {t('landing.seo.optimized')}
                </div>
              </div>
              
              {/* Score gauge */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative w-40 h-40">
                  {/* Background circle */}
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${score * 2.83} 283`}
                      className={`${getScoreColor(score)} transition-all duration-100`}
                    />
                  </svg>
                  {/* Score text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${getScoreColor(score)} transition-colors`}>{score}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>
              </div>
              
              {/* Before/After indicator */}
              <div className={`flex items-center justify-center gap-4 mb-6 transition-all duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '300ms' }}>
                <div className="text-center">
                  <span className="text-2xl font-bold text-destructive">37</span>
                  <p className="text-xs text-muted-foreground">{t('landing.seo.before')}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-success animate-pulse" />
                <div className="text-center">
                  <span className="text-2xl font-bold text-success">87</span>
                  <p className="text-xs text-muted-foreground">{t('landing.seo.after')}</p>
                </div>
              </div>
              
              {/* Checklist */}
              <div className="grid grid-cols-2 gap-3">
                {seoItems.map((item, index) => (
                  <div 
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-500 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: `${400 + index * 100}ms` }}
                  >
                    <div className={`w-5 h-5 rounded-full bg-success/20 flex items-center justify-center transition-all duration-300 ${isVisible ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: `${500 + index * 100}ms` }}>
                      <Check className="h-3 w-3 text-success" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Fix all button */}
              <div className={`mt-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '1000ms' }}>
                <button className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 hover-glow transition-all">
                  <Sparkles className="h-5 w-5" />
                  {t('landing.seo.fixAll')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Right: content */}
          <div className={`order-1 lg:order-2 transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6">
              {t('landing.seo.title')}
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8">
              {t('landing.seo.subtitle')}
            </p>
            
            <div className="space-y-4">
              {[
                t('landing.seo.point1'),
                t('landing.seo.point2'),
                t('landing.seo.point3'),
                t('landing.seo.point4'),
              ].map((point, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-3 transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                  }`}
                  style={{ transitionDelay: `${200 + index * 100}ms` }}
                >
                  <div className={`w-6 h-6 rounded-full gradient-primary flex items-center justify-center transition-transform duration-300 ${isVisible ? 'scale-100' : 'scale-0'}`} style={{ transitionDelay: `${300 + index * 100}ms` }}>
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-medium">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
