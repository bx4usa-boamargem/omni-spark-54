import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface ArticleTranslation {
  id: string;
  article_id: string;
  language_code: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  meta_description: string | null;
  faq: any;
  translated_at: string;
  translated_by: string;
  is_reviewed: boolean;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' }
];

export function useArticleTranslations(articleId: string | undefined) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [translatingLanguages, setTranslatingLanguages] = useState<string[]>([]);

  const { data: translations, isLoading } = useQuery({
    queryKey: ['article-translations', articleId],
    queryFn: async () => {
      if (!articleId) return [];
      
      const { data, error } = await supabase
        .from('article_translations')
        .select('*')
        .eq('article_id', articleId);

      if (error) throw error;
      return data as ArticleTranslation[];
    },
    enabled: !!articleId
  });

  const translateMutation = useMutation({
    mutationFn: async (targetLanguages: string[]) => {
      if (!articleId) throw new Error('Article ID is required');
      
      setTranslatingLanguages(targetLanguages);
      
      const { data, error } = await supabase.functions.invoke('translate-article', {
        body: { article_id: articleId, target_languages: targetLanguages }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setTranslatingLanguages([]);
      queryClient.invalidateQueries({ queryKey: ['article-translations', articleId] });
      
      const successCount = Object.values(data.results).filter((r: any) => r.success).length;
      const failCount = Object.values(data.results).filter((r: any) => !r.success).length;
      
      if (successCount > 0 && failCount === 0) {
        toast.success(t('translations.translationSuccess'));
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`${successCount} tradução(ões) com sucesso, ${failCount} falha(s)`);
      } else {
        toast.error(t('translations.translationFailed'));
      }
    },
    onError: (error) => {
      setTranslatingLanguages([]);
      console.error('Translation error:', error);
      toast.error(t('translations.translationFailed'));
    }
  });

  const getTranslation = (languageCode: string): ArticleTranslation | undefined => {
    return translations?.find(t => t.language_code === languageCode);
  };

  const getAvailableLanguages = (): string[] => {
    return translations?.map(t => t.language_code) || [];
  };

  const isLanguageTranslated = (languageCode: string): boolean => {
    return translations?.some(t => t.language_code === languageCode) || false;
  };

  const isLanguageTranslating = (languageCode: string): boolean => {
    return translatingLanguages.includes(languageCode);
  };

  return {
    translations,
    isLoading,
    translateMutation,
    getTranslation,
    getAvailableLanguages,
    isLanguageTranslated,
    isLanguageTranslating,
    translatingLanguages
  };
}

export function usePublicArticleTranslation(articleId: string | undefined, languageCode: string) {
  return useQuery({
    queryKey: ['public-article-translation', articleId, languageCode],
    queryFn: async () => {
      if (!articleId || languageCode === 'pt-BR') return null;
      
      console.log('Fetching translation for article:', articleId, 'language:', languageCode);
      
      const { data, error } = await supabase
        .from('article_translations')
        .select('*')
        .eq('article_id', articleId)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (error) {
        console.error('Translation fetch error:', error);
        return null;
      }
      
      console.log('Translation result:', data ? 'Found' : 'Not found');
      return data as ArticleTranslation | null;
    },
    enabled: !!articleId && languageCode !== 'pt-BR',
    staleTime: 5 * 60 * 1000
  });
}
