import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Eye, Clock, Target, TrendingUp, Loader2, BarChart3 } from "lucide-react";
import { FunnelChart } from "@/components/analytics/FunnelChart";
import { ScrollHeatmap } from "@/components/analytics/ScrollHeatmap";
import { SectionTimeChart } from "@/components/analytics/SectionTimeChart";

interface ArticleAnalyticsPanelProps {
  articleId: string;
  blogId: string;
}

interface ArticleStats {
  views: number;
  avgTime: number;
  readRate: number;
  shares: number;
}

export function ArticleAnalyticsPanel({ articleId, blogId }: ArticleAnalyticsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase
        .from('article_analytics')
        .select('time_on_page, read_percentage')
        .eq('article_id', articleId);

      if (data) {
        const views = data.length;
        const avgTime = views > 0 
          ? Math.round(data.reduce((sum, a) => sum + (a.time_on_page || 0), 0) / views)
          : 0;
        const readRate = views > 0
          ? Math.round(data.reduce((sum, a) => sum + (a.read_percentage || 0), 0) / views)
          : 0;

        // Get share count from funnel events
        const { data: shareEvents } = await supabase
          .from('funnel_events')
          .select('id')
          .eq('article_id', articleId)
          .eq('event_type', 'share');

        setStats({
          views,
          avgTime,
          readRate,
          shares: shareEvents?.length || 0,
        });
      }

      setLoading(false);
    }

    fetchStats();
  }, [articleId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Performance do Artigo</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showDetails ? 'Ocultar Detalhes' : 'Ver Detalhes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Views</p>
                <p className="font-semibold">{stats?.views.toLocaleString() || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
                <p className="font-semibold">{formatTime(stats?.avgTime || 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa Leitura</p>
                <p className="font-semibold">{stats?.readRate || 0}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shares</p>
                <p className="font-semibold">{stats?.shares || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Analytics Detalhado</CardTitle>
            <CardDescription>Análise completa do comportamento dos leitores</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="funnel">
              <TabsList className="mb-4">
                <TabsTrigger value="funnel">Funil</TabsTrigger>
                <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                <TabsTrigger value="sections">Seções</TabsTrigger>
              </TabsList>
              
              <TabsContent value="funnel">
                <FunnelChart blogId={blogId} articleId={articleId} period="30" />
              </TabsContent>
              
              <TabsContent value="heatmap">
                <ScrollHeatmap blogId={blogId} articleId={articleId} period="30" />
              </TabsContent>
              
              <TabsContent value="sections">
                <SectionTimeChart blogId={blogId} articleId={articleId} period="30" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
