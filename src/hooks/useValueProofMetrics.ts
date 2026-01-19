import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ValueProofMetrics {
  // Core metrics
  visits: number;
  visitsDelta: number | null; // % change vs previous period
  rankedKeywords: number;
  keywordsDelta: number | null;
  ctaClicks: number;
  clicksDelta: number | null;
  avgPosition: number | null;
  positionDelta: number | null; // negative is better (improved position)
  realLeads: number;
  leadsDelta: number | null;
  
  // Status indicators
  gscConnected: boolean;
  hasData: boolean;
}

interface UseValueProofMetricsReturn {
  metrics: ValueProofMetrics;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT_METRICS: ValueProofMetrics = {
  visits: 0,
  visitsDelta: null,
  rankedKeywords: 0,
  keywordsDelta: null,
  ctaClicks: 0,
  clicksDelta: null,
  avgPosition: null,
  positionDelta: null,
  realLeads: 0,
  leadsDelta: null,
  gscConnected: false,
  hasData: false,
};

export function useValueProofMetrics(blogId: string | undefined): UseValueProofMetricsReturn {
  const [metrics, setMetrics] = useState<ValueProofMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!blogId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Calculate date ranges (last 7 days vs previous 7 days)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      const currentStart = sevenDaysAgo.toISOString();
      const previousStart = fourteenDaysAgo.toISOString();
      const previousEnd = sevenDaysAgo.toISOString();

      // Fetch all data in parallel
      const [
        visitsResult,
        previousVisitsResult,
        gscConnectionResult,
        keywordsResult,
        previousKeywordsResult,
        positionResult,
        previousPositionResult,
        ctaClicksResult,
        previousCtaClicksResult,
        realLeadsResult,
        previousLeadsResult,
      ] = await Promise.all([
        // Current period visits (from articles view_count)
        supabase
          .from('articles')
          .select('view_count')
          .eq('blog_id', blogId)
          .eq('status', 'published'),
        
        // Previous period visits (from article_analytics for comparison)
        supabase
          .from('article_analytics')
          .select('id', { count: 'exact', head: true })
          .eq('blog_id', blogId)
          .gte('created_at', previousStart)
          .lt('created_at', previousEnd),
        
        // Check GSC connection
        supabase
          .from('gsc_connections')
          .select('id, is_active')
          .eq('blog_id', blogId)
          .eq('is_active', true)
          .maybeSingle(),
        
        // Current period ranked keywords (distinct queries)
        supabase
          .from('gsc_queries_history')
          .select('query')
          .eq('blog_id', blogId)
          .gte('date', sevenDaysAgo.toISOString().split('T')[0]),
        
        // Previous period ranked keywords
        supabase
          .from('gsc_queries_history')
          .select('query')
          .eq('blog_id', blogId)
          .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
          .lt('date', sevenDaysAgo.toISOString().split('T')[0]),
        
        // Current average position
        supabase
          .from('gsc_analytics_history')
          .select('position')
          .eq('blog_id', blogId)
          .gte('date', sevenDaysAgo.toISOString().split('T')[0]),
        
        // Previous average position
        supabase
          .from('gsc_analytics_history')
          .select('position')
          .eq('blog_id', blogId)
          .gte('date', fourteenDaysAgo.toISOString().split('T')[0])
          .lt('date', sevenDaysAgo.toISOString().split('T')[0]),
        
        // Current CTA clicks
        supabase
          .from('funnel_events')
          .select('id', { count: 'exact', head: true })
          .eq('blog_id', blogId)
          .eq('event_type', 'cta_click')
          .gte('created_at', currentStart),
        
        // Previous CTA clicks
        supabase
          .from('funnel_events')
          .select('id', { count: 'exact', head: true })
          .eq('blog_id', blogId)
          .eq('event_type', 'cta_click')
          .gte('created_at', previousStart)
          .lt('created_at', previousEnd),
        
        // Current real leads
        supabase
          .from('real_leads')
          .select('id', { count: 'exact', head: true })
          .eq('blog_id', blogId)
          .gte('created_at', currentStart),
        
        // Previous real leads
        supabase
          .from('real_leads')
          .select('id', { count: 'exact', head: true })
          .eq('blog_id', blogId)
          .gte('created_at', previousStart)
          .lt('created_at', previousEnd),
      ]);

      // Calculate visits
      const visits = visitsResult.data?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;
      const previousVisits = previousVisitsResult.count || 0;
      const visitsDelta = previousVisits > 0 
        ? Math.round(((visits - previousVisits) / previousVisits) * 100) 
        : visits > 0 ? 100 : null;

      // GSC connection status
      const gscConnected = !!gscConnectionResult.data?.is_active;

      // Calculate ranked keywords (unique queries)
      const uniqueKeywords = new Set(keywordsResult.data?.map(q => q.query) || []);
      const rankedKeywords = uniqueKeywords.size;
      const previousUniqueKeywords = new Set(previousKeywordsResult.data?.map(q => q.query) || []);
      const previousKeywordsCount = previousUniqueKeywords.size;
      const keywordsDelta = previousKeywordsCount > 0 
        ? Math.round(((rankedKeywords - previousKeywordsCount) / previousKeywordsCount) * 100)
        : rankedKeywords > 0 ? 100 : null;

      // Calculate average position
      const positions = positionResult.data?.map(p => Number(p.position)).filter(p => p > 0) || [];
      const avgPosition = positions.length > 0 
        ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
        : null;
      
      const previousPositions = previousPositionResult.data?.map(p => Number(p.position)).filter(p => p > 0) || [];
      const previousAvgPosition = previousPositions.length > 0
        ? previousPositions.reduce((a, b) => a + b, 0) / previousPositions.length
        : null;
      
      // Position delta (negative is improvement)
      const positionDelta = (avgPosition !== null && previousAvgPosition !== null)
        ? Math.round((avgPosition - previousAvgPosition) * 10) / 10
        : null;

      // CTA clicks
      const ctaClicks = ctaClicksResult.count || 0;
      const previousCtaClicks = previousCtaClicksResult.count || 0;
      const clicksDelta = previousCtaClicks > 0
        ? Math.round(((ctaClicks - previousCtaClicks) / previousCtaClicks) * 100)
        : ctaClicks > 0 ? 100 : null;

      // Real leads
      const realLeads = realLeadsResult.count || 0;
      const previousLeads = previousLeadsResult.count || 0;
      const leadsDelta = previousLeads > 0
        ? Math.round(((realLeads - previousLeads) / previousLeads) * 100)
        : realLeads > 0 ? 100 : null;

      const hasData = visits > 0 || rankedKeywords > 0 || ctaClicks > 0 || realLeads > 0;

      setMetrics({
        visits,
        visitsDelta,
        rankedKeywords,
        keywordsDelta,
        ctaClicks,
        clicksDelta,
        avgPosition,
        positionDelta,
        realLeads,
        leadsDelta,
        gscConnected,
        hasData,
      });
    } catch (err) {
      console.error('Error fetching value proof metrics:', err);
      setError('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}
