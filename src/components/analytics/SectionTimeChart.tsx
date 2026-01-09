import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SectionTimeChartProps {
  blogId: string;
  articleId?: string;
  period: string;
}

interface SectionData {
  section_title: string;
  section_index: number;
  avg_time: number;
  total_views: number;
}

export function SectionTimeChart({ blogId, articleId, period }: SectionTimeChartProps) {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionData[]>([]);

  useEffect(() => {
    async function fetchSectionData() {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      // Get article IDs for this blog
      let articleIds: string[] = [];
      
      if (articleId) {
        articleIds = [articleId];
      } else {
        const { data: articles } = await supabase
          .from('articles')
          .select('id')
          .eq('blog_id', blogId);
        
        if (articles) {
          articleIds = articles.map(a => a.id);
        }
      }

      if (articleIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('section_analytics')
        .select('section_title, section_index, time_in_view')
        .in('article_id', articleIds)
        .gte('created_at', startDate.toISOString());

      if (data && data.length > 0) {
        // Aggregate by section
        const sectionMap = new Map<string, { totalTime: number; count: number; index: number }>();
        
        data.forEach((record) => {
          const key = record.section_title;
          const existing = sectionMap.get(key) || { totalTime: 0, count: 0, index: record.section_index };
          existing.totalTime += record.time_in_view || 0;
          existing.count += 1;
          sectionMap.set(key, existing);
        });

        const sectionData: SectionData[] = Array.from(sectionMap.entries())
          .map(([title, stats]) => ({
            section_title: title.length > 30 ? title.slice(0, 30) + '...' : title,
            section_index: stats.index,
            avg_time: Math.round(stats.totalTime / stats.count),
            total_views: stats.count,
          }))
          .sort((a, b) => a.section_index - b.section_index);

        setSections(sectionData);
      }

      setLoading(false);
    }

    fetchSectionData();
  }, [blogId, articleId, period]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tempo por Seção</CardTitle>
          <CardDescription>Tempo médio de leitura em cada seção</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const avgTotal = sections.length > 0 
    ? Math.round(sections.reduce((sum, s) => sum + s.avg_time, 0) / sections.length)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tempo por Seção</CardTitle>
        <CardDescription>
          Tempo médio geral: {formatTime(avgTotal)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sections.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de seção disponível
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bar Chart */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sections} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}s`} />
                  <YAxis 
                    type="category" 
                    dataKey="section_title" 
                    width={150}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatTime(value), 'Tempo médio']}
                  />
                  <Bar 
                    dataKey="avg_time" 
                    fill="hsl(245, 82%, 58%)" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Section List */}
            <div className="border rounded-lg divide-y">
              {sections.map((section, index) => {
                const isAboveAvg = section.avg_time > avgTotal;
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-6">
                        #{section.section_index + 1}
                      </span>
                      <span className="font-medium text-sm">{section.section_title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        {section.total_views} leituras
                      </span>
                      <span className={`font-semibold ${isAboveAvg ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {formatTime(section.avg_time)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Insights */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Insights</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {sections.length > 0 && (
                  <>
                    <li>
                      • Seção mais lida: <strong>{sections.reduce((a, b) => a.avg_time > b.avg_time ? a : b).section_title}</strong>
                    </li>
                    {sections.filter(s => s.avg_time < 10).length > 0 && (
                      <li>
                        • {sections.filter(s => s.avg_time < 10).length} seções com menos de 10s de leitura média
                      </li>
                    )}
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
