import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateSmartLinkSlug } from '@/utils/seoValidator';
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartLinkStats {
  total_visits: number;
  total_likes: number;
  visits_7d: number;
  likes_7d: number;
}

interface SmartLinkCardProps {
  articleId: string;
  articleTitle: string;
  articleDescription?: string;
  articleImage?: string | null;
  tenantId: string;
}

/**
 * SmartLinkCard — mostra o smart link rastreado de um artigo,
 * permite gerar/copiar a URL pública e exibe contadores de visitas e curtidas.
 */
export function SmartLinkCard({
  articleId,
  articleTitle,
  articleDescription,
  articleImage,
  tenantId,
}: SmartLinkCardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [smartLinkId, setSmartLinkId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [stats, setStats] = useState<SmartLinkStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Lazy load: busca smart link existente ao montar
  const loadExistingLink = async () => {
    if (initialized) return;
    setInitialized(true);
    setIsLoadingStats(true);
    try {
      const { data } = await supabase
        .from('article_smart_links')
        .select('id, slug')
        .eq('article_id', articleId)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        setSmartLinkId(data.id);
        setSlug(data.slug);
        await fetchStats(data.id);
      }
    } catch (e) {
      console.error('SmartLinkCard loadExistingLink error:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchStats = async (id: string) => {
    try {
      const { data } = await supabase.rpc('get_link_stats', {
        p_smart_link_id: id,
      });
      if (data && data[0]) {
        setStats({
          total_visits: Number(data[0].total_visits) || 0,
          total_likes: Number(data[0].total_likes) || 0,
          visits_7d: Number(data[0].visits_7d) || 0,
          likes_7d: Number(data[0].likes_7d) || 0,
        });
      }
    } catch (e) {
      console.error('SmartLinkCard fetchStats error:', e);
    }
  };

  // Gera novo smart link para o artigo
  const handleGenerateLink = async () => {
    setIsCreating(true);
    try {
      const newSlug = generateSmartLinkSlug(articleTitle);
      const { data, error } = await supabase
        .from('article_smart_links')
        .insert({
          article_id: articleId,
          tenant_id: tenantId,
          slug: newSlug,
          title: articleTitle,
          description: articleDescription || null,
          image_url: articleImage || null,
          is_active: true,
        })
        .select('id, slug')
        .single();

      if (error) throw error;

      setSmartLinkId(data.id);
      setSlug(data.slug);
      setStats({ total_visits: 0, total_likes: 0, visits_7d: 0, likes_7d: 0 });
      toast.success('Smart Link gerado!');
    } catch (e) {
      console.error('SmartLinkCard handleGenerateLink error:', e);
      toast.error('Erro ao gerar Smart Link');
    } finally {
      setIsCreating(false);
    }
  };

  // Copia URL pública do smart link
  const handleCopy = async () => {
    if (!slug) return;
    const url = `${window.location.origin}/a/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Abre o smart link em nova aba
  const handleOpen = () => {
    if (!slug) return;
    window.open(`/a/${slug}`, '_blank');
  };

  // Compartilha via Web Share API
  const handleShare = async () => {
    if (!slug) return;
    const url = `${window.location.origin}/a/${slug}`;
    if (navigator.share) {
      await navigator.share({ title: articleTitle, url });
    } else {
      await handleCopy();
    }
  };

  // Inicializa ao montar
  if (!initialized) {
    loadExistingLink();
  }

  const publicUrl = slug ? `${window.location.origin}/a/${slug}` : null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Smart Link</span>
        {slug && (
          <Badge variant="secondary" className="text-xs ml-auto">
            Ativo
          </Badge>
        )}
      </div>

      {isLoadingStats ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Carregando...
        </div>
      ) : !slug ? (
        /* Estado: sem smart link */
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Crie um link rastreado para compartilhar este artigo e monitorar visitas e curtidas.
          </p>
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={handleGenerateLink}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Gerar Smart Link
              </>
            )}
          </Button>
        </div>
      ) : (
        /* Estado: smart link ativo */
        <div className="space-y-3">
          {/* URL truncada */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground truncate flex-1">
              /a/{slug}
            </span>
          </div>

          {/* Ações */}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 text-xs h-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copiar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 text-xs h-8"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5" />
              Partilhar
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={handleOpen}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-2 gap-2">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg p-2 border',
                  'bg-blue-500/5 border-blue-500/20'
                )}
              >
                <Eye className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {stats.total_visits.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Visitas</p>
                </div>
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg p-2 border',
                  'bg-rose-500/5 border-rose-500/20'
                )}
              >
                <Heart className="h-4 w-4 text-rose-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {stats.total_likes.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Curtidas</p>
                </div>
              </div>
            </div>
          )}

          {/* Trend últimos 7 dias */}
          {stats && (stats.visits_7d > 0 || stats.likes_7d > 0) && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>
                {stats.visits_7d} visitas · {stats.likes_7d} curtidas nos últimos 7 dias
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
