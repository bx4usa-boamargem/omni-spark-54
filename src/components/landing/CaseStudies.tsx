import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { TrendingUp, ExternalLink, Quote } from "lucide-react";

interface CaseStudy {
  name: string;
  role: string;
  company: string;
  image: string;
  metric: string;
  metricLabel: string;
  quote: string;
  linkedIn?: string;
}

export function CaseStudies() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.1);

  const cases: CaseStudy[] = [
    {
      name: "Sarah Johnson",
      role: "Marketing Director",
      company: "TechFlow Solutions",
      image: "",
      metric: "First Page",
      metricLabel: t('landing.caseStudies.metrics.firstPage', 'in 20 days'),
      quote: t('landing.caseStudies.quotes.sarah', 'OMNISEEN helped us rank on the first page of Google within 3 weeks. Our organic traffic increased by 340%.'),
    },
    {
      name: "Michael Chen",
      role: "Founder",
      company: "GrowthHub Agency",
      image: "",
      metric: "+450%",
      metricLabel: t('landing.caseStudies.metrics.traffic', 'organic traffic'),
      quote: t('landing.caseStudies.quotes.michael', 'We went from publishing 2 articles per month to 30. The quality is incredible and our clients love the results.'),
    },
    {
      name: "Emma Rodriguez",
      role: "Content Manager",
      company: "EcoLife Brand",
      image: "",
      metric: "50+",
      metricLabel: t('landing.caseStudies.metrics.hours', 'hours saved/month'),
      quote: t('landing.caseStudies.quotes.emma', 'What used to take our team a full week now takes 2 hours. OMNISEEN is a game-changer for content teams.'),
    },
  ];

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container">
        <div className={`text-center mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
            <TrendingUp className="h-4 w-4" />
            {t('landing.caseStudies.badge', 'Real Results')}
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('landing.caseStudies.title', 'Success Stories')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.caseStudies.subtitle', 'See how businesses are transforming their content strategy with OMNISEEN.')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cases.map((caseStudy, index) => (
            <div
              key={index}
              className={`bg-card rounded-2xl border p-6 hover:shadow-xl transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Metric highlight */}
              <div className="text-center mb-6 pb-6 border-b">
                <span className="text-4xl font-display font-bold gradient-text">
                  {caseStudy.metric}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {caseStudy.metricLabel}
                </p>
              </div>

              {/* Quote */}
              <div className="relative mb-6">
                <Quote className="h-8 w-8 text-primary/20 absolute -top-2 -left-2" />
                <p className="text-muted-foreground italic pl-6">
                  "{caseStudy.quote}"
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                  {caseStudy.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{caseStudy.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {caseStudy.role}, {caseStudy.company}
                  </p>
                </div>
                {caseStudy.linkedIn && (
                  <a
                    href={caseStudy.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
