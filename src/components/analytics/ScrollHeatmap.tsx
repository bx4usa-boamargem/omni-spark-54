import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ScrollHeatmapProps {
  blogId: string;
  articleId?: string;
  period: string;
}

interface HeatmapData {
  position: number;
  count: number;
  percentage: number;
}

export function ScrollHeatmap({ blogId, articleId, period }: ScrollHeatmapProps) {
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    async function fetchHeatmapData() {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      let query = supabase
        .from('article_analytics')
        .select('scroll_positions, scroll_depth')
        .eq('blog_id', blogId)
        .gte('created_at', startDate.toISOString());

      if (articleId) {
        query = query.eq('article_id', articleId);
      }

      const { data } = await query;

      if (data) {
        setTotalSessions(data.length);
        
        // Aggregate scroll positions
        const positionCounts: Record<number, number> = {};
        
        // Initialize all positions
        for (let i = 0; i <= 100; i += 5) {
          positionCounts[i] = 0;
        }

        data.forEach((record) => {
          // Use scroll_depth as fallback
          const depth = record.scroll_depth || 0;
          
          // Count all positions up to scroll_depth
          for (let i = 0; i <= depth; i += 5) {
            positionCounts[i] = (positionCounts[i] || 0) + 1;
          }

          // Also process granular scroll_positions if available
          if (record.scroll_positions && Array.isArray(record.scroll_positions)) {
            record.scroll_positions.forEach((pos: number) => {
              const rounded = Math.floor(pos / 5) * 5;
              positionCounts[rounded] = Math.max(positionCounts[rounded] || 0, 1);
            });
          }
        });

        const maxCount = Math.max(...Object.values(positionCounts), 1);
        
        const heatmap: HeatmapData[] = Object.entries(positionCounts)
          .map(([pos, count]) => ({
            position: parseInt(pos),
            count,
            percentage: Math.round((count / maxCount) * 100),
          }))
          .sort((a, b) => a.position - b.position);

        setHeatmapData(heatmap);
      }

      setLoading(false);
    }

    fetchHeatmapData();
  }, [blogId, articleId, period]);

  const getHeatColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-orange-500';
    if (percentage >= 40) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-lime-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Heatmap de Scroll</CardTitle>
          <CardDescription>Onde os leitores param de ler</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heatmap de Scroll</CardTitle>
        <CardDescription>
          Baseado em {totalSessions.toLocaleString()} sessões
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalSessions === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de scroll disponível
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Heatmap */}
            <div className="relative">
              <div className="flex flex-col gap-0.5">
                {heatmapData.map((item) => (
                  <div key={item.position} className="flex items-center gap-3">
                    <span className="w-10 text-xs text-muted-foreground text-right">
                      {item.position}%
                    </span>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-300 ${getHeatColor(item.percentage)}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                    <span className="w-12 text-xs text-right font-medium">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-4 border-t">
              <span className="text-xs text-muted-foreground">Intensidade:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span className="text-xs">Alto</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-orange-500 rounded" />
                <span className="text-xs">Médio-alto</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-500 rounded" />
                <span className="text-xs">Médio</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-lime-500 rounded" />
                <span className="text-xs">Médio-baixo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 rounded" />
                <span className="text-xs">Baixo</span>
              </div>
            </div>

            {/* Insights */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Análise</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {heatmapData.find(h => h.position === 25)?.percentage && 
                 heatmapData.find(h => h.position === 25)!.percentage < 70 && (
                  <li>• Queda significativa nos primeiros 25% do conteúdo</li>
                )}
                {heatmapData.find(h => h.position === 100)?.percentage && 
                 heatmapData.find(h => h.position === 100)!.percentage > 30 && (
                  <li>• Boa retenção até o final ({heatmapData.find(h => h.position === 100)!.percentage}%)</li>
                )}
                {heatmapData.find(h => h.position === 50)?.percentage && 
                 heatmapData.find(h => h.position === 50)!.percentage > 50 && (
                  <li>• Mais da metade dos leitores passa do meio do artigo</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
