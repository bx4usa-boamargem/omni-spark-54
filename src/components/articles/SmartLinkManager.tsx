import { useEffect, useState } from 'react';
import { ExternalLink, Link2, Copy, Trash2, ToggleLeft, ToggleRight, Eye, Heart, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSmartLinks, type SmartLink, type SmartLinkStats } from '@/hooks/useSmartLinks';
import { useToast } from '@/hooks/use-toast';

interface SmartLinkManagerProps {
  articleId: string;
  blogId: string;
  articleTitle: string;
  articleImageUrl?: string | null;
}

/**
 * Gerenciador de Smart Links embutido no painel do artigo.
 * Permite criar links rastreados, copiar URLs, ativar/desativar e ver stats.
 */
export function SmartLinkManager({
  articleId,
  blogId,
  articleTitle,
  articleImageUrl,
}: SmartLinkManagerProps) {
  const { toast } = useToast();
  const { links, loading, creating, fetchLinks, createLink, toggleActive, deleteLink, getLinkUrl } =
    useSmartLinks(blogId);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Record<string, SmartLinkStats>>({});

  // Form state
  const [form, setForm] = useState({
    title: articleTitle,
    description: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
  });

  useEffect(() => {
    if (open) {
      fetchLinks(articleId);
    }
  }, [open, articleId, fetchLinks]);

  const handleCreate = async () => {
    const newLink = await createLink({
      article_id: articleId,
      blog_id: blogId,
      title: form.title,
      description: form.description || undefined,
      image_url: articleImageUrl || undefined,
      utm_source: form.utm_source || undefined,
      utm_medium: form.utm_medium || undefined,
      utm_campaign: form.utm_campaign || undefined,
    });

    if (newLink) {
      setForm({ title: articleTitle, description: '', utm_source: '', utm_medium: '', utm_campaign: '' });
    }
  };

  const copyUrl = (slug: string) => {
    const url = getLinkUrl(slug);
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: 'URL copiada!', description: url });
    });
  };

  const linkCount = links.filter((l) => l.article_id === articleId).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="h-4 w-4" />
          Smart Links
          {linkCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
              {linkCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Smart Links Rastreados
          </DialogTitle>
        </DialogHeader>

        {/* Create form */}
        <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium text-foreground">Criar novo link rastreado</p>

          <div className="space-y-2">
            <Label htmlFor="sl-title" className="text-xs">Título do link</Label>
            <Input
              id="sl-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Título para o preview do link"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sl-desc" className="text-xs">Descrição (opcional)</Label>
            <Textarea
              id="sl-desc"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Texto que aparece no preview do link"
              rows={2}
              className="resize-none"
            />
          </div>

          {/* UTM row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">UTM Source</Label>
              <Input
                value={form.utm_source}
                onChange={(e) => setForm((p) => ({ ...p, utm_source: e.target.value }))}
                placeholder="Ex: instagram"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">UTM Medium</Label>
              <Input
                value={form.utm_medium}
                onChange={(e) => setForm((p) => ({ ...p, utm_medium: e.target.value }))}
                placeholder="Ex: bio"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">UTM Campaign</Label>
              <Input
                value={form.utm_campaign}
                onChange={(e) => setForm((p) => ({ ...p, utm_campaign: e.target.value }))}
                placeholder="Ex: lancamento"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating || !form.title.trim()}
            className="w-full gap-2"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {creating ? 'Criando...' : 'Criar Smart Link'}
          </Button>
        </div>

        {/* Links list */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : links.filter((l) => l.article_id === articleId).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Nenhum smart link criado ainda.
            </p>
          ) : (
            links
              .filter((l) => l.article_id === articleId)
              .map((link) => <SmartLinkRow key={link.id} link={link} getLinkUrl={getLinkUrl} onCopy={copyUrl} onToggle={toggleActive} onDelete={deleteLink} stats={stats[link.id]} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Linha de link ─────────────────────────────────────────── */

interface SmartLinkRowProps {
  link: SmartLink;
  getLinkUrl: (slug: string) => string;
  onCopy: (slug: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  stats?: SmartLinkStats;
}

function SmartLinkRow({ link, getLinkUrl, onCopy, onToggle, onDelete, stats }: SmartLinkRowProps) {
  const url = getLinkUrl(link.slug);

  return (
    <div
      className={`border rounded-lg p-3 flex items-center gap-3 transition-colors ${
        link.is_active ? 'bg-card' : 'bg-muted/40 opacity-60'
      }`}
    >
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
        <p className="text-xs text-muted-foreground truncate">{url}</p>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" />
              {stats.total_visits.toLocaleString('pt-BR')}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="h-3 w-3 text-rose-500" />
              {stats.total_likes.toLocaleString('pt-BR')}
            </span>
          </div>
        )}

        {/* UTM tags */}
        {(link.utm_source || link.utm_medium || link.utm_campaign) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {link.utm_source && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                src: {link.utm_source}
              </Badge>
            )}
            {link.utm_medium && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                med: {link.utm_medium}
              </Badge>
            )}
            {link.utm_campaign && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                cmp: {link.utm_campaign}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onCopy(link.slug)}
          title="Copiar URL"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          asChild
          title="Abrir link"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onToggle(link.id, !link.is_active)}
          title={link.is_active ? 'Desativar link' : 'Ativar link'}
        >
          {link.is_active ? (
            <ToggleRight className="h-4 w-4 text-primary" />
          ) : (
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(link.id)}
          title="Remover link"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
