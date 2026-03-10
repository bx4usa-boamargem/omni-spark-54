import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/public/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Heart, Eye, ArrowRight, AlertCircle } from 'lucide-react';

interface SmartLinkData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  article_id: string;
  // article relation
  article?: {
    slug: string;
    blog?: {
      slug: string;
      custom_domain: string | null;
      domain_verified: boolean;
    };
  };
}

/**
 * Página pública de um Smart Link rastreado.
 * Rota: /a/:slug
 * Registra visita, exibe card de preview e redireciona ao artigo real.
 */
export default function PublicSmartLink() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<SmartLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      try {
        // Busca o smart link com relações
        const { data: link, error: linkError } = await supabase
          .from('article_smart_links')
          .select(`
            id, slug, title, description, image_url, article_id, is_active,
            articles:article_id (
              slug,
              blogs:blog_id (
                slug, custom_domain, domain_verified
              )
            )
          `)
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (linkError) throw linkError;
        if (!link) {
          setError('Link não encontrado ou inativo.');
          return;
        }

        setData(link as any);

        // Registra visita
        await supabase.from('smart_link_visits').insert({
          smart_link_id: link.id,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          ip_address: null, // preenchido no server/edge se necessário
        });

        // Busca totais
        const { data: stats } = await supabase.rpc('get_link_stats', {
          p_smart_link_id: link.id,
        });
        if (stats && stats[0]) {
          setTotalVisits(Number(stats[0].total_visits) || 0);
          setTotalLikes(Number(stats[0].total_likes) || 0);
        }
      } catch (e: any) {
        console.error('PublicSmartLink error:', e);
        setError('Erro ao carregar o link.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  const handleLike = async () => {
    if (!data || liked || likeLoading) return;
    setLikeLoading(true);
    try {
      await supabase.from('smart_link_likes').insert({
        smart_link_id: data.id,
        session_id: crypto.randomUUID(),
      });
      setLiked(true);
      setTotalLikes((prev) => prev + 1);
    } catch (e) {
      // ignora erros de duplicate key (RLS / unique)
    } finally {
      setLikeLoading(false);
    }
  };

  const getArticleUrl = () => {
    if (!data?.article) return null;
    const blog = (data.article as any).blogs;
    const articleSlug = data.article.slug;
    if (!blog) return null;

    if (blog.custom_domain && blog.domain_verified) {
      return `https://${blog.custom_domain}/${articleSlug}`;
    }
    return `/blog/${blog.slug}/${articleSlug}`;
  };

  const handleRedirect = () => {
    const url = getArticleUrl();
    if (url) {
      setRedirecting(true);
      window.location.href = url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-6 w-32 mx-auto" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">{error || 'Link inválido'}</h1>
          <p className="text-muted-foreground">Este link pode ter sido removido ou desativado.</p>
          <Button asChild variant="outline">
            <Link to="/">Ir para o início</Link>
          </Button>
        </div>
      </div>
    );
  }

  const articleUrl = getArticleUrl();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <SEOHead
        title={data.title}
        description={data.description || data.title}
        ogImage={data.image_url || undefined}
        ogType="article"
      />

      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-card border rounded-2xl overflow-hidden shadow-xl">
          {/* Image */}
          {data.image_url && (
            <div className="aspect-video overflow-hidden">
              <img
                src={data.image_url}
                alt={data.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 space-y-4">
            {/* Title */}
            <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
              {data.title}
            </h1>

            {/* Description */}
            {data.description && (
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                {data.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {totalVisits.toLocaleString('pt-BR')} visualizações
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-rose-500" />
                {totalLikes.toLocaleString('pt-BR')} curtidas
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 gap-2"
                onClick={handleRedirect}
                disabled={!articleUrl || redirecting}
              >
                {redirecting ? 'Redirecionando...' : 'Ler artigo completo'}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant={liked ? 'secondary' : 'outline'}
                size="icon"
                onClick={handleLike}
                disabled={liked || likeLoading}
                className="shrink-0"
                title="Curtir"
              >
                <Heart
                  className={
                    liked
                      ? 'h-4 w-4 fill-rose-500 text-rose-500'
                      : 'h-4 w-4 text-rose-500'
                  }
                />
              </Button>
            </div>
          </div>
        </div>

        {/* Branding */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Link rastreado por{' '}
          <a href="/" className="underline hover:text-foreground transition-colors">
            OmniSeen
          </a>
        </p>
      </div>
    </div>
  );
}
