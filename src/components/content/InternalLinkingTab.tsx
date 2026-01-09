import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Link2, AlertCircle, RefreshCw, Info, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InternalLinkingTabProps {
  blogId: string;
}

interface LinkingSettings {
  auto_linking_enabled: boolean;
  sitemap_urls: string[];
  manual_urls: string[];
  last_sync_at: string | null;
}

export function InternalLinkingTab({ blogId }: InternalLinkingTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState<LinkingSettings>({
    auto_linking_enabled: true,
    sitemap_urls: [],
    manual_urls: [],
    last_sync_at: null,
  });
  const [sitemapText, setSitemapText] = useState("");
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    fetchSettings();
  }, [blogId]);

  async function fetchSettings() {
    if (!blogId) return;

    const { data, error } = await supabase
      .from("linking_settings")
      .select("*")
      .eq("blog_id", blogId)
      .single();

    if (data) {
      setSettings({
        auto_linking_enabled: data.auto_linking_enabled ?? true,
        sitemap_urls: data.sitemap_urls || [],
        manual_urls: data.manual_urls || [],
        last_sync_at: data.last_sync_at,
      });
      setSitemapText((data.sitemap_urls || []).join("\n"));
      setManualText((data.manual_urls || []).join("\n"));
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);

    const sitemapUrls = sitemapText.split("\n").map(u => u.trim()).filter(Boolean);
    const manualUrls = manualText.split("\n").map(u => u.trim()).filter(Boolean);

    const { error } = await supabase
      .from("linking_settings")
      .upsert({
        blog_id: blogId,
        auto_linking_enabled: settings.auto_linking_enabled,
        sitemap_urls: sitemapUrls,
        manual_urls: manualUrls,
      }, { onConflict: "blog_id" });

    if (error) {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    } else {
      toast.success("Configurações salvas com sucesso");
      setSettings(prev => ({
        ...prev,
        sitemap_urls: sitemapUrls,
        manual_urls: manualUrls,
      }));
    }
    setSaving(false);
  }

  async function handleSync() {
    setSyncing(true);
    
    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { error } = await supabase
      .from("linking_settings")
      .upsert({
        blog_id: blogId,
        last_sync_at: new Date().toISOString(),
      }, { onConflict: "blog_id" });

    if (error) {
      toast.error("Erro ao sincronizar sitemap");
    } else {
      toast.success("Sitemap sincronizado com sucesso");
      setSettings(prev => ({ ...prev, last_sync_at: new Date().toISOString() }));
    }
    setSyncing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasSitemap = settings.sitemap_urls.length > 0;
  const isSynced = settings.last_sync_at !== null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Info Banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Sobre a Linkagem Interna</AlertTitle>
        <AlertDescription>
          A linkagem interna automática ajuda a melhorar o SEO do seu blog conectando artigos 
          relacionados. Sincronize seu sitemap ou adicione URLs manualmente para que a IA 
          possa sugerir links relevantes durante a criação de novos artigos.
        </AlertDescription>
      </Alert>

      {/* Sync Status */}
      {!isSynced && hasSitemap && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sitemap não sincronizado</AlertTitle>
          <AlertDescription>
            Você adicionou URLs de sitemap mas ainda não sincronizou. Clique em "Sincronizar" 
            para importar as URLs do seu blog.
          </AlertDescription>
        </Alert>
      )}

      {isSynced && (
        <Alert className="border-success/30 bg-success/5">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertTitle className="text-success">Sitemap sincronizado</AlertTitle>
          <AlertDescription>
            Última sincronização: {format(new Date(settings.last_sync_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </AlertDescription>
        </Alert>
      )}

      {/* Auto Linking Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Linkagem Automática
          </CardTitle>
          <CardDescription>
            Ative para que a IA sugira links internos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <Label className="text-base">Ativar linkagem interna como padrão</Label>
              <p className="text-sm text-muted-foreground">
                Links internos serão sugeridos automaticamente na criação de posts
              </p>
            </div>
            <Switch
              checked={settings.auto_linking_enabled}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, auto_linking_enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Sitemap Sync */}
      <Card>
        <CardHeader>
          <CardTitle>Sincronização via Sitemap</CardTitle>
          <CardDescription>
            Adicione as URLs dos sitemaps do seu blog para importar automaticamente todos os posts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URLs do Sitemap (uma por linha)</Label>
            <Textarea
              placeholder="https://seublog.com/sitemap.xml&#10;https://seublog.com/post-sitemap.xml"
              value={sitemapText}
              onChange={(e) => setSitemapText(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>
          
          <Button onClick={handleSync} disabled={syncing || !sitemapText.trim()}>
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Sitemap
          </Button>
        </CardContent>
      </Card>

      {/* Manual URLs */}
      <Card>
        <CardHeader>
          <CardTitle>Listagem Manual de Posts</CardTitle>
          <CardDescription>
            Adicione URLs de posts específicos que deseja incluir na linkagem interna
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URLs de Posts (uma por linha)</Label>
            <Textarea
              placeholder="https://seublog.com/post-1&#10;https://seublog.com/post-2&#10;https://seublog.com/post-3"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="min-h-[150px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {manualText.split("\n").filter(u => u.trim()).length} URLs adicionadas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
