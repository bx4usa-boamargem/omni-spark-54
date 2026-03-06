import { useState, useEffect } from "react";
import { useTenantContext } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Plug, Key, Save, CheckCircle2, AlertCircle } from "lucide-react";

interface ApiIntegration {
    id: string;
    provider: string;
    created_at: string;
    extra_config?: any;
    // Note: RLS policies generally block reading api_key for security.
    // We just know if it exists based on the presence of the record.
}

const AVAILABLE_PROVIDERS = [
    {
        id: "google_custom_search",
        name: "Google Custom Search (SERP)",
        description: "Necessário para a pesquisa em tempo real do Google para as Super Pages e Artigos.",
        placeholder: "Ex: AIzaSyA...",
        link: "https://developers.google.com/custom-search/v1/overview",
        requiresExtra: true,
        extraLabel: "Search Engine ID (CX)",
        extraPlaceholder: "Ex: 8a1b2c3d...",
    },
    {
        id: "google_places",
        name: "Google Places API",
        description: "Recomendado para dados locais e reputação (Agent 4 / Local SEO).",
        placeholder: "Ex: AIzaSyB...",
        link: "https://developers.google.com/maps/documentation/places/web-service/overview"
    },
    {
        id: "openai",
        name: "OpenAI",
        description: "Para uso customizado dos LLMs e geração de conteúdo avançada.",
        placeholder: "Ex: sk-proj-...",
        link: "https://platform.openai.com/api-keys"
    },
    {
        id: "lovable",
        name: "Lovable Gateway",
        description: "Para geração de imagens e fallbacks do assistente.",
        placeholder: "Lovable API Key...",
        link: "https://lovable.dev"
    }
];

export default function ClientConnectors() {
    const { currentTenant } = useTenantContext();
    const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingFor, setSavingFor] = useState<string | null>(null);

    // States form inputs
    const [inputs, setInputs] = useState<Record<string, { api_key: string, extra_config?: any }>>({});

    useEffect(() => {
        if (currentTenant) {
            loadIntegrations();
        }
    }, [currentTenant]);

    const loadIntegrations = async () => {
        if (!currentTenant) return;
        setLoading(true);
        try {
            // @ts-ignore
            const { data, error } = await supabase
                .from("api_integrations")
                .select("id, provider, created_at, extra_config")
                .eq("tenant_id", currentTenant.id);

            if (error) throw error;

            const loadedData: ApiIntegration[] = [];
            if (Array.isArray(data)) {
                for (const item of data) {
                    loadedData.push(item as unknown as ApiIntegration);
                }
            }
            setIntegrations(loadedData);

            // Initialize inputs state with existing extra_config (if any could be fetched)
            const newInputs = { ...inputs };
            loadedData.forEach(d => {
                if (!newInputs[d.provider]) newInputs[d.provider] = { api_key: '' };
                if (d.extra_config) {
                    newInputs[d.provider].extra_config = d.extra_config;
                }
            });
            setInputs(newInputs);

        } catch (err: any) {
            console.error("Error loading integrations:", err);
            toast.error("Erro ao carregar integrações", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (provider: string, field: 'api_key' | 'extra_config', value: any, extraKey?: string) => {
        setInputs(prev => {
            const current = prev[provider] || { api_key: '' };
            if (field === 'api_key') {
                return { ...prev, [provider]: { ...current, api_key: value } };
            } else if (field === 'extra_config' && extraKey) {
                return { ...prev, [provider]: { ...current, extra_config: { ...(current.extra_config || {}), [extraKey]: value } } };
            }
            return prev;
        });
    };

    const saveIntegration = async (provider: string) => {
        if (!currentTenant) return;

        const inputData = inputs[provider];
        if (!inputData || !inputData.api_key.trim()) {
            toast.warning("Chave de API em branco", { description: "Insira um valor para salvar." });
            return;
        }

        setSavingFor(provider);
        try {
            // Upsert
            // @ts-ignore
            const { error } = await supabase
                .from("api_integrations")
                .upsert({
                    tenant_id: currentTenant.id,
                    provider: provider,
                    api_key: inputData.api_key,
                    extra_config: inputData.extra_config || null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'tenant_id,provider'
                });

            if (error) throw error;

            toast.success("Integração salva", { description: "A chave foi atualizada com sucesso!" });

            // Clear the local state key for security after save, but keep it in integrations list
            setInputs(prev => ({ ...prev, [provider]: { ...prev[provider], api_key: '' } }));
            await loadIntegrations();

        } catch (err: any) {
            console.error("Error saving integration:", err);
            toast.error("Erro ao salvar", { description: err.message });
        } finally {
            setSavingFor(null);
        }
    };

    const hasIntegration = (provider: string) => integrations.some(i => i.provider === provider);

    if (loading && integrations.length === 0) {
        return <div className="p-8 text-muted-foreground animate-pulse">Carregando conectores...</div>;
    }

    return (
        <div className="container max-w-4xl py-8 space-y-8 animate-in fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Conectores de API</h1>
                <p className="text-muted-foreground text-lg">
                    Gerencie as integrações e chaves privadas do seu tenant. Estas chaves ativam o Motor SEO.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {AVAILABLE_PROVIDERS.map((provider) => {
                    const isConnected = hasIntegration(provider.id);
                    const currentInput = inputs[provider.id] || { api_key: '' };
                    const isSaving = savingFor === provider.id;

                    return (
                        <Card key={provider.id} className="relative overflow-hidden border-border/50">
                            {isConnected && (
                                <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-full" title="Conectado">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Plug className="h-5 w-5 text-primary" />
                                    {provider.name}
                                </CardTitle>
                                <CardDescription>
                                    {provider.description}
                                    {" "}
                                    <a href={provider.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                                        Obter chave
                                    </a>
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {isConnected && (
                                    <div className="text-sm bg-muted/50 p-3 rounded-md flex items-start gap-2 mb-2">
                                        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="font-medium">Chave configurada</p>
                                            <p className="text-muted-foreground">Insira uma nova chave abaixo se desejar substituir a atual. A chave anterior não pode ser visualizada por motivos de segurança.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor={`key-${provider.id}`}>Chave de API (Secret Key)</Label>
                                    <div className="relative">
                                        <Input
                                            id={`key-${provider.id}`}
                                            type="password"
                                            placeholder={provider.placeholder}
                                            value={currentInput.api_key || ''}
                                            onChange={(e) => handleInputChange(provider.id, 'api_key', e.target.value)}
                                            className="font-mono bg-background"
                                        />
                                        <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                                    </div>
                                </div>

                                {provider.requiresExtra && (
                                    <div className="space-y-2 pt-2">
                                        <Label htmlFor={`extra-${provider.id}`}>{provider.extraLabel}</Label>
                                        <Input
                                            id={`extra-${provider.id}`}
                                            placeholder={provider.extraPlaceholder}
                                            value={currentInput.extra_config?.searchEngineId || ''}
                                            onChange={(e) => handleInputChange(provider.id, 'extra_config', e.target.value, 'searchEngineId')}
                                            className="font-mono bg-background"
                                        />
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="bg-muted/20 border-t flex justify-end">
                                <Button
                                    onClick={() => saveIntegration(provider.id)}
                                    disabled={isSaving || !currentInput.api_key.trim()}
                                    className="gap-2"
                                >
                                    {isSaving ? (
                                        <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    {isConnected ? "Atualizar Chave" : "Salvar Chave"}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
