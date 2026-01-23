import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════
// Content Score Types - Motor Editorial Orientado por Mercado
// ═══════════════════════════════════════════════════════════════════

export interface ScoreBreakdown {
  wordProximity: {
    score: number;
    value: number;
    target: number;
    status: 'below' | 'within' | 'above';
  };
  h2Coverage: {
    score: number;
    value: number;
    target: number;
    status: 'below' | 'within' | 'above';
  };
  semanticCoverage: {
    score: number;
    percentage: number;
    covered: string[];
    missing: string[];
  };
  introQuality: {
    score: number;
    hasAnswerFirst: boolean;
  };
  propositionClarity: {
    score: number;
    hasCTA: boolean;
  };
  thematicDepth: {
    score: number;
    coveredTopics: string[];
  };
  visualOrganization: {
    score: number;
    images: number;
    lists: number;
  };
}

export interface MarketComparison {
  words: { article: number; market: number; diff: number; diffPercent: number };
  h2: { article: number; market: number; diff: number; diffPercent: number };
  paragraphs: { article: number; market: number; diff: number; diffPercent: number };
  images: { article: number; market: number; diff: number; diffPercent: number };
}

export interface ContentScore {
  total: number;
  breakdown: ScoreBreakdown;
  comparison: MarketComparison;
  recommendations: string[];
  meetsMarketStandards: boolean;
  serpAnalyzed: boolean;
}

export interface SERPMatrix {
  keyword: string;
  territory: string | null;
  analyzedAt: string;
  averages: {
    avgWords: number;
    avgH2: number;
    avgH3: number;
    avgParagraphs: number;
    avgImages: number;
    avgLists: number;
  };
  commonTerms: string[];
  topTitles: string[];
  contentGaps: string[];
  // V3.2: Local governance fields
  effectiveKeyword?: string;
  subaccountContext?: {
    companyName: string;
    primaryService: string;
    city: string;
    nicheSlug: string;
  };
}

interface NicheInfo {
  id: string;
  name: string;
  displayName: string;
  minScore: number;
  floorApplied: boolean;
}

interface ArticleLockStatus {
  nicheLocked: boolean;
  scoreLocked: boolean;
  lastScoreChangeReason: string | null;
  nicheProfileId: string | null;
}

interface ScoreChangeLogEntry {
  id: string;
  old_score: number;
  new_score: number;
  change_reason: string;
  triggered_by: string;
  created_at: string;
}

interface UseContentScoreReturn {
  score: ContentScore | null;
  serpMatrix: SERPMatrix | null;
  nicheInfo: NicheInfo | null;
  lockStatus: ArticleLockStatus | null;
  scoreHistory: ScoreChangeLogEntry[];
  loading: boolean;
  analyzing: boolean;
  optimizing: boolean;
  serpAnalysisId: string | null;
  // V3.1: Contexto da subconta local (entidade raiz)
  businessContext: BusinessContext | null;
  
  // Actions
  analyzeSERP: (forceRefresh?: boolean) => Promise<void>;
  calculateScore: (userInitiated?: boolean) => Promise<void>;
  optimizeForSERP: () => Promise<string | null>;
  boostScore: (targetScore?: number) => Promise<string | null>;
  refresh: () => Promise<void>;
  reprocessWithCustomCompetitors: (selectedUrls: string[], customUrls: string[]) => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════
// V3.1: CONTEXTO DA SUBCONTA LOCAL
// REGRA-MÃE: "A Omniseen não compete. Quem compete é o cliente."
// ═══════════════════════════════════════════════════════════════════
interface BusinessContext {
  companyName: string;
  niche: string;
  city: string;
}

export function useContentScore(
  articleId: string | undefined,
  content: string,
  title: string,
  keyword: string,
  blogId: string
): UseContentScoreReturn {
  const [score, setScore] = useState<ContentScore | null>(null);
  const [serpMatrix, setSerpMatrix] = useState<SERPMatrix | null>(null);
  const [serpAnalysisId, setSerpAnalysisId] = useState<string | null>(null);
  const [nicheInfo, setNicheInfo] = useState<NicheInfo | null>(null);
  const [lockStatus, setLockStatus] = useState<ArticleLockStatus | null>(null);
  const [scoreHistory, setScoreHistory] = useState<ScoreChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  
  // V3.1: Contexto da subconta local (entidade raiz)
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);

  // V3.2: Fetch business context (company, niche from services, city)
  useEffect(() => {
    if (!blogId) return;
    
    const fetchBusinessContext = async () => {
      try {
        // First try business_profile - include services for precise niche detection
        const { data: bp } = await supabase
          .from('business_profile')
          .select('company_name, niche, city, services')
          .eq('blog_id', blogId)
          .single();
        
        if (bp) {
          // V3.2: Extract first service as primary niche (more precise than generic niche)
          let primaryNiche = bp.niche || 'Geral';
          
          if (bp.services) {
            let servicesList: string[] = [];
            if (typeof bp.services === 'string') {
              servicesList = (bp.services as string).split(',').map(s => s.trim()).filter(s => s.length > 0);
            } else if (Array.isArray(bp.services)) {
              servicesList = (bp.services as string[]).filter(s => typeof s === 'string' && s.length > 0);
            }
            
            if (servicesList.length > 0) {
              primaryNiche = servicesList[0];  // Use first service as primary niche
            }
          }
          
          setBusinessContext({
            companyName: bp.company_name || 'Sua Empresa',
            niche: primaryNiche,
            city: bp.city || ''
          });
          return;
        }
      } catch {
        // Fallback to blog data
      }
      
      // Fallback: try to get niche from blog
      try {
        const { data: blog } = await supabase
          .from('blogs')
          .select('name, niche_profile_id, niche_profiles(display_name, slug)')
          .eq('id', blogId)
          .single();
        
        if (blog) {
          const nicheProfile = blog.niche_profiles as { display_name?: string; slug?: string } | null;
          setBusinessContext({
            companyName: blog.name || 'Sua Empresa',
            niche: nicheProfile?.display_name || nicheProfile?.slug || 'Geral',
            city: ''
          });
        }
      } catch {
        // Fallback to defaults
        setBusinessContext({
          companyName: 'Sua Empresa',
          niche: 'Geral',
          city: ''
        });
      }
    };
    
    fetchBusinessContext();
  }, [blogId]);

  // Fetch score change history
  const fetchScoreHistory = useCallback(async () => {
    if (!articleId) return;
    
    try {
      const { data: history } = await supabase
        .from('score_change_log')
        .select('id, old_score, new_score, change_reason, triggered_by, created_at')
        .eq('article_id', articleId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (history) {
        setScoreHistory(history);
      }
    } catch (error) {
      console.error('Error fetching score history:', error);
    }
  }, [articleId]);

  // Fetch article lock status
  const fetchLockStatus = useCallback(async () => {
    if (!articleId) return;
    
    try {
      const { data: article } = await supabase
        .from('articles')
        .select('niche_locked, score_locked, last_score_change_reason, niche_profile_id')
        .eq('id', articleId)
        .single();
      
      if (article) {
        setLockStatus({
          nicheLocked: article.niche_locked ?? true,
          scoreLocked: article.score_locked ?? true,
          lastScoreChangeReason: article.last_score_change_reason,
          nicheProfileId: article.niche_profile_id
        });
      }
    } catch (error) {
      console.error('Error fetching lock status:', error);
    }
  }, [articleId]);

  // Fetch existing score and SERP data from database
  const fetchExistingData = useCallback(async () => {
    if (!articleId || !blogId) return;

    setLoading(true);
    try {
      // Fetch existing content score from article_content_scores table
      const { data: scoreData } = await supabase
        .from('article_content_scores')
        .select('*, serp_analysis_cache(*)')
        .eq('article_id', articleId)
        .single();

      if (scoreData) {
        setScore({
          total: scoreData.total_score,
          breakdown: scoreData.breakdown as unknown as ScoreBreakdown,
          comparison: scoreData.comparison as unknown as MarketComparison,
          recommendations: (scoreData.recommendations as unknown as string[]) || [],
          meetsMarketStandards: scoreData.meets_market_standards || false,
          serpAnalyzed: !!scoreData.serp_analysis_id
        });

        const serpCache = scoreData.serp_analysis_cache as { matrix: unknown; id: string } | null;
        if (serpCache) {
          setSerpMatrix(serpCache.matrix as SERPMatrix);
          setSerpAnalysisId(scoreData.serp_analysis_id);
        }
      }
    } catch (error) {
      console.error('Error fetching content score:', error);
    } finally {
      setLoading(false);
    }
  }, [articleId, blogId]);

  // Initial data fetch
  useEffect(() => {
    fetchExistingData();
  }, [fetchExistingData]);

  // Realtime subscription for score updates
  useEffect(() => {
    if (!articleId) return;

    const channel = supabase
      .channel(`content-score-${articleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'article_content_scores',
          filter: `article_id=eq.${articleId}`
        },
        (payload) => {
          console.log('Content score updated via realtime:', payload);
          // Refetch full data to ensure consistency
          fetchExistingData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [articleId, fetchExistingData]);

  // Analyze SERP for keyword - V3.0: Always use Firecrawl + forceRefresh option
  const analyzeSERP = useCallback(async (forceRefresh = false) => {
    if (!keyword || !blogId) {
      toast({
        title: 'Erro',
        description: 'Keyword e blogId são necessários',
        variant: 'destructive'
      });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-serp', {
        body: { 
          keyword, 
          blogId, 
          forceRefresh,         // V3.0: Allow forcing refresh
          useFirecrawl: true    // V3.0: Always use Firecrawl for real scraping
        }
      });

      if (error) throw error;

      if (data?.matrix) {
        setSerpMatrix(data.matrix);
        setSerpAnalysisId(data.serpAnalysisId);
        
        const competitorsCount = data.matrix.competitors?.length || 0;
        const scrapeMethod = data.matrix.scrapeMethod || 'unknown';
        
        toast({
          title: 'Análise SERP concluída',
          description: data.cached 
            ? 'Usando análise em cache' 
            : `${competitorsCount} concorrentes analisados (${scrapeMethod})`
        });
      }
    } catch (error) {
      console.error('SERP analysis error:', error);
      toast({
        title: 'Erro na análise SERP',
        description: 'Não foi possível analisar a concorrência',
        variant: 'destructive'
      });
    } finally {
      setAnalyzing(false);
    }
  }, [keyword, blogId]);

  // Calculate content score
  // V2.0: userInitiated flag controls whether score can decrease
  const calculateScore = useCallback(async (userInitiated = false) => {
    if (!content || !keyword || !blogId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-content-score', {
        body: {
          articleId,
          title,
          content,
          keyword,
          blogId,
          serpAnalysisId,
          saveScore: !!articleId,
          userInitiated  // V2.0: Pass user intent to control score stability
        }
      });

      if (error) throw error;

      if (data?.score) {
        setScore(data.score);
        if (data.serpAnalysisId) {
          setSerpAnalysisId(data.serpAnalysisId);
        }
        if (data.nicheProfile) {
          setNicheInfo({
            id: data.nicheProfile.id,
            name: data.nicheProfile.name,
            displayName: data.nicheProfile.displayName || data.nicheProfile.name,
            minScore: data.nicheProfile.minScore,
            floorApplied: data.nicheProfile.floorApplied || false
          });
        }
        
        // Show message if score was blocked
        if (data.scoreBlocked) {
          toast({
            title: 'Score estável',
            description: 'O score não foi alterado para manter a estabilidade. Clique em "Recalcular" para atualizar manualmente.',
          });
        }
        
        // Refresh lock status and history after score calculation
        fetchLockStatus();
        fetchScoreHistory();
      }
    } catch (error) {
      console.error('Score calculation error:', error);
      toast({
        title: 'Erro ao calcular score',
        description: 'Não foi possível calcular a pontuação',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [articleId, title, content, keyword, blogId, serpAnalysisId, fetchLockStatus, fetchScoreHistory]);

  // Optimize content for SERP
  const optimizeForSERP = useCallback(async (): Promise<string | null> => {
    if (!content || !keyword || !blogId) return null;

    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('boost-content-score', {
        body: {
          articleId,
          content,
          title,
          keyword,
          blogId,
          optimizationType: 'terms'
        }
      });

      if (error) throw error;

      if (data?.optimized && data?.content) {
        // Reload full score from database to ensure consistency
        await fetchExistingData();
        
        toast({
          title: 'Conteúdo otimizado',
          description: `Score aumentou de ${data.previousScore} para ${data.newScore}`
        });
        
        return data.content;
      }

      return null;
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: 'Erro na otimização',
        description: 'Não foi possível otimizar o conteúdo',
        variant: 'destructive'
      });
      return null;
    } finally {
      setOptimizing(false);
    }
  }, [articleId, content, title, keyword, blogId, fetchExistingData]);

  // Boost score to target
  const boostScore = useCallback(async (targetScore = 80): Promise<string | null> => {
    if (!content || !keyword || !blogId) return null;

    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('boost-content-score', {
        body: {
          articleId,
          content,
          title,
          keyword,
          blogId,
          targetScore,
          optimizationType: 'full'
        }
      });

      if (error) throw error;

      if (data?.optimized && data?.content) {
        // Reload full score from database to ensure consistency
        await fetchExistingData();
        
        toast({
          title: 'Score aumentado!',
          description: `De ${data.previousScore} para ${data.newScore} (+${data.scoreIncrease})`
        });
        
        return data.content;
      } else if (!data?.optimized) {
        toast({
          title: 'Já no alvo',
          description: 'O artigo já atinge a pontuação desejada'
        });
      }

      return null;
    } catch (error) {
      console.error('Boost error:', error);
      toast({
        title: 'Erro ao aumentar score',
        description: 'Não foi possível otimizar o conteúdo',
        variant: 'destructive'
      });
      return null;
    } finally {
      setOptimizing(false);
    }
  }, [articleId, content, title, keyword, blogId, fetchExistingData]);

  // V3.0: Reprocess SERP with custom competitor URLs
  const reprocessWithCustomCompetitors = useCallback(async (
    selectedUrls: string[],
    customUrls: string[]
  ) => {
    if (!keyword || !blogId) return;

    setAnalyzing(true);
    try {
      const allUrls = [...selectedUrls, ...customUrls];
      
      const { data, error } = await supabase.functions.invoke('analyze-serp', {
        body: {
          keyword,
          territory: serpMatrix?.territory || null,
          blogId,
          forceRefresh: true,
          useFirecrawl: true,
          customCompetitorUrls: allUrls  // V3.0: Custom URLs
        }
      });

      if (error) throw error;

      if (data?.matrix) {
        setSerpMatrix(data.matrix);
        setSerpAnalysisId(data.serpAnalysisId);
        
        // Recalculate score with new SERP data
        await calculateScore(true);
        
        toast({
          title: 'Concorrentes atualizados!',
          description: `${data.matrix.competitors?.length || 0} concorrentes analisados e score recalculado`
        });
      }
    } catch (error) {
      console.error('Custom competitor reprocess error:', error);
      toast({
        title: 'Erro ao reprocessar',
        description: 'Não foi possível analisar os concorrentes selecionados',
        variant: 'destructive'
      });
    } finally {
      setAnalyzing(false);
    }
  }, [keyword, blogId, serpMatrix?.territory, calculateScore]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await analyzeSERP(true);  // V3.0: Force refresh on manual refresh
    await calculateScore(true); // User-initiated refresh
  }, [analyzeSERP, calculateScore]);

  // Initial fetch of lock status and history
  useEffect(() => {
    fetchLockStatus();
    fetchScoreHistory();
  }, [fetchLockStatus, fetchScoreHistory]);

  return {
    score,
    serpMatrix,
    nicheInfo,
    lockStatus,
    scoreHistory,
    loading,
    analyzing,
    optimizing,
    serpAnalysisId,
    businessContext,  // V3.1: Contexto da subconta local
    analyzeSERP,
    calculateScore,
    optimizeForSERP,
    boostScore,
    refresh,
    reprocessWithCustomCompetitors
  };
}
