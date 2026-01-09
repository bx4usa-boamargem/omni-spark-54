import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Lightbulb, Scale, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { FunnelArticleCard } from "./FunnelArticleCard";

interface ArticleWithMetrics {
  id: string;
  title: string;
  status: string;
  view_count: number;
  published_at: string | null;
  metrics: {
    readRate: number;
    scroll50: number;
    ctaRate: number;
  };
}

interface FunnelStageCardProps {
  stage: 'top' | 'middle' | 'bottom';
  articles: ArticleWithMetrics[];
}

const stageConfig = {
  top: {
    title: 'Topo de Funil',
    subtitle: 'Consciência',
    description: 'Artigos que educam sobre problemas e criam consciência',
    icon: Lightbulb,
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  middle: {
    title: 'Meio de Funil',
    subtitle: 'Consideração',
    description: 'Artigos que comparam soluções e alternativas',
    icon: Scale,
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  bottom: {
    title: 'Fundo de Funil',
    subtitle: 'Decisão',
    description: 'Artigos que quebram objeções e incentivam a ação',
    icon: ShieldCheck,
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
};

export function FunnelStageCard({ stage, articles }: FunnelStageCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const config = stageConfig[stage];
  const Icon = config.icon;

  const aggregatedMetrics = articles.length > 0 ? {
    totalViews: articles.reduce((sum, a) => sum + a.view_count, 0),
    avgReadRate: Math.round(articles.reduce((sum, a) => sum + a.metrics.readRate, 0) / articles.length) || 0,
    avgScroll50: Math.round(articles.reduce((sum, a) => sum + a.metrics.scroll50, 0) / articles.length) || 0,
    avgCta: Math.round(articles.reduce((sum, a) => sum + a.metrics.ctaRate, 0) / articles.length) || 0,
  } : { totalViews: 0, avgReadRate: 0, avgScroll50: 0, avgCta: 0 };

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.iconColor}`} />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {config.title}
                    <Badge className={`${config.badgeColor} border-0`}>
                      {articles.length} {articles.length === 1 ? 'artigo' : 'artigos'}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {articles.length > 0 && (
                  <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{aggregatedMetrics.totalViews.toLocaleString()} views</span>
                    <span>{aggregatedMetrics.avgReadRate}% leitura</span>
                  </div>
                )}
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {articles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icon className={`h-8 w-8 mx-auto mb-2 ${config.iconColor} opacity-50`} />
                <p>Nenhum artigo nesta etapa</p>
                <p className="text-xs mt-1">Crie artigos pelo Funil de Vendas para preencher esta etapa</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles.map((article) => (
                  <FunnelArticleCard key={article.id} article={article} stage={stage} />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
