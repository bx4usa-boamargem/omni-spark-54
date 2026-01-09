import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, TrendingUp, TrendingDown, Minus, HelpCircle, Activity, Target, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FunnelGoalsManager } from "./FunnelGoalsManager";

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

interface FunnelConversionDashboardProps {
  topArticles: ArticleWithMetrics[];
  middleArticles: ArticleWithMetrics[];
  bottomArticles: ArticleWithMetrics[];
  period: string;
  blogId: string;
}

interface StageData {
  name: string;
  stage: string;
  articles: number;
  views: number;
  color: string;
  bgColor: string;
}

interface FunnelGoal {
  stage: string;
  target_value: number;
  alert_threshold: number;
}

export function FunnelConversionDashboard({
  topArticles,
  middleArticles,
  bottomArticles,
  period,
  blogId
}: FunnelConversionDashboardProps) {
  const [realtimeViews, setRealtimeViews] = useState<Record<string, number>>({});
  const [goals, setGoals] = useState<FunnelGoal[]>([]);
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [alertsShown, setAlertsShown] = useState(false);
  const { toast } = useToast();

  // Fetch goals
  useEffect(() => {
    fetchGoals();
  }, [blogId]);

  async function fetchGoals() {
    const { data } = await supabase
      .from('funnel_goals')
      .select('stage, target_value, alert_threshold')
      .eq('blog_id', blogId);
    
    if (data) {
      setGoals(data);
    }
  }

  // Listen for realtime funnel events
  useEffect(() => {
    const channel = supabase
      .channel('funnel-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'funnel_events',
          filter: `blog_id=eq.${blogId}`
        },
        (payload) => {
          const articleId = payload.new.article_id;
          if (articleId && payload.new.event_type === 'page_enter') {
            setRealtimeViews(prev => ({
              ...prev,
              [articleId]: (prev[articleId] || 0) + 1
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [blogId]);

  const stages: StageData[] = useMemo(() => {
    const topViews = topArticles.reduce((sum, a) => sum + a.view_count + (realtimeViews[a.id] || 0), 0);
    const middleViews = middleArticles.reduce((sum, a) => sum + a.view_count + (realtimeViews[a.id] || 0), 0);
    const bottomViews = bottomArticles.reduce((sum, a) => sum + a.view_count + (realtimeViews[a.id] || 0), 0);

    return [
      { name: "Topo", stage: "top", articles: topArticles.length, views: topViews, color: "text-blue-600", bgColor: "bg-blue-500" },
      { name: "Meio", stage: "middle", articles: middleArticles.length, views: middleViews, color: "text-amber-600", bgColor: "bg-amber-500" },
      { name: "Fundo", stage: "bottom", articles: bottomArticles.length, views: bottomViews, color: "text-green-600", bgColor: "bg-green-500" },
    ];
  }, [topArticles, middleArticles, bottomArticles, realtimeViews]);

  const conversions = useMemo(() => {
    const topViews = stages[0].views;
    const middleViews = stages[1].views;
    const bottomViews = stages[2].views;

    const topToMiddle = topViews > 0 ? Math.round((middleViews / topViews) * 100) : 0;
    const middleToBottom = middleViews > 0 ? Math.round((bottomViews / middleViews) * 100) : 0;
    const overallConversion = topViews > 0 ? Math.round((bottomViews / topViews) * 100) : 0;

    // Average CTA rate from bottom articles
    const avgCtaRate = bottomArticles.length > 0
      ? Math.round(bottomArticles.reduce((sum, a) => sum + a.metrics.ctaRate, 0) / bottomArticles.length)
      : 0;

    return {
      topToMiddle,
      middleToBottom,
      overallConversion,
      avgCtaRate
    };
  }, [stages, bottomArticles]);

  // Check goals and show alerts
  useEffect(() => {
    if (goals.length > 0 && !alertsShown && stages[0].views > 0) {
      const stageToMetric: Record<string, number> = {
        top_to_middle: conversions.topToMiddle,
        middle_to_bottom: conversions.middleToBottom,
        overall: conversions.overallConversion,
        cta_rate: conversions.avgCtaRate
      };

      const stageLabels: Record<string, string> = {
        top_to_middle: 'Topo → Meio',
        middle_to_bottom: 'Meio → Fundo',
        overall: 'Conversão Geral',
        cta_rate: 'Taxa de CTA'
      };

      const belowGoals = goals.filter(goal => {
        const currentValue = stageToMetric[goal.stage] || 0;
        return currentValue < (goal.target_value - goal.alert_threshold);
      });

      if (belowGoals.length > 0) {
        const firstAlert = belowGoals[0];
        const currentValue = stageToMetric[firstAlert.stage] || 0;
        toast({
          variant: "destructive",
          title: "Meta não atingida",
          description: `${stageLabels[firstAlert.stage]} está em ${currentValue}%, abaixo da meta de ${firstAlert.target_value}%`,
        });
        setAlertsShown(true);
      }
    }
  }, [goals, conversions, alertsShown, stages, toast]);

  const getGoalForStage = (stage: string) => {
    return goals.find(g => g.stage === stage);
  };

  const getGoalStatus = (stage: string, currentValue: number) => {
    const goal = getGoalForStage(stage);
    if (!goal) return null;

    if (currentValue >= goal.target_value) {
      return { status: 'above', icon: CheckCircle2, color: 'text-green-600', borderColor: 'border-green-500', bgColor: 'bg-green-500/10' };
    }
    if (currentValue >= goal.target_value - goal.alert_threshold) {
      return { status: 'warning', icon: Minus, color: 'text-amber-600', borderColor: 'border-amber-500', bgColor: 'bg-amber-500/10' };
    }
    return { status: 'below', icon: AlertTriangle, color: 'text-red-600', borderColor: 'border-red-500', bgColor: 'bg-red-500/10' };
  };

  const getAnimationSpeed = (rate: number) => {
    if (rate >= 50) return { duration: '1s', color: 'text-green-500' };
    if (rate >= 30) return { duration: '1.5s', color: 'text-amber-500' };
    return { duration: '2.5s', color: 'text-red-500' };
  };

  const insights = useMemo(() => {
    const messages: string[] = [];
    
    if (conversions.topToMiddle < 30 && stages[0].views > 0) {
      messages.push("🔴 Baixa conversão do Topo para Meio. Considere adicionar CTAs mais claros nos artigos de conscientização.");
    }
    if (conversions.middleToBottom < 30 && stages[1].views > 0) {
      messages.push("🔴 Baixa conversão do Meio para Fundo. Os artigos de comparação podem precisar de links internos para conteúdo de decisão.");
    }
    if (conversions.topToMiddle >= 50) {
      messages.push("🟢 Excelente fluxo do Topo para Meio! Seus leitores estão engajados na jornada.");
    }
    if (conversions.avgCtaRate >= 10) {
      messages.push("🟢 Taxa de CTA acima de 10% no Fundo de Funil - seus artigos de decisão estão convertendo bem!");
    }
    if (stages[0].articles === 0) {
      messages.push("⚠️ Nenhum artigo no Topo de Funil. Adicione conteúdo de conscientização para atrair novos leitores.");
    }
    if (stages[2].articles === 0) {
      messages.push("⚠️ Nenhum artigo no Fundo de Funil. Crie conteúdo de decisão para converter leitores em clientes.");
    }

    return messages.slice(0, 3);
  }, [conversions, stages]);

  const maxViews = Math.max(...stages.map(s => s.views), 1);

  if (topArticles.length === 0 && middleArticles.length === 0 && bottomArticles.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Fluxo de Conversão do Funil
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setGoalsDialogOpen(true)}>
                <Target className="h-4 w-4 mr-1" />
                Metas
              </Button>
              <Badge variant="outline" className="text-xs">
                Tempo Real
                <span className="ml-1 h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Flow Diagram with Pulsating Arrows */}
          <div className="flex items-center justify-between gap-2 py-4">
            {stages.map((stage, index) => {
              const rate = index === 0 ? conversions.topToMiddle : conversions.middleToBottom;
              const animation = getAnimationSpeed(rate);
              
              return (
                <div key={stage.stage} className="flex items-center flex-1">
                  {/* Stage Box */}
                  <div className={`flex-1 p-4 rounded-lg border-2 border-dashed ${stage.bgColor}/20 text-center`}>
                    <p className={`text-sm font-medium ${stage.color}`}>{stage.name}</p>
                    <p className="text-2xl font-bold">{stage.views.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{stage.articles} artigos</p>
                  </div>
                  
                  {/* Animated Arrow with conversion rate */}
                  {index < stages.length - 1 && (
                    <div className="flex flex-col items-center px-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center cursor-help relative">
                            {/* Pulsating particles */}
                            <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                              <span 
                                className={`h-1.5 w-1.5 rounded-full ${animation.color.replace('text-', 'bg-')}/60 animate-flow-particle`}
                                style={{ animationDuration: animation.duration, animationDelay: '0s' }}
                              />
                              <span 
                                className={`h-1.5 w-1.5 rounded-full ${animation.color.replace('text-', 'bg-')}/60 animate-flow-particle`}
                                style={{ animationDuration: animation.duration, animationDelay: '0.3s' }}
                              />
                              <span 
                                className={`h-1.5 w-1.5 rounded-full ${animation.color.replace('text-', 'bg-')}/60 animate-flow-particle`}
                                style={{ animationDuration: animation.duration, animationDelay: '0.6s' }}
                              />
                            </div>
                            {/* Main arrow */}
                            <ArrowRight 
                              className={`h-6 w-6 ${animation.color} animate-pulse-flow`}
                              style={{ animationDuration: animation.duration }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Taxa de passagem para a próxima etapa</p>
                          <p className="text-xs text-muted-foreground">
                            {index === 0 
                              ? `${stages[1].views} de ${stages[0].views} leitores avançaram`
                              : `${stages[2].views} de ${stages[1].views} leitores avançaram`
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <span className={`text-xs font-bold mt-1 ${animation.color}`}>
                        {rate}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Horizontal Bar Chart */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Distribuição de Views</p>
            {stages.map((stage) => {
              const percentage = maxViews > 0 ? (stage.views / maxViews) * 100 : 0;
              const dropRate = stage.stage !== 'top' 
                ? Math.round(((stages[0].views - stage.views) / Math.max(stages[0].views, 1)) * 100)
                : 0;
              
              return (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={stage.color}>{stage.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{stage.views.toLocaleString()}</span>
                      {dropRate > 0 && (
                        <span className="text-xs text-red-500">-{dropRate}%</span>
                      )}
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full ${stage.bgColor} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conversion Rate Cards with Goal Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ConversionCard
              title="Topo → Meio"
              rate={conversions.topToMiddle}
              description="Passagem de conscientização para consideração"
              goalStatus={getGoalStatus('top_to_middle', conversions.topToMiddle)}
              goal={getGoalForStage('top_to_middle')}
            />
            <ConversionCard
              title="Meio → Fundo"
              rate={conversions.middleToBottom}
              description="Passagem de consideração para decisão"
              goalStatus={getGoalStatus('middle_to_bottom', conversions.middleToBottom)}
              goal={getGoalForStage('middle_to_bottom')}
            />
            <ConversionCard
              title="Conversão Geral"
              rate={conversions.overallConversion}
              description="Do Topo até o Fundo do funil"
              goalStatus={getGoalStatus('overall', conversions.overallConversion)}
              goal={getGoalForStage('overall')}
            />
            <ConversionCard
              title="CTA no Fundo"
              rate={conversions.avgCtaRate}
              description="Taxa média de clique em CTAs"
              goalStatus={getGoalStatus('cta_rate', conversions.avgCtaRate)}
              goal={getGoalForStage('cta_rate')}
            />
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium flex items-center gap-2">
                Insights Automáticos
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Recomendações baseadas nos dados do seu funil</p>
                  </TooltipContent>
                </Tooltip>
              </p>
              {insights.map((insight, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {insight}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FunnelGoalsManager
        open={goalsDialogOpen}
        onOpenChange={setGoalsDialogOpen}
        blogId={blogId}
        onSave={fetchGoals}
      />
    </TooltipProvider>
  );
}

interface GoalStatusType {
  status: string;
  icon: typeof CheckCircle2;
  color: string;
  borderColor: string;
  bgColor: string;
}

function ConversionCard({ 
  title, 
  rate, 
  description,
  goalStatus,
  goal
}: { 
  title: string; 
  rate: number; 
  description: string;
  goalStatus?: GoalStatusType | null;
  goal?: FunnelGoal;
}) {
  const getDefaultStatus = () => {
    if (rate >= 50) return { color: "text-green-600", bg: "bg-green-500/10", border: "border-transparent" };
    if (rate >= 30) return { color: "text-amber-600", bg: "bg-amber-500/10", border: "border-transparent" };
    return { color: "text-red-600", bg: "bg-red-500/10", border: "border-transparent" };
  };
  
  const defaultStatus = getDefaultStatus();
  const StatusIcon = goalStatus?.icon;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`p-3 rounded-lg border-2 cursor-help transition-all ${
          goalStatus ? `${goalStatus.bgColor} ${goalStatus.borderColor}` : `${defaultStatus.bg} ${defaultStatus.border}`
        } ${goalStatus?.status === 'below' ? 'animate-glow-pulse' : ''}`}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            {StatusIcon && (
              <StatusIcon className={`h-4 w-4 ${goalStatus?.color}`} />
            )}
          </div>
          <p className={`text-xl font-bold ${goalStatus?.color || defaultStatus.color}`}>{rate}%</p>
          {goal && (
            <p className="text-xs text-muted-foreground mt-1">
              Meta: {goal.target_value}%
            </p>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">{description}</p>
        {goal && (
          <p className="text-xs text-muted-foreground mt-1">
            {rate >= goal.target_value 
              ? `✓ Acima da meta de ${goal.target_value}%`
              : `✗ ${goal.target_value - rate}% abaixo da meta`
            }
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
