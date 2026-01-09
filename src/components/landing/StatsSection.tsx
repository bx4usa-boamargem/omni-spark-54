import { useTranslation } from 'react-i18next';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useCountUp, formatNumber } from '@/hooks/useCountUp';
import { FileText, Globe, Eye, Clock } from 'lucide-react';

const stats = [
  { key: 'articles', value: 50000, icon: FileText },
  { key: 'blogs', value: 2500, icon: Globe },
  { key: 'views', value: 5000000, icon: Eye },
  { key: 'hours', value: 120000, icon: Clock }
];

export const StatsSection = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.2);

  return (
    <section ref={ref} className="py-20 bg-muted/30">
      <div className="container max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('landing.stats.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.stats.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.key}
              statKey={stat.key}
              value={stat.value}
              icon={stat.icon}
              isVisible={isVisible}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface StatCardProps {
  statKey: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  isVisible: boolean;
  delay: number;
}

const StatCard = ({ statKey, value, icon: Icon, isVisible, delay }: StatCardProps) => {
  const { t } = useTranslation();
  const count = useCountUp(value, 2000 + delay, 0, isVisible);

  return (
    <div 
      className={`text-center p-6 rounded-2xl bg-background border transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
        <Icon className="h-7 w-7 text-primary-foreground" />
      </div>
      <div className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
        +{formatNumber(count)}
      </div>
      <div className="text-muted-foreground text-sm">
        {t(`landing.stats.${statKey}`)}
      </div>
    </div>
  );
};
