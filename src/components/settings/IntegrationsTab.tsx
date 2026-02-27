import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  connected: boolean;
  status?: 'active' | 'error' | 'pending';
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Publique artigos diretamente no seu blog WordPress.',
    icon: '🔗',
    connected: false,
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Integre seu e-commerce e gere conteúdo para produtos.',
    icon: '🛍️',
    connected: false,
  },
  {
    id: 'gsc',
    name: 'Google Search Console',
    description: 'Monitore seu desempenho de SEO e palavras-chave.',
    icon: '📊',
    connected: false,
  },
  {
    id: 'ga',
    name: 'Google Analytics',
    description: 'Acompanhe métricas de tráfego e conversão.',
    icon: '📈',
    connected: false,
  },
];

export function IntegrationsTab() {
  const { tenant, loading: tenantLoading } = useTenant();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [configured, setConfigured] = useState<Record<string, boolean>>({
    gemini: false,
    maps: false,
    search: false,
  });

  const [geminiKey, setGeminiKey] = useState("");
  const [mapsKey, setMapsKey] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [searchCx, setSearchCx] = useState("");

  const tenantId = tenant?.id || null;

  const providerRows = useMemo(
    () => ([
      { id: "gemini", label: "Gemini API Key", value: geminiKey, setValue: setGeminiKey, placeholder: "Cole sua Gemini API Key" },
      { id: "maps", label: "Google Maps API Key", value: mapsKey, setValue: setMapsKey, placeholder: "Cole sua Google Maps API Key" },
      { id: "search", label: "Google Search API Key", value: searchKey, setValue: setSearchKey, placeholder: "Cole sua Google Custom Search API Key" },
    ]),
    [geminiKey, mapsKey, searchKey],
  );

  const fetchConfigured = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("api_integrations")
        .select("provider, extra_config")
        .eq("tenant_id", tenantId);

      if (error) throw error;

      const next = { gemini: false, maps: false, search: false } as Record<string, boolean>;
      for (const row of (data || [])) {
        if (row?.provider && typeof row.provider === "string") next[row.provider] = true;
      }
      setConfigured(next);

      const searchRow = (data || []).find((r: any) => r?.provider === "search");
      const cx = searchRow?.extra_config?.cx;
      if (typeof cx === "string" && cx.trim().length) setSearchCx(cx);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro ao carregar integrações", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantLoading) return;
    if (!tenantId) return;
    fetchConfigured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantLoading, tenantId]);

  const handleSave = async () => {
    if (!tenantId) {
      toast.error("Tenant não encontrado");
      return;
    }

    const rows: Array<{ tenant_id: string; provider: string; api_key: string; extra_config: any }> = [];

    const gemini = geminiKey.trim();
    const maps = mapsKey.trim();
    const sKey = searchKey.trim();
    const cx = searchCx.trim();

    if (gemini) rows.push({ tenant_id: tenantId, provider: "gemini", api_key: gemini, extra_config: null });
    if (maps) rows.push({ tenant_id: tenantId, provider: "maps", api_key: maps, extra_config: null });

    if (sKey || cx) {
      if (!sKey || !cx) {
        toast.error("Google Search precisa de API Key e CX");
        return;
      }
      rows.push({ tenant_id: tenantId, provider: "search", api_key: sKey, extra_config: { cx } });
    }

    if (rows.length === 0) {
      toast.info("Nada para salvar");
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("api_integrations")
        .upsert(rows, { onConflict: "tenant_id,provider" })
        .select("provider");

      if (error) throw error;

      toast.success("Integrações salvas");

      // Never re-expose keys after save
      setGeminiKey("");
      setMapsKey("");
      setSearchKey("");

      await fetchConfigured();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro ao salvar integrações", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrações</h3>
        <p className="text-sm text-muted-foreground">
          Conecte suas ferramentas favoritas para ampliar o poder da plataforma.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {INTEGRATIONS.map((integration) => (
          <Card key={integration.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    {integration.connected && (
                      <Badge variant="secondary" className="mt-1 bg-green-500/10 text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {integration.description}
              </CardDescription>
              <Button 
                variant={integration.connected ? "outline" : "default"} 
                size="sm"
                className="w-full"
              >
                {integration.connected ? (
                  'Gerenciar'
                ) : (
                  <>
                    Conectar
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Integrações por API Key
          </CardTitle>
          <CardDescription>
            Cole suas chaves. Elas são usadas apenas no backend e não são exibidas após salvar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tenantId ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Selecione um tenant para configurar integrações.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {providerRows.map((p) => (
                  <div key={p.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor={`api-${p.id}`}>{p.label}</Label>
                      {configured[p.id] ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          Configurado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Não configurado</Badge>
                      )}
                    </div>
                    <Input
                      id={`api-${p.id}`}
                      value={p.value}
                      onChange={(e) => p.setValue(e.target.value)}
                      placeholder={p.placeholder}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <p className="text-xs text-muted-foreground">
                      {p.id === "search"
                        ? "Obrigatório para SERP via Google Custom Search."
                        : p.id === "maps"
                          ? "Usado para Google Maps Static."
                          : "Usado para geração via Gemini."}
                    </p>
                  </div>
                ))}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="api-search-cx">Google Search Engine ID (CX)</Label>
                    {configured.search ? (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Configurado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Não configurado</Badge>
                    )}
                  </div>
                  <Input
                    id="api-search-cx"
                    value={searchCx}
                    onChange={(e) => setSearchCx(e.target.value)}
                    placeholder="Ex: 012345678901234567890:abcdefg_hij"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este ID fica em `extra_config.cx` do provider `search`.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {loading ? "Carregando status..." : "O status reflete apenas se está configurado (a chave não é exibida)."}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={fetchConfigured} disabled={loading || saving}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
