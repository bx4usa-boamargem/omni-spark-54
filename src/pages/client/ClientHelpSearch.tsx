import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, Search, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
}

const categoryInfo: Record<string, { label: string; color: string; bgColor: string }> = {
  'primeiros-passos': { label: 'Primeiros Passos', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  'resultados': { label: 'Resultados & ROI', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  'inteligencia': { label: 'Inteligência', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  'conteudo': { label: 'Conteúdo', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  'operacao': { label: 'Operação', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-900/30' },
  'integracoes': { label: 'Integrações', color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
};

const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

export default function ClientHelpSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (initialQuery) {
      searchArticles(initialQuery);
    } else {
      setLoading(false);
    }
  }, [user, initialQuery]);

  const searchArticles = async (searchQuery: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('is_published', true)
        .eq('language', 'pt-BR')
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error searching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/client/help/search?q=${encodeURIComponent(query)}`);
      searchArticles(query);
    }
  };

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

      {/* Search Form */}
      <form onSubmit={handleSearch} className="max-w-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar artigos de ajuda..."
            className="pl-12 h-12 text-base rounded-xl border-2 focus:border-primary"
          />
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <p className="text-muted-foreground">
            {results.length > 0 
              ? `${results.length} resultado${results.length > 1 ? 's' : ''} para "${initialQuery}"`
              : initialQuery 
                ? `Nenhum resultado encontrado para "${initialQuery}"`
                : 'Digite algo para buscar'
            }
          </p>

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((article) => {
                const info = categoryInfo[article.category];
                
                return (
                  <div
                    key={article.id}
                    onClick={() => navigate(`/client/help/${article.slug}`)}
                    className={cn(
                      "group p-4 rounded-xl border bg-card cursor-pointer",
                      "transition-all duration-200 hover:shadow-md hover:border-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          {info && (
                            <Badge className={cn(info.bgColor, info.color, "border-0 text-xs")}>
                              {info.label}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{calculateReadingTime(article.content || '')} min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
