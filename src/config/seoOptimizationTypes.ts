import { Type, FileText, Hash, AlignLeft, Search, Image, LucideIcon } from 'lucide-react';
import { SEOScoreResult } from '@/utils/seoScore';

export type OptimizationType = 'title' | 'meta' | 'keywords' | 'content' | 'density' | 'image';

export interface OptimizationConfig {
  label: string;
  description: string;
  icon: LucideIcon;
  improvements: string[];
  field: string;
}

export interface ArticleSEO {
  id: string;
  title: string;
  meta_description: string | null;
  content: string | null;
  keywords: string[] | null;
  featured_image_url: string | null;
}

export interface OptimizationSuggestion {
  articleId: string;
  articleTitle: string;
  originalValue: string;
  suggestedValue: string;
  improvement: string;
  predictedImpact: 'high' | 'medium' | 'low';
  selected: boolean;
}

export const SEO_OPTIMIZATION_TYPES: Record<OptimizationType, OptimizationConfig> = {
  title: {
    label: 'Títulos',
    description: 'Reescrever títulos fracos para melhor CTR',
    icon: Type,
    improvements: [
      'Incluir palavra-chave principal',
      'Ajustar para 50-60 caracteres',
      'Tornar mais atraente e clicável'
    ],
    field: 'title'
  },
  meta: {
    label: 'Descrições',
    description: 'Criar meta descriptions persuasivas',
    icon: FileText,
    improvements: [
      'Criar descrições com 140-160 caracteres',
      'Incluir keyword naturalmente',
      'Adicionar chamada para ação'
    ],
    field: 'meta_description'
  },
  keywords: {
    label: 'Palavras-chave',
    description: 'Sugerir keywords estratégicas',
    icon: Hash,
    improvements: [
      'Sugerir 3-5 keywords por artigo',
      'Baseadas em SEO real',
      'Compatíveis com conteúdo existente'
    ],
    field: 'keywords'
  },
  content: {
    label: 'Conteúdo',
    description: 'Expandir artigos fracos',
    icon: AlignLeft,
    improvements: [
      'Adicionar seções H2/H3',
      'Expandir para 1500+ palavras',
      'Melhorar clareza e profundidade'
    ],
    field: 'content'
  },
  density: {
    label: 'Densidade',
    description: 'Otimizar distribuição de keywords',
    icon: Search,
    improvements: [
      'Ajustar densidade para 0.5%-2.5%',
      'Evitar keyword stuffing',
      'Distribuir naturalmente no texto'
    ],
    field: 'content'
  },
  image: {
    label: 'Imagens',
    description: 'Gerar imagens de destaque',
    icon: Image,
    improvements: [
      'Gerar imagens ausentes',
      'Criar prompts otimizados',
      'Regenerar imagens fracas'
    ],
    field: 'featured_image_url'
  }
};

export function filterArticlesForOptimization(
  articles: ArticleSEO[],
  type: OptimizationType,
  scoreDetails: Map<string, SEOScoreResult['details']>
): ArticleSEO[] {
  return articles.filter(article => {
    const details = scoreDetails.get(article.id);
    if (!details) return false;

    switch (type) {
      case 'title':
        return details.title.score < details.title.max * 0.8 || 
               article.title.length < 30 || 
               article.title.length > 70;
      case 'meta':
        return details.meta.score < details.meta.max * 0.8 || 
               !article.meta_description || 
               article.meta_description.length < 100;
      case 'keywords':
        return !article.keywords || article.keywords.length < 3;
      case 'content':
        const wordCount = (article.content || '').split(/\s+/).filter(w => w.length > 0).length;
        return details.content.score < details.content.max * 0.8 || wordCount < 800;
      case 'density':
        return details.density.score < details.density.max * 0.8;
      case 'image':
        return !article.featured_image_url;
      default:
        return false;
    }
  });
}
