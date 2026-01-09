import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Globe, Trash2, ExternalLink, FileText, TrendingUp, MousePointer, DollarSign, AlertTriangle, Wand2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Competitor {
  id: string;
  blog_id: string;
  name: string;
  url: string;
  favicon_url: string | null;
  top_articles: number;
  keywords_ranked: number;
  monthly_clicks: number;
  traffic_value_brl: number;
  is_active: boolean;
  created_at: string;
}

interface CompetitorsTabProps {
  blogId: string;
}

const MAX_COMPETITORS = 4;

export function CompetitorsTab({ blogId }: CompetitorsTabProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingOpportunities, setGeneratingOpportunities] = useState(false);
  
  const [newCompetitor, setNewCompetitor] = useState({
    name: "",
    url: "",
  });

  useEffect(() => {
    fetchCompetitors();
  }, [blogId]);

  const fetchCompetitors = async () => {
    try {
      const { data, error } = await supabase
        .from("competitors")
        .select("*")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompetitors(data || []);
    } catch (error) {
      console.error("Error fetching competitors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitor.name.trim() || !newCompetitor.url.trim()) {
      toast.error("Preencha nome e URL do concorrente");
      return;
    }

    if (competitors.length >= MAX_COMPETITORS) {
      toast.error(`Limite de ${MAX_COMPETITORS} concorrentes atingido`);
      return;
    }

    setSaving(true);
    try {
      // Extract favicon from URL
      let faviconUrl = null;
      try {
        const urlObj = new URL(newCompetitor.url);
        faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
      } catch {
        // Invalid URL, skip favicon
      }

      const { data, error } = await supabase
        .from("competitors")
        .insert({
          blog_id: blogId,
          name: newCompetitor.name,
          url: newCompetitor.url,
          favicon_url: faviconUrl,
          top_articles: 0,
          keywords_ranked: 0,
          monthly_clicks: 0,
          traffic_value_brl: 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setCompetitors((prev) => [data as Competitor, ...prev]);
      setShowAddDialog(false);
      setNewCompetitor({ name: "", url: "" });
      toast.success("Concorrente adicionado com sucesso!");
    } catch (error) {
      console.error("Error adding competitor:", error);
      toast.error("Erro ao adicionar concorrente");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      await supabase.from("competitors").delete().eq("id", id);
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
      toast.success("Concorrente removido!");
    } catch (error) {
      console.error("Error deleting competitor:", error);
      toast.error("Erro ao remover concorrente");
    }
  };

  const handleGenerateOpportunities = async () => {
    if (competitors.length === 0) {
      toast.error("Adicione pelo menos um concorrente antes de gerar oportunidades");
      return;
    }

    setGeneratingOpportunities(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-opportunities", {
        body: { 
          blogId, 
          count: 5,
          competitors: competitors.map(c => ({ name: c.name, url: c.url }))
        },
      });

      if (error) {
        if (error.message?.includes("402")) {
          toast.error("Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage");
          return;
        }
        if (error.message?.includes("429")) {
          toast.error("Limite de requisições atingido. Tente novamente em alguns minutos.");
          return;
        }
        throw error;
      }

      toast.success(`${data?.count || 0} oportunidades geradas com base nos concorrentes!`);
    } catch (error) {
      console.error("Error generating opportunities:", error);
      toast.error("Erro ao gerar oportunidades");
    } finally {
      setGeneratingOpportunities(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Concorrentes</CardTitle>
            <CardDescription>
              Cadastre seus concorrentes para análise competitiva e referência estratégica.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateOpportunities}
              disabled={generatingOpportunities || competitors.length === 0}
            >
              {generatingOpportunities ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Gerar Oportunidades com IA
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button disabled={competitors.length >= MAX_COMPETITORS}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Concorrente
                </Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Concorrente</DialogTitle>
                <DialogDescription>
                  Adicione um concorrente para acompanhar e usar como referência
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do concorrente</Label>
                  <Input
                    placeholder="Ex: Empresa XYZ"
                    value={newCompetitor.name}
                    onChange={(e) => setNewCompetitor((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL do site</Label>
                  <Input
                    placeholder="https://www.exemplo.com.br"
                    value={newCompetitor.url}
                    onChange={(e) => setNewCompetitor((prev) => ({ ...prev, url: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddCompetitor} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {competitors.length >= MAX_COMPETITORS && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você atingiu o limite de concorrentes ({MAX_COMPETITORS}). Remova um para adicionar outro.
              </AlertDescription>
            </Alert>
          )}

          {competitors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum concorrente cadastrado</p>
              <p className="text-sm mb-4">
                Adicione concorrentes para usar como referência estratégica
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeiro concorrente
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {competitors.map((competitor) => (
                <div
                  key={competitor.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {competitor.favicon_url ? (
                      <img
                        src={competitor.favicon_url}
                        alt={competitor.name}
                        className="w-10 h-10 rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{competitor.name}</h3>
                        <a
                          href={competitor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                        {competitor.url}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>Top artigos</span>
                      </div>
                      <p className="font-medium">{competitor.top_articles}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span>Palavras ranqueadas</span>
                      </div>
                      <p className="font-medium">{formatNumber(competitor.keywords_ranked)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MousePointer className="h-4 w-4" />
                        <span>Cliques/mês</span>
                      </div>
                      <p className="font-medium">{formatNumber(competitor.monthly_clicks)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Valor do tráfego</span>
                      </div>
                      <p className="font-medium text-green-600">
                        {formatCurrency(competitor.traffic_value_brl)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCompetitor(competitor.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
