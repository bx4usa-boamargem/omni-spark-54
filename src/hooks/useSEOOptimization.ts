import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  OptimizationType, 
  ArticleSEO, 
  OptimizationSuggestion, 
  filterArticlesForOptimization,
  SEO_OPTIMIZATION_TYPES 
} from '@/config/seoOptimizationTypes';
import { calculateSEOScore, SEOScoreResult } from '@/utils/seoScore';
import { toast } from 'sonner';

export type OptimizationPhase = 'idle' | 'analyzing' | 'generating' | 'ready' | 'applying' | 'complete';

export interface OptimizationProgress {
  current: number;
  total: number;
  message: string;
}

export function useSEOOptimization() {
  const [phase, setPhase] = useState<OptimizationPhase>('idle');
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [progress, setProgress] = useState<OptimizationProgress>({ current: 0, total: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [articlesToFix, setArticlesToFix] = useState<ArticleSEO[]>([]);

  const analyze = useCallback(async (
    type: OptimizationType,
    articles: ArticleSEO[],
    blogId: string,
    userId: string
  ) => {
    setPhase('analyzing');
    setError(null);
    setSuggestions([]);
    
    try {
      // Calculate scores for all articles
      const scoreDetails = new Map<string, SEOScoreResult['details']>();
      articles.forEach(article => {
        const score = calculateSEOScore({
          title: article.title,
          metaDescription: article.meta_description || '',
          content: article.content,
          keywords: article.keywords || [],
          featuredImage: article.featured_image_url
        });
        scoreDetails.set(article.id, score.details);
      });

      // Filter articles that need improvement
      const filtered = filterArticlesForOptimization(articles, type, scoreDetails);
      setArticlesToFix(filtered);
      
      if (filtered.length === 0) {
        setPhase('idle');
        toast.info(`Todos os ${SEO_OPTIMIZATION_TYPES[type].label.toLowerCase()} já estão otimizados!`);
        return;
      }

      setProgress({ 
        current: 0, 
        total: filtered.length, 
        message: `Analisando ${filtered.length} artigos...` 
      });
      
      setPhase('generating');
      setProgress({ 
        current: 0, 
        total: filtered.length, 
        message: 'Gerando sugestões com IA...' 
      });

      // Call edge function to generate suggestions
      const { data, error: fnError } = await supabase.functions.invoke('batch-seo-suggestions', {
        body: { 
          type, 
          articles: filtered.map(a => ({
            id: a.id,
            title: a.title,
            meta_description: a.meta_description,
            content: a.content?.substring(0, 5000), // Limit content size
            keywords: a.keywords
          })),
          blog_id: blogId,
          user_id: userId
        }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao gerar sugestões');
      }

      if (!data?.suggestions || data.suggestions.length === 0) {
        setPhase('idle');
        toast.info('Nenhuma sugestão de melhoria encontrada.');
        return;
      }

      const mappedSuggestions: OptimizationSuggestion[] = data.suggestions.map((s: any) => ({
        articleId: s.articleId,
        articleTitle: filtered.find(a => a.id === s.articleId)?.title || 'Artigo',
        originalValue: s.originalValue || '',
        suggestedValue: s.suggestedValue || '',
        improvement: s.improvement || '',
        predictedImpact: s.predictedImpact || 'medium',
        selected: true
      }));

      setSuggestions(mappedSuggestions);
      setPhase('ready');
      setProgress({ 
        current: mappedSuggestions.length, 
        total: mappedSuggestions.length, 
        message: `${mappedSuggestions.length} sugestões geradas!` 
      });

    } catch (err) {
      console.error('SEO optimization error:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setPhase('idle');
      toast.error('Erro ao analisar artigos');
    }
  }, []);

  const toggleSuggestion = useCallback((articleId: string) => {
    setSuggestions(prev => 
      prev.map(s => 
        s.articleId === articleId ? { ...s, selected: !s.selected } : s
      )
    );
  }, []);

  const selectAll = useCallback((selected: boolean) => {
    setSuggestions(prev => prev.map(s => ({ ...s, selected })));
  }, []);

  const apply = useCallback(async (type: OptimizationType) => {
    const selectedSuggestions = suggestions.filter(s => s.selected);
    
    if (selectedSuggestions.length === 0) {
      toast.warning('Selecione pelo menos uma sugestão para aplicar');
      return;
    }

    setPhase('applying');
    const field = SEO_OPTIMIZATION_TYPES[type].field;
    let applied = 0;

    for (const suggestion of selectedSuggestions) {
      setProgress({
        current: applied + 1,
        total: selectedSuggestions.length,
        message: `Aplicando: ${suggestion.articleTitle.substring(0, 40)}...`
      });

      try {
        const updateData: Record<string, any> = {};
        
        if (type === 'keywords') {
          // Keywords are stored as array
          updateData[field] = suggestion.suggestedValue.split(',').map(k => k.trim());
        } else {
          updateData[field] = suggestion.suggestedValue;
        }

        const { error: updateError } = await supabase
          .from('articles')
          .update(updateData)
          .eq('id', suggestion.articleId);

        if (updateError) {
          console.error('Error updating article:', updateError);
        } else {
          applied++;
        }
      } catch (err) {
        console.error('Error applying suggestion:', err);
      }
    }

    setPhase('complete');
    setProgress({
      current: applied,
      total: selectedSuggestions.length,
      message: `${applied} artigos otimizados!`
    });
    
    toast.success(`${applied} ${applied === 1 ? 'artigo otimizado' : 'artigos otimizados'} com sucesso!`);
  }, [suggestions]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSuggestions([]);
    setProgress({ current: 0, total: 0, message: '' });
    setError(null);
    setArticlesToFix([]);
  }, []);

  return {
    phase,
    suggestions,
    progress,
    error,
    articlesToFix,
    analyze,
    apply,
    toggleSuggestion,
    selectAll,
    reset
  };
}
