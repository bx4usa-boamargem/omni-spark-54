import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Loader2, Search, ChevronRight, Home, TrendingUp, Compass, Activity, FileText, Globe, Zap, Building2, User, Plug, MapPin, Rocket, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpCategory {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  gradient: string;
  articleCount?: number;
}

const categories: HelpCategory[] = [
  {
    id: 'primeiros-passos',
    label: 'Primeiros Passos',
    subtitle: 'Começando na Omniseen',
    description: 'Aprenda a configurar sua conta, criar seu primeiro artigo e entender a plataforma.',
    icon: Rocket,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    id: 'resultados',
    label: 'Resultados & ROI',
    subtitle: 'Métricas e Performance',
    description: 'Entenda suas métricas de performance, ROI real e como interpretar seus dados.',
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    id: 'inteligencia',
    label: 'Inteligência',
    subtitle: 'Radar & SEO',
    description: 'Descubra oportunidades de mercado, otimize seu SEO e supere concorrentes.',
    icon: Compass,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    subtitle: 'Artigos & Portal',
    description: 'Crie, edite, publique e gerencie seus artigos com inteligência artificial.',
    icon: FileText,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    id: 'operacao',
    label: 'Operação',
    subtitle: 'Automação & Config',
    description: 'Configure automações, territórios, empresa e preferências da conta.',
    icon: Zap,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-500/10',
    gradient: 'from-slate-500 to-slate-600',
  },
  {
    id: 'integracoes',
    label: 'Integrações',
    subtitle: 'Google & APIs',
    description: 'Conecte Google Search Console e outras ferramentas para potencializar resultados.',
    icon: Plug,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    gradient: 'from-cyan-500 to-cyan-600',
  },
];

export default function ClientHelp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [articleCounts, setArticleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchArticleCounts();
  }, [user]);

  const fetchArticleCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('category')
        .eq('is_published', true)
        .eq('language', 'pt-BR');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(article => {
        counts[article.category] = (counts[article.category] || 0) + 1;
      });
      setArticleCounts(counts);
    } catch (error) {
      console.error('Error fetching article counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/client/help/category/${categoryId}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/client/help/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Central de Ajuda</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Encontre respostas para suas dúvidas e aprenda a usar todas as funcionalidades da Omniseen.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar artigos de ajuda..."
            className="pl-12 h-12 text-base rounded-xl border-2 focus:border-primary"
          />
        </div>
      </form>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const count = articleCounts[category.id] || 0;

          return (
            <div
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-card p-6",
                "transition-all duration-300 cursor-pointer",
                "hover:scale-[1.02] hover:shadow-lg hover:border-primary/20"
              )}
            >
              {/* Gradient bar at top */}
              <div className={cn(
                "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                category.gradient
              )} />

              {/* Icon with colored background */}
              <div className={cn(
                "inline-flex p-3 rounded-xl mb-4",
                category.bgColor
              )}>
                <Icon className={cn("h-8 w-8", category.color)} />
              </div>

              {/* Title */}
              <h3 className={cn("text-lg font-bold mb-1", category.color)}>
                {category.label}
              </h3>

              {/* Subtitle */}
              <p className="text-sm text-muted-foreground mb-2">
                {category.subtitle}
              </p>

              {/* Description */}
              <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-4">
                {category.description}
              </p>

              {/* Footer with count */}
              <div className={cn(
                "flex items-center text-sm font-medium",
                category.color,
                "group-hover:translate-x-1 transition-transform"
              )}>
                {count > 0 ? `${count} artigos` : 'Em breve'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Help */}
      <div className="bg-muted/50 rounded-xl p-6 text-center">
        <h3 className="font-semibold mb-2">Precisa de mais ajuda?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Clique no ícone de chat no canto da tela para falar com nossa IA assistente.
        </p>
      </div>
    </div>
  );
}
