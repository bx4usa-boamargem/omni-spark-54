import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface FunnelChartProps {
  blogId: string;
  articleId?: string;
  period: string;
}

interface FunnelStep {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export function FunnelChart({ blogId, articleId, period }: FunnelChartProps) {
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<FunnelStep[]>([]);

  useEffect(() => {
    async function fetchFunnelData() {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      let query = supabase
        .from('funnel_events')
        .select('event_type')
        .eq('blog_id', blogId)
        .gte('created_at', startDate.toISOString());

      if (articleId) {
        query = query.eq('article_id', articleId);
      }

      const { data } = await query;

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((e) => {
          counts[e.event_type] = (counts[e.event_type] || 0) + 1;
        });

        const pageEnter = counts['page_enter'] || 0;
        
        const funnelSteps: FunnelStep[] = [
          { name: 'Entrada', value: pageEnter, percentage: 100, color: 'hsl(245, 82%, 58%)' },
          { name: 'Scroll 25%', value: counts['scroll_25'] || 0, percentage: 0, color: 'hsl(245, 72%, 62%)' },
          { name: 'Scroll 50%', value: counts['scroll_50'] || 0, percentage: 0, color: 'hsl(245, 62%, 66%)' },
          { name: 'Scroll 75%', value: counts['scroll_75'] || 0, percentage: 0, color: 'hsl(245, 52%, 70%)' },
          { name: 'Scroll 100%', value: counts['scroll_100'] || 0, percentage: 0, color: 'hsl(245, 42%, 74%)' },
          { name: 'CTA Clicado', value: counts['cta_click'] || 0, percentage: 0, color: 'hsl(142, 76%, 36%)' },
        ];

        funnelSteps.forEach((step) => {
          step.percentage = pageEnter > 0 ? Math.round((step.value / pageEnter) * 100) : 0;
        });

        setSteps(funnelSteps);
      }

      setLoading(false);
    }

    fetchFunnelData();
  }, [blogId, articleId, period]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
          <CardDescription>Jornada do leitor pelo artigo</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const maxValue = steps[0]?.value || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
        <CardDescription>Jornada do leitor pelo artigo</CardDescription>
      </CardHeader>
      <CardContent>
        {steps[0]?.value === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de funil disponível
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => {
              const width = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
              const dropoff = index > 0 ? steps[index - 1].percentage - step.percentage : 0;
              
              return (
                <div key={step.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{step.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {step.value.toLocaleString()} visitantes
                      </span>
                      <span className="font-semibold text-primary">{step.percentage}%</span>
                      {dropoff > 0 && (
                        <span className="text-xs text-destructive">-{dropoff}%</span>
                      )}
                    </div>
                  </div>
                  <div className="h-10 bg-muted rounded-md overflow-hidden relative">
                    <div
                      className="h-full transition-all duration-500 rounded-md"
                      style={{ 
                        width: `${width}%`, 
                        backgroundColor: step.color,
                        minWidth: step.value > 0 ? '2px' : '0'
                      }}
                    />
                    <div 
                      className="absolute inset-0 flex items-center px-3"
                      style={{ color: width > 30 ? 'white' : 'inherit' }}
                    >
                      <span className="text-xs font-medium opacity-80">
                        {step.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Insights</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {steps[1]?.percentage < 50 && (
                  <li>• Alto abandono no início — considere melhorar a introdução</li>
                )}
                {steps[4]?.percentage > 0 && steps[5]?.percentage < steps[4]?.percentage * 0.2 && (
                  <li>• Poucos cliques no CTA — considere reposicionar ou melhorar o copy</li>
                )}
                {steps[4]?.percentage > 30 && (
                  <li>• Boa taxa de leitura completa ({steps[4].percentage}%)</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
