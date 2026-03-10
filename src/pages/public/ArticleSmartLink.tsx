import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArticlePdfDownload } from '@/components/articles/ArticlePdfDownload';
import {
  Heart,
  Share2,
  Clock,
  Calendar,
  ArrowLeft,
  Copy,
  Check,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── types ─────────────────────────────────────────────────────────── */
interface SmartLinkData {
  id: string;
  article_id: string;
  slug: string;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  primary_color: string | null;
  view_count: number;
  like_count: number;
  // hydrated from article join
  article_title: string;
  article_slug: string | null;
  article_content: string | null;
  blog_id: string;
  blog_slug: string | null;
  author_name: string | null;
  published_at: string | null;
  pdf_url: string | null;
}

/* ─── helpers ───────────────────────────────────────────────────────── */
const LIKE_KEY = (slug: string) => `sl_liked_${slug}`;

const readingTime = (content?: string | null) => {
  if (!content) return 0;
  return Math.max(1, Math.round(content.split(/\s+/).length / 200));
};

/* ─── component ─────────────────────────────────────────────────────── */
export default function ArticleSmartLink() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<SmartLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [copied, setCopied] = useState(false);

  /* ── fetch & register visit ─────────────────────────────────────── */
  useEffect(() => {
    if (!slug) return;

    const init = async () => {
      setLoading(true);

      // 1. Busca o smart link + artigo via join
      const { data: sl, error } = await supabase
        .from('article_smart_links')
        .select(`
          *,
          articles (
            id,
            title,
            slug,
            content,
            blog_id,
            published_at,
            pdf_url,
            blogs ( slug, primary_color )
          )
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (error || !sl) {
        setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const art = (sl as any).articles ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blog = art.blogs ?? {};

      const merged: SmartLinkData = {
        id: sl.id,
        article_id: sl.article_id,
        slug: sl.slug,
        title: sl.title,
        description: sl.description,
        cover_image_url: sl.cover_image_url,
        cta_text: sl.cta_text,
        cta_url: sl.cta_url,
        primary_color: sl.primary_color ?? blog.primary_color ?? null,
        view_count: sl.view_count ?? 0,
        like_count: sl.like_count ?? 0,
        article_title: art.title ?? sl.title ?? '',
        article_slug: art.slug ?? null,
        article_content: art.content ?? null,
        blog_id: art.blog_id ?? '',
        blog_slug: blog.slug ?? null,
        author_name: null,
        published_at: art.published_at ?? null,
        pdf_url: art.pdf_url ?? null,
      };

      setData(merged);
      setLikeCount(merged.like_count);
      setViewCount(merged.view_count + 1); // optimistic +1
      setLiked(!!localStorage.getItem(LIKE_KEY(slug)));

      // 2. Registra visita (fire & forget)
      supabase.rpc('increment_smart_link_view', { p_slug: slug }).then(() => {});

      setLoading(false);
    };

    init();
  }, [slug]);

  /* ── like ───────────────────────────────────────────────────────── */
  const handleLike = useCallback(async () => {
    if (!slug || !data) return;
    if (liked) {
      toast.info('Você já curtiu este artigo 💙');
      return;
    }

    // Optimistic UI
    setLiked(true);
    setLikeCount((c) => c + 1);
    localStorage.setItem(LIKE_KEY(slug), '1');

    const { error } = await supabase.rpc('increment_smart_link_like', { p_slug: slug });
    if (error) {
      // rollback
      setLiked(false);
      setLikeCount((c) => c - 1);
      localStorage.removeItem(LIKE_KEY(slug));
      toast.error('Erro ao curtir');
    } else {
      toast.success('Obrigado pela curtida! 💙');
    }
  }, [slug, data, liked]);

  /* ── copy link ──────────────────────────────────────────────────── */
  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── share ──────────────────────────────────────────────────────── */
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: data?.article_title ?? '',
        url: window.location.href,
      });
    } else {
      handleCopy();
    }
  };

  /* ── article public url ─────────────────────────────────────────── */
  const articleUrl = data?.blog_slug && data?.article_slug
    ? `/blog/${data.blog_slug}/${data.article_slug}`
    : null;

  const primaryColor = data?.primary_color ?? '#6d28d9';

  /* ── render ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-2xl p-6 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Link não encontrado</h1>
        <p className="text-muted-foreground">Este smart link não existe ou foi removido.</p>
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Button>
        </Link>
      </div>
    );
  }

  const minutes = readingTime(data.article_content);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Open Graph dinâmico via meta tags ── */}
      {typeof document !== 'undefined' && (() => {
        document.title = data.title ?? data.article_title;
        let ogDesc = document.querySelector('meta[property="og:description"]');
        if (!ogDesc) {
          ogDesc = document.createElement('meta');
          (ogDesc as HTMLMetaElement).setAttribute('property', 'og:description');
          document.head.appendChild(ogDesc);
        }
        (ogDesc as HTMLMetaElement).content = data.description ?? '';
        return null;
      })()}

      {/* ── Hero ── */}
      {data.cover_image_url && (
        <div className="relative w-full h-64 md:h-80 overflow-hidden">
          <img
            src={data.cover_image_url}
            alt={data.article_title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
      )}

      {/* ── Main card ── */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Title & badges */}
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            {data.title ?? data.article_title}
          </h1>

          {data.description && (
            <p className="text-muted-foreground text-base leading-relaxed">
              {data.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {minutes > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {minutes} min de leitura
              </span>
            )}
            {data.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(data.published_at).toLocaleDateString('pt-BR')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {viewCount.toLocaleString('pt-BR')} visualizações
            </span>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Like */}
          <Button
            variant={liked ? 'default' : 'outline'}
            size="sm"
            onClick={handleLike}
            className="gap-2"
            style={liked ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-white' : ''}`} />
            {likeCount > 0 ? likeCount : ''} Curtir
          </Button>

          {/* Share */}
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>

          {/* Copy link */}
          <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? (
              <><Check className="h-4 w-4 text-green-500" /> Copiado</>
            ) : (
              <><Copy className="h-4 w-4" /> Copiar link</>
            )}
          </Button>
        </div>

        {/* ── PDF Download ── */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium mb-3">📖 Baixar artigo completo</p>
          <ArticlePdfDownload
            articleId={data.article_id}
            articleTitle={data.article_title}
            existingPdfUrl={data.pdf_url}
            primaryColor={primaryColor}
            variant="default"
          />
        </div>

        {/* ── CTA personalizado ── */}
        {data.cta_text && data.cta_url && (
          <a
            href={data.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              className="w-full gap-2 text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {data.cta_text}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        )}

        {/* ── Ler artigo completo ── */}
        {articleUrl && (
          <div className="pt-2 border-t">
            <Link to={articleUrl}>
              <Button variant="link" className="gap-2 px-0" style={{ color: primaryColor }}>
                <ExternalLink className="h-4 w-4" />
                Ler artigo completo no blog
              </Button>
            </Link>
          </div>
        )}

        {/* ── Stats footer ── */}
        <div className="flex items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            {viewCount.toLocaleString('pt-BR')} views
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Heart className="h-3 w-3 mr-1" />
            {likeCount.toLocaleString('pt-BR')} curtidas
          </Badge>
        </div>
      </div>
    </div>
  );
}
