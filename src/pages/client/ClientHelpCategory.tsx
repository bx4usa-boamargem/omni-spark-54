import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Clock, ChevronRight, Rocket, TrendingUp, Compass, FileText, Zap, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  icon: string | null;
  order_index: number;
  header_gif_url: string | null;
}

const categoryInfo: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  'primeiros-passos': { label: 'Primeiros Passos', color: 'text-blue-600 dark:text-blue-400', icon: Rocket },
  'resultados': { label: 'Resultados & ROI', color: 'text-emerald-600 dark:text-emerald-400', icon: TrendingUp },
  'inteligencia': { label: 'Inteligência', color: 'text-purple-600 dark:text-purple-400', icon: Compass },
  'conteudo': { label: 'Conteúdo', color: 'text-orange-600 dark:text-orange-400', icon: FileText },
  'operacao': { label: 'Operação', color: 'text-slate-600 dark:text-slate-400', icon: Zap },
  'integracoes': { label: 'Integrações', color: 'text-cyan-600 dark:text-cyan-400', icon: Plug },
};

const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

export default function ClientHelpCategory() {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const { user } = useAuth();
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (category) {
      fetchArticles();
    }
  }, [user, category]);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('category', category)
        .eq('is_published', true)
        .eq('language', 'pt-BR')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const info = category ? categoryInfo[category] : null;
  const Icon = info?.icon || Rocket;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/client/help')}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para Ajuda
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-3 rounded-xl",
          info?.color === 'text-blue-600 dark:text-blue-400' && 'bg-blue-500/10',
          info?.color === 'text-emerald-600 dark:text-emerald-400' && 'bg-emerald-500/10',
          info?.color === 'text-purple-600 dark:text-purple-400' && 'bg-purple-500/10',
          info?.color === 'text-orange-600 dark:text-orange-400' && 'bg-orange-500/10',
          info?.color === 'text-slate-600 dark:text-slate-400' && 'bg-slate-500/10',
          info?.color === 'text-cyan-600 dark:text-cyan-400' && 'bg-cyan-500/10',
        )}>
          <Icon className={cn("h-8 w-8", info?.color)} />
        </div>
        <div>
          <h1 className={cn("text-2xl font-bold", info?.color)}>
            {info?.label || category}
          </h1>
          <p className="text-muted-foreground">
            {articles.length} {articles.length === 1 ? 'artigo' : 'artigos'}
          </p>
        </div>
      </div>

      {/* Articles List */}
      {articles.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-xl">
          <p className="text-muted-foreground">
            Nenhum artigo disponível nesta categoria ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => navigate(`/client/help/${article.slug}`)}
              className={cn(
                "group flex items-center justify-between p-4 rounded-xl border bg-card",
                "cursor-pointer transition-all duration-200",
                "hover:shadow-md hover:border-primary/20"
              )}
            >
              <div className="flex-1">
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{calculateReadingTime(article.content || '')} min de leitura</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
