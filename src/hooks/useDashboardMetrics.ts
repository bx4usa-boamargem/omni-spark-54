import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';

export interface DashboardMetrics {
  totalArticles: number;
  totalArticlesDelta: number;
  publishedArticles: number;
  publishedDelta: number;
  totalViews: number;
  viewsDelta: number;
  leadsGenerated: number;
  leadsDelta: number;
  aiCostMonth: number;
  loading: boolean;
  error: string | null;
}

export function useDashboardMetrics(blogId: string | undefined) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalArticles: 0,
    totalArticlesDelta: 0,
    publishedArticles: 0,
    publishedDelta: 0,
    totalViews: 0,
    viewsDelta: 0,
    leadsGenerated: 0,
    leadsDelta: 0,
    aiCostMonth: 0,
    loading: true,
    error: null,
  });

  const fetchMetrics = useCallback(async () => {
    if (!blogId) {
      setMetrics(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));

      // Fetch all articles for this blog
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('id, status, view_count, created_at')
        .eq('blog_id', blogId);

      if (articlesError) throw articlesError;

      // Calculate article metrics
      const totalArticles = articles?.length || 0;
      const publishedArticles = articles?.filter(a => a.status === 'published').length || 0;
      const totalViews = articles?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;

      // Calculate deltas (current month vs previous month)
      const currentMonthArticles = articles?.filter(a => 
        new Date(a.created_at) >= currentMonthStart
      ).length || 0;
      
      const previousMonthArticles = articles?.filter(a => {
        const date = new Date(a.created_at);
        return date >= previousMonthStart && date <= previousMonthEnd;
      }).length || 0;

      const totalArticlesDelta = previousMonthArticles > 0 
        ? Math.round(((currentMonthArticles - previousMonthArticles) / previousMonthArticles) * 100)
        : currentMonthArticles > 0 ? 100 : 0;

      // Fetch leads
      const { count: leadsCount, error: leadsError } = await supabase
        .from('real_leads')
        .select('*', { count: 'exact', head: true })
        .eq('blog_id', blogId);

      if (leadsError) throw leadsError;

      const leadsGenerated = leadsCount || 0;

      // Fetch AI costs for current month
      const { data: aiLogs, error: aiError } = await supabase
        .from('ai_usage_logs')
        .select('cost_usd')
        .eq('blog_id', blogId)
        .gte('created_at', currentMonthStart.toISOString());

      // AI logs might fail due to RLS - handle gracefully
      const aiCostMonth = aiError ? 0 : (aiLogs?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0);

      setMetrics({
        totalArticles,
        totalArticlesDelta,
        publishedArticles,
        publishedDelta: totalArticlesDelta, // Using same delta for simplicity
        totalViews,
        viewsDelta: 0, // Would need historical data to calculate
        leadsGenerated,
        leadsDelta: 0,
        aiCostMonth,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      setMetrics(prev => ({
        ...prev,
        loading: false,
        error: 'Erro ao carregar métricas',
      }));
    }
  }, [blogId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { ...metrics, refetch: fetchMetrics };
}
