import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FunnelTimeComparisonProps {
  blogId: string;
}

interface TimeDataPoint {
  period: string;
  topToMiddle: number;
  middleToBottom: number;
  ctaRate: number;
}

interface TrendData {
  label: string;
  current: number;
  previous: number;
  change: number;
  color: string;
}

export function FunnelTimeComparison({ blogId }: FunnelTimeComparisonProps) {
  const [granularity, setGranularity] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TimeDataPoint[]>([]);

  useEffect(() => {
    fetchHistoricalData();
  }, [blogId, granularity]);

  async function fetchHistoricalData() {
    setLoading(true);

    try {
      const now = new Date();
      let intervals: { start: Date; end: Date; label: string }[] = [];

      if (granularity === 'weekly') {
        const weeks = eachWeekOfInterval({
          start: subDays(now, 42), // 6 weeks
          end: now
        }, { weekStartsOn: 1 });

        intervals = weeks.slice(-6).map(weekStart => ({
          start: startOfWeek(weekStart, { weekStartsOn: 1 }),
          end: endOfWeek(weekStart, { weekStartsOn: 1 }),
          label: `Sem ${format(weekStart, 'd/M', { locale: ptBR })}`
        }));
      } else {
        const months = eachMonthOfInterval({
          start: subDays(now, 150), // ~5 months
          end: now
        });

        intervals = months.slice(-5).map(monthStart => ({
          start: startOfMonth(monthStart),
          end: endOfMonth(monthStart),
          label: format(monthStart, 'MMM', { locale: ptBR })
        }));
      }

      // Fetch all funnel articles
      const { data: articles } = await supabase
        .from('articles')
        .select('id, funnel_stage')
        .eq('blog_id', blogId)
        .eq('generation_source', 'sales_funnel');

      if (!articles || articles.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const articleIds = articles.map(a => a.id);
      const articleStages = new Map(articles.map(a => [a.id, a.funnel_stage]));

      // Fetch all events in the entire period
      const { data: allEvents } = await supabase
        .from('funnel_events')
        .select('event_type, article_id, created_at')
        .eq('blog_id', blogId)
        .in('article_id', articleIds)
        .gte('created_at', intervals[0].start.toISOString())
        .lte('created_at', now.toISOString());

      // Calculate metrics for each period
      const results: TimeDataPoint[] = intervals.map(interval => {
        const periodEvents = allEvents?.filter(e => {
          const eventDate = new Date(e.created_at!);
          return eventDate >= interval.start && eventDate <= interval.end;
        }) || [];

        // Group by stage
        const topViews = periodEvents.filter(e => 
          e.event_type === 'page_enter' && articleStages.get(e.article_id!) === 'top'
        ).length;
        const middleViews = periodEvents.filter(e => 
          e.event_type === 'page_enter' && articleStages.get(e.article_id!) === 'middle'
        ).length;
        const bottomViews = periodEvents.filter(e => 
          e.event_type === 'page_enter' && articleStages.get(e.article_id!) === 'bottom'
        ).length;
        const ctaClicks = periodEvents.filter(e => 
          e.event_type === 'cta_click' && articleStages.get(e.article_id!) === 'bottom'
        ).length;

        const topToMiddle = topViews > 0 ? Math.round((middleViews / topViews) * 100) : 0;
        const middleToBottom = middleViews > 0 ? Math.round((bottomViews / middleViews) * 100) : 0;
        const ctaRate = bottomViews > 0 ? Math.round((ctaClicks / bottomViews) * 100) : 0;

        return {
          period: interval.label,
          topToMiddle,
          middleToBottom,
          ctaRate
        };
      });

      setData(results);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    } finally {
      setLoading(false);
    }
  }

  const trends: TrendData[] = useMemo(() => {
    if (data.length < 2) return [];

    const current = data[data.length - 1];
    const previous = data[data.length - 2];

    return [
      {
        label: 'Topo → Meio',
        current: current.topToMiddle,
        previous: previous.topToMiddle,
        change: current.topToMiddle - previous.topToMiddle,
        color: 'hsl(var(--primary))'
      },
      {
        label: 'Meio → Fundo',
        current: current.middleToBottom,
        previous: previous.middleToBottom,
        change: current.middleToBottom - previous.middleToBottom,
        color: 'hsl(var(--warning))'
      },
      {
        label: 'Taxa CTA',
        current: current.ctaRate,
        previous: previous.ctaRate,
        change: current.ctaRate - previous.ctaRate,
        color: 'hsl(var(--success))'
      }
    ];
  }, [data]);

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Evolução das Taxas de Conversão
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={granularity === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGranularity('weekly')}
            >
              Semanal
            </Button>
            <Button
              variant={granularity === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGranularity('monthly')}
            >
              Mensal
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="period" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                className="fill-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="topToMiddle" 
                name="Topo → Meio"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="middleToBottom" 
                name="Meio → Fundo"
                stroke="hsl(var(--warning))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--warning))', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="ctaRate" 
                name="Taxa CTA"
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Cards */}
        {trends.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {trends.map((trend) => (
              <div 
                key={trend.label} 
                className="p-3 rounded-lg border bg-card"
              >
                <p className="text-xs text-muted-foreground mb-1">{trend.label}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{trend.current}%</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(trend.change)}
                    <span className={`text-xs font-medium ${getTrendColor(trend.change)}`}>
                      {trend.change > 0 ? '+' : ''}{trend.change}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs {trend.previous}% anterior
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
