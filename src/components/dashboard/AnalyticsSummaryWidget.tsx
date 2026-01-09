import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, MousePointer, ArrowRight, BarChart3 } from "lucide-react";
import { MetricTooltip } from "@/components/analytics/MetricTooltip";

interface AnalyticsSummaryWidgetProps {
  blogId: string;
}

interface FunnelStats {
  pageEnter: number;
  scroll50: number;
  scroll100: number;
  ctaClick: number;
}

interface ScrollRetention {
  position: number;
  percentage: number;
}

export function AnalyticsSummaryWidget({ blogId }: AnalyticsSummaryWidgetProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [funnelStats, setFunnelStats] = useState<FunnelStats>({
    pageEnter: 0,
    scroll50: 0,
    scroll100: 0,
    ctaClick: 0,
  });
  const [avgScrollDepth, setAvgScrollDepth] = useState(0);
  const [scrollRetention, setScrollRetention] = useState<ScrollRetention[]>([]);

  useEffect(() => {
    async function fetchAnalytics() {
      if (!blogId) return;

      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        // Fetch funnel events
        const { data: funnelData } = await supabase
          .from("funnel_events")
          .select("event_type")
          .eq("blog_id", blogId)
          .gte("created_at", startDate.toISOString());

        if (funnelData) {
          const stats: FunnelStats = {
            pageEnter: 0,
            scroll50: 0,
            scroll100: 0,
            ctaClick: 0,
          };

          funnelData.forEach((event) => {
            switch (event.event_type) {
              case "page_enter":
                stats.pageEnter++;
                break;
              case "scroll_50":
                stats.scroll50++;
                break;
              case "scroll_100":
                stats.scroll100++;
                break;
              case "cta_click":
                stats.ctaClick++;
                break;
            }
          });

          setFunnelStats(stats);
        }

        // Fetch scroll depth data
        const { data: scrollData } = await supabase
          .from("article_analytics")
          .select("scroll_depth")
          .eq("blog_id", blogId)
          .gte("created_at", startDate.toISOString())
          .not("scroll_depth", "is", null);

        if (scrollData && scrollData.length > 0) {
          const depths = scrollData.map((s) => s.scroll_depth || 0);
          const avg = depths.reduce((a, b) => a + b, 0) / depths.length;
          setAvgScrollDepth(Math.round(avg));

          // Calculate retention at different positions
          const positions = [25, 50, 75, 100];
          const retention = positions.map((pos) => ({
            position: pos,
            percentage: Math.round((depths.filter((d) => d >= pos).length / depths.length) * 100),
          }));
          setScrollRetention(retention);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [blogId]);

  const readRate = funnelStats.pageEnter > 0 
    ? Math.round((funnelStats.scroll100 / funnelStats.pageEnter) * 100) 
    : 0;
  
  const ctaRate = funnelStats.pageEnter > 0 
    ? Math.round((funnelStats.ctaClick / funnelStats.pageEnter) * 100) 
    : 0;

  const hasData = funnelStats.pageEnter > 0 || avgScrollDepth > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Resumo de Engajamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Publique artigos para ver métricas de engajamento</p>
            <Button variant="link" size="sm" onClick={() => navigate("/articles/new")}>
              Criar artigo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Resumo de Engajamento
          </CardTitle>
          <span className="text-xs text-muted-foreground">Últimos 7 dias</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold">{funnelStats.pageEnter.toLocaleString("pt-BR")}</div>
            <MetricTooltip metricKey="visitors" showIcon={false}>
              <span className="text-xs text-muted-foreground">Visitantes</span>
            </MetricTooltip>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold">{readRate}%</div>
            <MetricTooltip metricKey="read_complete" showIcon={false}>
              <span className="text-xs text-muted-foreground">Leitura completa</span>
            </MetricTooltip>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <MousePointer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xl font-bold">{ctaRate}%</div>
            <MetricTooltip metricKey="cta_clicks" showIcon={false}>
              <span className="text-xs text-muted-foreground">Cliques CTA</span>
            </MetricTooltip>
          </div>
        </div>

        {/* Average Scroll Depth */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <MetricTooltip metricKey="scroll_depth">
              <span className="text-sm text-muted-foreground">Profundidade média de scroll</span>
            </MetricTooltip>
            <span className="text-sm font-medium">{avgScrollDepth}%</span>
          </div>
          <Progress value={avgScrollDepth} className="h-2" />
        </div>

        {/* Scroll Retention */}
        {scrollRetention.length > 0 && (
          <div className="space-y-2">
            <MetricTooltip metricKey="retention">
              <span className="text-sm text-muted-foreground">Retenção por posição</span>
            </MetricTooltip>
            <div className="space-y-1.5">
              {scrollRetention.map((item) => (
                <div key={item.position} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">{item.position}%</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link to full analytics */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-primary hover:text-primary"
          onClick={() => navigate("/analytics")}
        >
          Ver analytics completos
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
