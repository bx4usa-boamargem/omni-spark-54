import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Eye, MousePointer, Clock, TrendingUp, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TEMPLATES, getTemplateById } from './templateData';

interface TemplateAnalyticsProps {
  blogId: string;
  currentTemplate: string;
}

interface TemplateStats {
  template_id: string;
  views: number;
  clicks: number;
  cta_clicks: number;
  avg_time_on_page: number;
  conversions: number;
}

export const TemplateAnalytics = ({ blogId, currentTemplate }: TemplateAnalyticsProps) => {
  const [stats, setStats] = useState<TemplateStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('template_analytics')
          .select('template_id, views, clicks, cta_clicks, avg_time_on_page, conversions')
          .eq('blog_id', blogId);
        
        if (error) throw error;
        
        // Aggregate by template
        const aggregated = (data || []).reduce((acc, curr) => {
          const existing = acc.find(a => a.template_id === curr.template_id);
          if (existing) {
            existing.views += curr.views || 0;
            existing.clicks += curr.clicks || 0;
            existing.cta_clicks += curr.cta_clicks || 0;
            existing.avg_time_on_page = (existing.avg_time_on_page + (curr.avg_time_on_page || 0)) / 2;
            existing.conversions += curr.conversions || 0;
          } else {
            acc.push({
              template_id: curr.template_id,
              views: curr.views || 0,
              clicks: curr.clicks || 0,
              cta_clicks: curr.cta_clicks || 0,
              avg_time_on_page: curr.avg_time_on_page || 0,
              conversions: curr.conversions || 0,
            });
          }
          return acc;
        }, [] as TemplateStats[]);
        
        setStats(aggregated);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [blogId]);
  
  const currentStats = stats.find(s => s.template_id === currentTemplate);
  const maxViews = Math.max(...stats.map(s => s.views), 1);
  
  // Calculate CTR for each template
  const templatesWithCTR = stats.map(s => ({
    ...s,
    ctr: s.views > 0 ? (s.cta_clicks / s.views) * 100 : 0,
  })).sort((a, b) => b.ctr - a.ctr);
  
  const recommendedTemplate = templatesWithCTR[0];
  const hasData = stats.length > 0 && stats.some(s => s.views > 0);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Current Template Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance do Template Atual
          </CardTitle>
          <CardDescription>
            Template: <strong>{getTemplateById(currentTemplate)?.name || currentTemplate}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStats && currentStats.views > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">Views</span>
                </div>
                <div className="text-2xl font-bold">{currentStats.views.toLocaleString()}</div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <MousePointer className="h-4 w-4" />
                  <span className="text-sm">CTR</span>
                </div>
                <div className="text-2xl font-bold">
                  {currentStats.views > 0 
                    ? ((currentStats.cta_clicks / currentStats.views) * 100).toFixed(1) 
                    : 0}%
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Tempo médio</span>
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(currentStats.avg_time_on_page)}s
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Conversões</span>
                </div>
                <div className="text-2xl font-bold">{currentStats.conversions}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ainda não há dados de analytics para este template.</p>
              <p className="text-sm">Os dados aparecerão conforme os visitantes acessarem seu blog.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recommendation */}
      {hasData && recommendedTemplate && recommendedTemplate.template_id !== currentTemplate && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="h-6 w-6 text-amber-500" />
                <div>
                  <h3 className="font-semibold">Recomendação</h3>
                  <p className="text-sm text-muted-foreground">
                    O template "{getTemplateById(recommendedTemplate.template_id)?.name}" tem 
                    CTR {((recommendedTemplate.ctr / (currentStats?.views ? (currentStats.cta_clicks / currentStats.views) * 100 : 1)) * 100 - 100).toFixed(0)}% 
                    maior que o atual!
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Testar Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Templates</CardTitle>
          <CardDescription>
            Compare a performance entre os templates que você já utilizou
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <div className="space-y-4">
              {templatesWithCTR.map((stat, index) => {
                const template = getTemplateById(stat.template_id);
                const isCurrent = stat.template_id === currentTemplate;
                
                return (
                  <div 
                    key={stat.template_id}
                    className={`p-4 rounded-lg border ${isCurrent ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template?.name || stat.template_id}</span>
                        {isCurrent && <Badge>Atual</Badge>}
                        {index === 0 && stat.ctr > 0 && <Badge className="bg-amber-500">Melhor CTR</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{stat.views.toLocaleString()} views</span>
                        <span>{stat.ctr.toFixed(1)}% CTR</span>
                        <span>{stat.conversions} conv.</span>
                      </div>
                    </div>
                    <Progress value={(stat.views / maxViews) * 100} className="h-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum dado de comparação disponível ainda.</p>
              <p className="text-sm">Use diferentes templates para ver a comparação de performance.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Como melhorar suas métricas:</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Teste diferentes templates por pelo menos 1 semana cada</li>
                <li>Templates com hero split tendem a ter melhor CTR</li>
                <li>Layouts minimalistas geralmente têm maior tempo de leitura</li>
                <li>Templates por nicho são otimizados para seu segmento específico</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
