import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Lightbulb,
  FileText,
  ArrowRight,
  Link,
  CheckCircle,
  ExternalLink,
  Download,
  Unlink,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeywordOnboardingGuide } from "./KeywordOnboardingGuide";
import { AISuggestKeywordsModal } from "@/components/keywords/AISuggestKeywordsModal";

interface KeywordSuggestion {
  keyword: string;
  type: string;
}

interface KeywordAnalysis {
  id: string;
  keyword: string;
  difficulty: number | null;
  search_volume: number | null;
  suggestions: KeywordSuggestion[];
  analyzed_at: string;
  source?: string;
}

interface GSCKeyword {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  difficulty: number;
  searchVolume: number;
  selected?: boolean;
}

interface GSCConnection {
  id: string;
  site_url: string;
  last_sync_at: string | null;
  is_active: boolean;
}

interface AnalysisResult {
  keyword: string;
  difficulty: number;
  searchVolume: number;
  suggestions: KeywordSuggestion[];
  titleSuggestions: string[];
}

interface KeywordsTabProps {
  blogId: string;
  keywordAnalyses: KeywordAnalysis[];
  setKeywordAnalyses: React.Dispatch<React.SetStateAction<KeywordAnalysis[]>>;
}

export function KeywordsTab({ blogId, keywordAnalyses, setKeywordAnalyses }: KeywordsTabProps) {
  const navigate = useNavigate();
  const [keywordInput, setKeywordInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // GSC State
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [gscConnection, setGscConnection] = useState<GSCConnection | null>(null);
  const [isLoadingGSC, setIsLoadingGSC] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingKeywords, setIsFetchingKeywords] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [availableSites, setAvailableSites] = useState<{ siteUrl: string; permissionLevel: string }[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [gscKeywords, setGscKeywords] = useState<GSCKeyword[]>([]);
  const [showAISuggestModal, setShowAISuggestModal] = useState(false);

  // Check if onboarding should be shown
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("keyword-onboarding-completed");
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  // Fetch GSC config and connection status
  useEffect(() => {
    if (blogId) {
      fetchGSCConfig();
      fetchGSCConnection();
    }
  }, [blogId]);

  const fetchGSCConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-gsc-config");
      if (!error && data?.clientId) {
        setGoogleClientId(data.clientId);
      }
    } catch (error) {
      console.error("Error fetching GSC config:", error);
    }
  };

  const fetchGSCConnection = async () => {
    setIsLoadingGSC(true);
    try {
      const { data, error } = await supabase
        .from("gsc_connections")
        .select("*")
        .eq("blog_id", blogId)
        .eq("is_active", true)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching GSC connection:", error);
      }

      setGscConnection(data);
    } catch (error) {
      console.error("Error fetching GSC connection:", error);
    } finally {
      setIsLoadingGSC(false);
    }
  };

  const handleConnectGSC = async () => {
    console.log("KeywordsTab.handleConnectGSC: Starting connection, blogId:", blogId);
    
    setIsConnecting(true);

    try {
      // Call the edge function with blogId to get authorizationUrl
      const { data, error } = await supabase.functions.invoke("get-gsc-config", {
        body: { blogId }
      });

      console.log("KeywordsTab.handleConnectGSC: get-gsc-config response:", data, error);

      if (error) {
        throw new Error(`Erro ao obter configuração: ${error.message}`);
      }

      if (!data?.configured) {
        toast.error("Google OAuth não configurado. Entre em contato com o suporte.");
        setIsConnecting(false);
        return;
      }

      if (data.authorizationUrl) {
        // Store code_verifier for callback
        if (data.codeVerifier) {
          sessionStorage.setItem(`gsc_code_verifier_${blogId}`, data.codeVerifier);
          console.log("KeywordsTab.handleConnectGSC: Stored code_verifier");
        }
        
        console.log("KeywordsTab.handleConnectGSC: Redirecting to Google OAuth");
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error("URL de autorização não retornada.");
      }
    } catch (err) {
      console.error("KeywordsTab.handleConnectGSC: Error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao conectar");
      setIsConnecting(false);
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (code && state) {
      try {
        const stateData = JSON.parse(state);
        if (stateData.action === "gsc_connect" && stateData.blogId === blogId) {
          handleOAuthCallback(code);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.error("Error parsing state:", e);
      }
    }
  }, [blogId]);

  const handleOAuthCallback = async (code: string) => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/strategy`;
      const { data, error } = await supabase.functions.invoke("gsc-callback", {
        body: { code, blogId, redirectUri },
      });

      if (error) throw error;

      if (data.connected) {
        setGscConnection({
          id: "",
          site_url: data.siteUrl,
          last_sync_at: null,
          is_active: true,
        });
        toast.success("Google Search Console conectado!");
      } else if (data.sites && data.sites.length > 0) {
        setAvailableSites(data.sites);
        setShowSiteSelector(true);
      }
    } catch (error) {
      console.error("Error connecting GSC:", error);
      toast.error("Erro ao conectar Google Search Console");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSelectSite = async (siteUrl: string) => {
    try {
      const { error } = await supabase.functions.invoke("gsc-select-site", {
        body: { blogId, siteUrl },
      });

      if (error) throw error;

      setGscConnection({
        id: "",
        site_url: siteUrl,
        last_sync_at: null,
        is_active: true,
      });
      setShowSiteSelector(false);
      toast.success("Site selecionado com sucesso!");
    } catch (error) {
      console.error("Error selecting site:", error);
      toast.error("Erro ao selecionar site");
    }
  };

  const handleDisconnectGSC = async () => {
    try {
      const { error } = await supabase.functions.invoke("disconnect-gsc", {
        body: { blogId },
      });

      if (error) throw error;

      setGscConnection(null);
      toast.success("Google Search Console desconectado");
    } catch (error) {
      console.error("Error disconnecting GSC:", error);
      toast.error("Erro ao desconectar");
    }
  };

  const handleFetchGSCKeywords = async () => {
    setIsFetchingKeywords(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-gsc-keywords", {
        body: { blogId },
      });

      if (error) throw error;

      if (data.keywords && data.keywords.length > 0) {
        setGscKeywords(data.keywords.map((k: GSCKeyword) => ({ ...k, selected: true })));
        setShowImportDialog(true);
      } else {
        toast.info("Nenhuma palavra-chave encontrada no período");
      }
    } catch (error) {
      console.error("Error fetching GSC keywords:", error);
      toast.error("Erro ao buscar palavras-chave");
    } finally {
      setIsFetchingKeywords(false);
    }
  };

  const handleImportKeywords = async () => {
    const selectedKeywords = gscKeywords.filter((k) => k.selected);
    if (selectedKeywords.length === 0) {
      toast.error("Selecione pelo menos uma palavra-chave");
      return;
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-gsc-keywords", {
        body: { blogId, keywords: selectedKeywords },
      });

      if (error) throw error;

      toast.success(`${data.imported} palavras-chave importadas!`);
      setShowImportDialog(false);

      // Refresh keyword analyses
      const { data: updatedAnalyses } = await supabase
        .from("keyword_analyses")
        .select("*")
        .eq("blog_id", blogId)
        .order("analyzed_at", { ascending: false })
        .limit(20);

      if (updatedAnalyses) {
        const formattedAnalyses: KeywordAnalysis[] = updatedAnalyses.map((a) => ({
          id: a.id,
          keyword: a.keyword,
          difficulty: a.difficulty,
          search_volume: a.search_volume,
          analyzed_at: a.analyzed_at,
          source: a.source || "manual",
          suggestions: Array.isArray(a.suggestions)
            ? (a.suggestions as unknown as KeywordSuggestion[])
            : [],
        }));
        setKeywordAnalyses(formattedAnalyses);
      }
    } catch (error) {
      console.error("Error importing keywords:", error);
      toast.error("Erro ao importar palavras-chave");
    } finally {
      setIsImporting(false);
    }
  };

  const toggleKeywordSelection = (keyword: string) => {
    setGscKeywords((prev) =>
      prev.map((k) => (k.keyword === keyword ? { ...k, selected: !k.selected } : k))
    );
  };

  const selectAllKeywords = (selected: boolean) => {
    setGscKeywords((prev) => prev.map((k) => ({ ...k, selected })));
  };

  const handleAnalyze = async () => {
    if (!keywordInput.trim() || !blogId) {
      toast.error("Digite uma palavra-chave para analisar");
      return;
    }

    setIsAnalyzing(true);
    setCurrentAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("keyword-analysis", {
        body: { blogId, keyword: keywordInput.trim() },
      });

      if (error) throw error;

      if (data?.analysis) {
        setCurrentAnalysis(data.analysis);

        if (data.saved) {
          setKeywordAnalyses((prev) => [data.saved as KeywordAnalysis, ...prev.slice(0, 19)]);
        }

        toast.success("Análise concluída!");
      }
    } catch (error) {
      console.error("Error analyzing keyword:", error);
      toast.error("Erro ao analisar palavra-chave");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 30) return "Fácil";
    if (difficulty <= 60) return "Médio";
    return "Difícil";
  };

  const getDifficultyBadgeVariant = (
    difficulty: number
  ): "default" | "secondary" | "destructive" => {
    if (difficulty <= 30) return "secondary";
    if (difficulty <= 60) return "default";
    return "destructive";
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Onboarding Guide */}
        {showOnboarding && (
          <KeywordOnboardingGuide onComplete={() => setShowOnboarding(false)} />
        )}

        {/* Header with counter */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold">Lista de Palavras-chave</h2>
            <p className="text-sm text-muted-foreground">
              Analise palavras-chave e descubra oportunidades de conteúdo
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={() => setShowAISuggestModal(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Sugerir com IA (baseado no nicho)
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowOnboarding(true)}
              className="text-xs"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Ver tutorial
            </Button>
            <Badge variant="outline" className="text-sm">
              {keywordAnalyses.length} palavras analisadas
            </Badge>
          </div>
        </div>

      {/* Google Search Console Card */}
      <Card className={gscConnection ? "border-green-500/30 bg-green-500/5" : ""}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${gscConnection ? "bg-green-500/10" : "bg-primary/10"}`}>
              {gscConnection ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Link className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Google Search Console
                {gscConnection && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    Conectado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {gscConnection
                  ? `Conectado a ${gscConnection.site_url}`
                  : "Importe automaticamente suas palavras-chave ranqueadas"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingGSC ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : gscConnection ? (
            <div className="space-y-4">
              {gscConnection.last_sync_at && (
                <p className="text-sm text-muted-foreground">
                  Última sincronização:{" "}
                  {new Date(gscConnection.last_sync_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleFetchGSCKeywords} disabled={isFetchingKeywords}>
                  {isFetchingKeywords ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Importar Palavras-chave
                </Button>
                <Button variant="outline" onClick={handleDisconnectGSC}>
                  <Unlink className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={handleConnectGSC} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              {isConnecting ? "Conectando..." : "Conectar Google Search Console"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Analyze Keyword Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Analisar Palavra-chave</CardTitle>
              <CardDescription>
                A IA vai estimar dificuldade, volume e sugerir variações
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              id="keyword-search-input"
              placeholder="Digite uma palavra-chave..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              disabled={isAnalyzing}
            />
            <Button 
              id="keyword-analyze-btn"
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !keywordInput.trim()}
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analisar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Result Card */}
      {currentAnalysis && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resultado para "{currentAnalysis.keyword}"
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Difficulty */}
              <div id="keyword-difficulty-card" className="p-4 rounded-lg bg-background border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 mb-3 cursor-help">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Dificuldade</span>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium mb-1">Dificuldade de Ranqueamento</p>
                    <ul className="text-xs space-y-1">
                      <li><strong>0-30%:</strong> Fácil - ideal para blogs novos</li>
                      <li><strong>31-60%:</strong> Médio - requer conteúdo de qualidade</li>
                      <li><strong>61-100%:</strong> Difícil - alta competição</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{currentAnalysis.difficulty}%</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant={getDifficultyBadgeVariant(currentAnalysis.difficulty)} className="cursor-help">
                          {getDifficultyLabel(currentAnalysis.difficulty)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {currentAnalysis.difficulty <= 30 
                          ? "Ótimo para começar! Você pode ranquear com conteúdo de qualidade."
                          : currentAnalysis.difficulty <= 60
                          ? "Precisa de conteúdo bem otimizado e algumas referências externas."
                          : "Competição alta. Considere focar em long-tails relacionadas primeiro."
                        }
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Progress value={currentAnalysis.difficulty} className="h-2" />
                </div>
              </div>

              {/* Volume */}
              <div id="keyword-volume-card" className="p-4 rounded-lg bg-background border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 mb-3 cursor-help">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Volume Estimado</span>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Número aproximado de buscas mensais no Google.</p>
                    <p className="text-xs mt-1">Valores mais altos = mais potencial de tráfego, mas geralmente mais concorrência.</p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ~{formatVolume(currentAnalysis.searchVolume)}
                  </span>
                  <span className="text-sm text-muted-foreground">buscas/mês</span>
                </div>
              </div>
            </div>

            {/* Related Keywords */}
            {currentAnalysis.suggestions.length > 0 && (
              <div id="keyword-related" className="space-y-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="font-medium">Palavras-chave Relacionadas</span>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Palavras semanticamente relacionadas e long-tail.</p>
                    <p className="text-xs mt-1">Long-tail são frases mais específicas e geralmente mais fáceis de ranquear.</p>
                  </TooltipContent>
                </Tooltip>
                <p className="text-sm text-muted-foreground">
                  Clique para adicionar ao campo de busca:
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentAnalysis.suggestions.map((sug, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setKeywordInput(sug.keyword)}
                    >
                      {sug.keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Title Suggestions */}
            {currentAnalysis.titleSuggestions && currentAnalysis.titleSuggestions.length > 0 && (
              <div id="keyword-titles" className="space-y-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">Sugestões de Títulos</span>
                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Títulos otimizados para SEO sugeridos pela IA.</p>
                    <p className="text-xs mt-1">Clique em qualquer um para criar um artigo com esse tema!</p>
                  </TooltipContent>
                </Tooltip>
                <div className="space-y-2">
                  {currentAnalysis.titleSuggestions.map((title, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors group"
                      onClick={() => navigate(`/app/articles/new?theme=${encodeURIComponent(title)}`)}
                    >
                      <span className="text-sm">{title}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analysis History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Análises
          </CardTitle>
          <CardDescription>Suas últimas palavras-chave analisadas</CardDescription>
        </CardHeader>
        <CardContent>
          {keywordAnalyses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma análise realizada</p>
              <p className="text-sm">Digite uma palavra-chave acima para começar.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {keywordAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setKeywordInput(analysis.keyword)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{analysis.keyword}</span>
                        {analysis.source === "gsc" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 cursor-help"
                              >
                                GSC
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Importado do Google Search Console</p>
                              <p className="text-xs">Você já aparece para esta busca!</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(analysis.analyzed_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {analysis.difficulty !== null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={getDifficultyBadgeVariant(analysis.difficulty)} className="cursor-help">
                              {getDifficultyLabel(analysis.difficulty)} {analysis.difficulty}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {analysis.difficulty <= 30 
                              ? "Fácil: ideal para blogs novos"
                              : analysis.difficulty <= 60
                              ? "Médio: precisa de conteúdo otimizado"
                              : "Difícil: alta competição"
                            }
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {analysis.search_volume !== null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="cursor-help">
                              Vol: {formatVolume(analysis.search_volume)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            ~{analysis.search_volume.toLocaleString()} buscas/mês
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Site Selector Dialog */}
      <Dialog open={showSiteSelector} onOpenChange={setShowSiteSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione um site</DialogTitle>
            <DialogDescription>
              Escolha qual site do Search Console você deseja conectar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {availableSites.map((site) => (
              <Button
                key={site.siteUrl}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleSelectSite(site.siteUrl)}
              >
                <Link className="h-4 w-4 mr-2" />
                {site.siteUrl}
                <Badge variant="secondary" className="ml-auto">
                  {site.permissionLevel}
                </Badge>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Keywords Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Palavras-chave do GSC</DialogTitle>
            <DialogDescription>
              Selecione as palavras-chave que deseja importar para análise
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {gscKeywords.filter((k) => k.selected).length} de {gscKeywords.length} selecionadas
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAllKeywords(true)}>
                  Selecionar todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAllKeywords(false)}>
                  Desmarcar todas
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-2">
                {gscKeywords.map((kw) => (
                  <div
                    key={kw.keyword}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={kw.selected}
                      onCheckedChange={() => toggleKeywordSelection(kw.keyword)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{kw.keyword}</p>
                      <p className="text-xs text-muted-foreground">
                        Pos: {kw.position.toFixed(1)} • CTR: {kw.ctr}% • Cliques: {kw.clicks}
                      </p>
                    </div>
                    <Badge variant={getDifficultyBadgeVariant(kw.difficulty)}>
                      {Math.round(kw.difficulty)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleImportKeywords}
                disabled={isImporting || gscKeywords.filter((k) => k.selected).length === 0}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Importar {gscKeywords.filter((k) => k.selected).length} palavras-chave
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Suggest Keywords Modal */}
      <AISuggestKeywordsModal
        blogId={blogId}
        open={showAISuggestModal}
        onOpenChange={setShowAISuggestModal}
        onAddKeywords={async (keywords) => {
          // Save keywords to analysis history
          for (const keyword of keywords) {
            const { data } = await supabase
              .from("keyword_analyses")
              .insert({
                blog_id: blogId,
                keyword,
                source: "ai_suggestion",
              })
              .select()
              .single();
            
            if (data) {
              setKeywordAnalyses((prev) => [{
                id: data.id,
                keyword: data.keyword,
                difficulty: data.difficulty,
                search_volume: data.search_volume,
                analyzed_at: data.analyzed_at,
                source: "ai_suggestion",
                suggestions: [],
              }, ...prev.slice(0, 19)]);
            }
          }
        }}
      />
      </div>
    </TooltipProvider>
  );
}
