import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Link2,
  Eye,
  Heart,
  TrendingUp,
  Copy,
  Check,
  ExternalLink,
  Search,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── types ─────────────────────────────────────────────────────────── */
interface LinkRow {
  id: string;
  slug: string;
  title: string | null;
  view_count: number;
  like_count: number;
  is_active: boolean;
  created_at: string;
  article_title: string;
  article_id: string;
}

/* ─── component ─────────────────────────────────────────────────────── */
export default function ArticleLinksDashboard() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  /* ── fetch ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;

    const fetchLinks = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('article_smart_links')
        .select(`
          id,
          slug,
          title,
          view_count,
          like_count,
          is_active,
          created_at,
          article_id,
          articles ( title )
        `)
        .order('view_count', { ascending: false });

      if (error) {
        toast.error('Erro ao carregar smart links');
        setLoading(false);
        return;
      }

      const rows: LinkRow[] = (data ?? []).map((row: any) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        view_count: row.view_count ?? 0,
        like_count: row.like_count ?? 0,
        is_active: row.is_active ?? true,
        created_at: row.created_at,
        article_id: row.article_id,
        article_title: row.articles?.title ?? row.title ?? '—',
      }));

      setLinks(rows);
      setLoading(false);
    };

    fetchLinks();
  }, [user]);

  /* ── copy ───────────────────────────────────────────────────────── */
  const handleCopy = async (slug: string) => {
    await navigator.clipboard.writeText(`${baseUrl}/a/${slug}`);
    setCopied(slug);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  /* ── filter ─────────────────────────────────────────────────────── */
  const filtered = links.filter((l) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.slug.includes(q) ||
      l.article_title.toLowerCase().includes(q) ||
      (l.title ?? '').toLowerCase().includes(q)
    );
  });

  /* ── aggregate stats ────────────────────────────────────────────── */
  const totalViews = links.reduce((a, l) => a + l.view_count, 0);
  const totalLikes = links.reduce((a, l) => a + l.like_count, 0);
  const activeLinks = links.filter((l) => l.is_active).length;

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-lg bg-primary/10">
          <Link2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Smart Links</h1>
          <p className="text-sm text-muted-foreground">Gerencie e monitore seus links rastreados de artigos</p>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/15">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalViews.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">Total de visitas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/15">
              <Heart className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalLikes.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">Total de curtidas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/15">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeLinks}</p>
              <p className="text-xs text-muted-foreground">Links ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título ou slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ── Table / list ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Todos os Smart Links ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Link2 className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                {search ? 'Nenhum link encontrado para a busca' : 'Nenhum smart link criado ainda'}
              </p>
              {!search && (
                <p className="text-xs text-muted-foreground">
                  Acesse um artigo no editor e gere um Smart Link na sidebar
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((link) => {
                const url = `${baseUrl}/a/${link.slug}`;
                const engagementRate =
                  link.view_count > 0
                    ? ((link.like_count / link.view_count) * 100).toFixed(1)
                    : '0.0';

                return (
                  <div key={link.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {link.title ?? link.article_title}
                          </p>
                          {!link.is_active && (
                            <Badge variant="outline" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {link.article_title !== (link.title ?? link.article_title) && (
                            <span className="mr-2 text-muted-foreground/60">{link.article_title}</span>
                          )}
                          <span className="font-mono text-muted-foreground/70">/a/{link.slug}</span>
                        </p>

                        {/* Stats row */}
                        <div className="flex items-center flex-wrap gap-3 pt-1">
                          <span className="text-xs flex items-center gap-1 text-blue-500">
                            <Eye className="h-3 w-3" />
                            {link.view_count.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-xs flex items-center gap-1 text-rose-500">
                            <Heart className="h-3 w-3" />
                            {link.like_count.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Engajamento: {engagementRate}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(link.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleCopy(link.slug)}
                          title="Copiar URL"
                        >
                          {copied === link.slug ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Abrir link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
