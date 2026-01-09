import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, AlertTriangle, Star, Lightbulb, Scale, Target } from "lucide-react";

interface ArticleWithMetrics {
  id: string;
  title: string;
  status: string;
  view_count: number;
  funnel_stage: string | null;
  published_at: string | null;
  metrics: {
    readRate: number;
    scroll50: number;
    ctaRate: number;
  };
}

interface FunnelPerformanceComparisonProps {
  topArticles: ArticleWithMetrics[];
  middleArticles: ArticleWithMetrics[];
  bottomArticles: ArticleWithMetrics[];
}

interface StageMetrics {
  name: string;
  stage: 'top' | 'middle' | 'bottom';
  articles: ArticleWithMetrics[];
  totalViews: number;
  avgScroll50: number;
  avgReadRate: number;
  avgCtaRate: number;
  icon: React.ReactNode;
  color: string;
}

export function FunnelPerformanceComparison({
  topArticles,
  middleArticles,
  bottomArticles,
}: FunnelPerformanceComparisonProps) {
  const calculateStageMetrics = (
    name: string,
    stage: 'top' | 'middle' | 'bottom',
    articles: ArticleWithMetrics[],
    icon: React.ReactNode,
    color: string
  ): StageMetrics => {
    const totalViews = articles.reduce((sum, a) => sum + a.view_count, 0);
    const avgScroll50 = articles.length > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.metrics.scroll50, 0) / articles.length)
      : 0;
    const avgReadRate = articles.length > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.metrics.readRate, 0) / articles.length)
      : 0;
    const avgCtaRate = articles.length > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.metrics.ctaRate, 0) / articles.length)
      : 0;

    return { name, stage, articles, totalViews, avgScroll50, avgReadRate, avgCtaRate, icon, color };
  };

  const stages: StageMetrics[] = [
    calculateStageMetrics('Topo', 'top', topArticles, <Lightbulb className="h-5 w-5" />, 'blue'),
    calculateStageMetrics('Meio', 'middle', middleArticles, <Scale className="h-5 w-5" />, 'purple'),
    calculateStageMetrics('Fundo', 'bottom', bottomArticles, <Target className="h-5 w-5" />, 'green'),
  ];

  // Calculate overall averages for comparison
  const allArticles = [...topArticles, ...middleArticles, ...bottomArticles];
  const overallAvgScroll50 = allArticles.length > 0
    ? Math.round(allArticles.reduce((sum, a) => sum + a.metrics.scroll50, 0) / allArticles.length)
    : 0;
  const overallAvgReadRate = allArticles.length > 0
    ? Math.round(allArticles.reduce((sum, a) => sum + a.metrics.readRate, 0) / allArticles.length)
    : 0;

  // Identify bottlenecks and best performers
  const getStageStatus = (stage: StageMetrics) => {
    if (stage.articles.length === 0) return 'empty';
    
    const scroll50Diff = stage.avgScroll50 - overallAvgScroll50;
    const readDiff = stage.avgReadRate - overallAvgReadRate;
    
    if (scroll50Diff < -15 || readDiff < -15) return 'bottleneck';
    if (scroll50Diff > 10 || readDiff > 10) return 'best';
    return 'normal';
  };

  const bottlenecks: string[] = [];
  const recommendations: string[] = [];

  stages.forEach(stage => {
    const status = getStageStatus(stage);
    const scrollDiff = stage.avgScroll50 - overallAvgScroll50;
    const readDiff = stage.avgReadRate - overallAvgReadRate;

    if (status === 'bottleneck') {
      if (scrollDiff < -15) {
        bottlenecks.push(`${stage.name} de Funil tem retenção ${Math.abs(scrollDiff)}% abaixo da média`);
        recommendations.push(`Revise as introduções dos artigos do ${stage.name} - os leitores estão abandonando cedo`);
      }
      if (readDiff < -15) {
        bottlenecks.push(`${stage.name} de Funil tem taxa de leitura ${Math.abs(readDiff)}% abaixo da média`);
        recommendations.push(`Considere encurtar os artigos do ${stage.name} ou melhorar o engajamento ao longo do texto`);
      }
    }
    
    if (status === 'best' && stage.avgReadRate > 0) {
      recommendations.push(`${stage.name} de Funil tem ótima performance (${stage.avgReadRate}% leitura) - replique o estilo para outras etapas`);
    }

    if (stage.articles.length === 0) {
      recommendations.push(`Crie artigos para ${stage.name} de Funil para completar a jornada do cliente`);
    }
  });

  const getStatusBadge = (stage: StageMetrics) => {
    const status = getStageStatus(stage);
    switch (status) {
      case 'bottleneck':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Gargalo</Badge>;
      case 'best':
        return <Badge className="gap-1 bg-green-500"><Star className="h-3 w-3" /> Melhor</Badge>;
      case 'empty':
        return <Badge variant="secondary">Sem dados</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  };

  if (allArticles.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Comparativo de Performance do Funil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stage Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stages.map((stage) => (
            <Card key={stage.stage} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${colorClasses[stage.color].bg}`}>
                      <span className={colorClasses[stage.color].text}>{stage.icon}</span>
                    </div>
                    <span className="font-semibold">{stage.name}</span>
                  </div>
                  {getStatusBadge(stage)}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Artigos</span>
                    <span className="font-medium">{stage.articles.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Views</span>
                    <span className="font-medium">{stage.totalViews.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Scroll 50%</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{stage.avgScroll50}%</span>
                      {stage.articles.length > 0 && (
                        stage.avgScroll50 >= overallAvgScroll50 
                          ? <TrendingUp className="h-3 w-3 text-green-500" />
                          : <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Leitura</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{stage.avgReadRate}%</span>
                      {stage.articles.length > 0 && (
                        stage.avgReadRate >= overallAvgReadRate 
                          ? <TrendingUp className="h-3 w-3 text-green-500" />
                          : <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                  {stage.stage === 'bottom' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CTA</span>
                      <span className="font-medium">{stage.avgCtaRate}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recommendations */}
        {(bottlenecks.length > 0 || recommendations.length > 0) && (
          <div className="space-y-3">
            {bottlenecks.map((bottleneck, i) => (
              <Alert key={`bottleneck-${i}`} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{bottleneck}</AlertDescription>
              </Alert>
            ))}
            {recommendations.slice(0, 3).map((rec, i) => (
              <Alert key={`rec-${i}`}>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>{rec}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
