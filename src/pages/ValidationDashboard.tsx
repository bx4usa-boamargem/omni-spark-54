import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ValidationScoreCard } from "@/components/validation/ValidationScoreCard";
import { ValidationChecklist } from "@/components/validation/ValidationChecklist";
import { 
  validateArticle, 
  autoFixArticle, 
  ValidationResult 
} from "@/utils/articleValidator";
import { 
  validateEbook, 
  EbookValidationResult 
} from "@/utils/ebookValidator";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  BookOpen, 
  Settings, 
  Search, 
  Filter,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Eye,
  Edit,
  Sparkles,
  RefreshCw,
  ArrowUpDown
} from "lucide-react";

interface ArticleWithValidation {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  content: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  featured_image_url: string | null;
  created_at: string;
  updated_at: string;
  validation?: ValidationResult;
}

interface EbookWithValidation {
  id: string;
  title: string;
  slug: string | null;
  status: string | null;
  content: string | null;
  cover_image_url: string | null;
  content_images: unknown;
  cta_title: string | null;
  cta_body: string | null;
  cta_button_text: string | null;
  created_at: string;
  updated_at: string;
  validation?: EbookValidationResult;
}

type ScoreFilter = 'all' | 'critical' | 'warning' | 'ok';
type SortOrder = 'score-asc' | 'score-desc' | 'date-desc' | 'name-asc';

export default function ValidationDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { blog: currentBlog } = useBlog();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("articles");
  const [articles, setArticles] = useState<ArticleWithValidation[]>([]);
  const [ebooks, setEbooks] = useState<EbookWithValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('score-asc');
  const [selectedArticle, setSelectedArticle] = useState<ArticleWithValidation | null>(null);
  const [selectedEbook, setSelectedEbook] = useState<EbookWithValidation | null>(null);
  const [isFixing, setIsFixing] = useState(false);

  // Settings
  const [minApprovalScore, setMinApprovalScore] = useState(85);
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (currentBlog?.id) {
      fetchContent();
    }
  }, [currentBlog?.id]);

  const fetchContent = async () => {
    if (!currentBlog?.id) return;
    setLoading(true);

    try {
      // Fetch articles
      const { data: articlesData, error: articlesError } = await supabase
        .from("articles")
        .select("*")
        .eq("blog_id", currentBlog.id)
        .in("status", ["draft", "review", "scheduled"])
        .order("updated_at", { ascending: false });

      if (articlesError) throw articlesError;

      // Validate each article
      const validatedArticles = (articlesData || []).map(article => {
        const validation = validateArticle(
          article.content || "",
          article.title,
          article.meta_description || "",
          article.keywords || [],
          article.featured_image_url
        );
        return { ...article, validation };
      });

      setArticles(validatedArticles);

      // Fetch ebooks
      const { data: ebooksData, error: ebooksError } = await supabase
        .from("ebooks")
        .select("*")
        .eq("blog_id", currentBlog.id)
        .in("status", ["draft", "generating", "ready"])
        .order("updated_at", { ascending: false });

      if (ebooksError) throw ebooksError;

      // Validate each ebook
      const validatedEbooks: EbookWithValidation[] = (ebooksData || []).map(ebook => {
        const contentImagesArray = Array.isArray(ebook.content_images) ? ebook.content_images : null;
        const validation = validateEbook(
          ebook.content || "",
          ebook.cover_image_url,
          contentImagesArray,
          {
            title: ebook.cta_title || undefined,
            body: ebook.cta_body || undefined,
            buttonText: ebook.cta_button_text || undefined,
          }
        );
        return { 
          id: ebook.id,
          title: ebook.title,
          slug: ebook.slug,
          status: ebook.status,
          content: ebook.content,
          cover_image_url: ebook.cover_image_url,
          content_images: ebook.content_images,
          cta_title: ebook.cta_title,
          cta_body: ebook.cta_body,
          cta_button_text: ebook.cta_button_text,
          created_at: ebook.created_at,
          updated_at: ebook.updated_at,
          validation 
        };
      });

      setEbooks(validatedEbooks);
    } catch (error) {
      console.error("Error fetching content:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar o conteúdo.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort articles
  const filteredArticles = articles
    .filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase());
      const score = article.validation?.score || 0;
      
      if (scoreFilter === 'critical') return matchesSearch && score < 60;
      if (scoreFilter === 'warning') return matchesSearch && score >= 60 && score < 85;
      if (scoreFilter === 'ok') return matchesSearch && score >= 85;
      return matchesSearch;
    })
    .sort((a, b) => {
      const scoreA = a.validation?.score || 0;
      const scoreB = b.validation?.score || 0;
      
      if (sortOrder === 'score-asc') return scoreA - scoreB;
      if (sortOrder === 'score-desc') return scoreB - scoreA;
      if (sortOrder === 'date-desc') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortOrder === 'name-asc') return a.title.localeCompare(b.title);
      return 0;
    });

  // Filter and sort ebooks
  const filteredEbooks = ebooks
    .filter(ebook => {
      const matchesSearch = ebook.title.toLowerCase().includes(searchTerm.toLowerCase());
      const score = ebook.validation?.score || 0;
      
      if (scoreFilter === 'critical') return matchesSearch && score < 60;
      if (scoreFilter === 'warning') return matchesSearch && score >= 60 && score < 85;
      if (scoreFilter === 'ok') return matchesSearch && score >= 85;
      return matchesSearch;
    })
    .sort((a, b) => {
      const scoreA = a.validation?.score || 0;
      const scoreB = b.validation?.score || 0;
      
      if (sortOrder === 'score-asc') return scoreA - scoreB;
      if (sortOrder === 'score-desc') return scoreB - scoreA;
      if (sortOrder === 'date-desc') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortOrder === 'name-asc') return a.title.localeCompare(b.title);
      return 0;
    });

  // Stats
  const articleStats = {
    total: articles.length,
    critical: articles.filter(a => (a.validation?.score || 0) < 60).length,
    warning: articles.filter(a => (a.validation?.score || 0) >= 60 && (a.validation?.score || 0) < 85).length,
    ok: articles.filter(a => (a.validation?.score || 0) >= 85).length,
    avgScore: articles.length > 0 ? Math.round(articles.reduce((acc, a) => acc + (a.validation?.score || 0), 0) / articles.length) : 0,
  };

  const ebookStats = {
    total: ebooks.length,
    critical: ebooks.filter(e => (e.validation?.score || 0) < 60).length,
    warning: ebooks.filter(e => (e.validation?.score || 0) >= 60 && (e.validation?.score || 0) < 85).length,
    ok: ebooks.filter(e => (e.validation?.score || 0) >= 85).length,
    avgScore: ebooks.length > 0 ? Math.round(ebooks.reduce((acc, e) => acc + (e.validation?.score || 0), 0) / ebooks.length) : 0,
  };

  const handleAutoFixArticle = async (article: ArticleWithValidation) => {
    setIsFixing(true);
    try {
      const { content, metaDescription, appliedFixes } = autoFixArticle(
        article.content || "",
        article.meta_description || ""
      );

      if (appliedFixes.length === 0) {
        toast({ title: "Nenhuma correção aplicável encontrada" });
        return;
      }

      // Update article in database
      const { error } = await supabase
        .from("articles")
        .update({
          content,
          meta_description: metaDescription,
          updated_at: new Date().toISOString(),
        })
        .eq("id", article.id);

      if (error) throw error;

      toast({
        title: "Correções aplicadas",
        description: appliedFixes.join(", "),
      });

      // Refresh data
      await fetchContent();
    } catch (error) {
      console.error("Error auto-fixing article:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível aplicar as correções.",
      });
    } finally {
      setIsFixing(false);
    }
  };

  const handleApproveArticle = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from("articles")
        .update({
          status: "review",
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq("id", articleId);

      if (error) throw error;

      toast({ title: "Artigo aprovado para publicação" });
      await fetchContent();
    } catch (error) {
      console.error("Error approving article:", error);
      toast({
        variant: "destructive",
        title: "Erro ao aprovar artigo",
      });
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return <Badge className="bg-green-100 text-green-800">{score}%</Badge>;
    }
    if (score >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">{score}%</Badge>;
    }
    return <Badge variant="destructive">{score}%</Badge>;
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Painel de Validação</h1>
            <p className="text-muted-foreground">
              Revise, corrija e aprove artigos e e-books antes de publicar
            </p>
          </div>
          <Button onClick={fetchContent} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="h-4 w-4" />
              Artigos ({articles.length})
            </TabsTrigger>
            <TabsTrigger value="ebooks" className="gap-2">
              <BookOpen className="h-4 w-4" />
              E-books ({ebooks.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            {/* Stats Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${articleStats.avgScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{articleStats.avgScore}% média</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      {articleStats.critical} críticos
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      {articleStats.warning} avisos
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {articleStats.ok} OK
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar artigos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={scoreFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScoreFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={scoreFilter === 'critical' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setScoreFilter('critical')}
                >
                  Críticos
                </Button>
                <Button
                  variant={scoreFilter === 'warning' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setScoreFilter('warning')}
                  className={scoreFilter === 'warning' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}
                >
                  Avisos
                </Button>
                <Button
                  variant={scoreFilter === 'ok' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScoreFilter('ok')}
                  className={scoreFilter === 'ok' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                >
                  OK
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(prev => 
                  prev === 'score-asc' ? 'score-desc' : 
                  prev === 'score-desc' ? 'date-desc' : 
                  prev === 'date-desc' ? 'name-asc' : 'score-asc'
                )}
                className="gap-1"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortOrder === 'score-asc' ? 'Score ↑' : 
                 sortOrder === 'score-desc' ? 'Score ↓' : 
                 sortOrder === 'date-desc' ? 'Data' : 'Nome'}
              </Button>
            </div>

            {/* Articles List */}
            <div className="space-y-4">
              {filteredArticles.map(article => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getScoreBadge(article.validation?.score || 0)}
                          <Badge variant="outline">{article.status}</Badge>
                        </div>
                        <h3 className="font-medium truncate">{article.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {article.validation?.issues && article.validation.issues.length > 0 && (
                            <>
                              {article.validation.issues.filter(i => i.type === 'critical').length > 0 && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="h-3 w-3" />
                                  {article.validation.issues.filter(i => i.type === 'critical').length} críticos
                                </span>
                              )}
                              {article.validation.issues.filter(i => i.type === 'warning').length > 0 && (
                                <span className="flex items-center gap-1 text-yellow-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  {article.validation.issues.filter(i => i.type === 'warning').length} avisos
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {article.validation?.issues.some(i => i.canAutoFix) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAutoFixArticle(article)}
                            disabled={isFixing}
                            className="gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            Auto-corrigir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/app/articles/${article.id}/edit`)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </Button>
                        {(article.validation?.score || 0) >= minApprovalScore && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveArticle(article.id)}
                            className="gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Aprovar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedArticle(
                            selectedArticle?.id === article.id ? null : article
                          )}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded validation details */}
                    {selectedArticle?.id === article.id && article.validation && (
                      <div className="mt-4 pt-4 border-t">
                        <ValidationChecklist
                          issues={article.validation.issues}
                          suggestions={article.validation.suggestions}
                          onAutoFixAll={() => handleAutoFixArticle(article)}
                          isFixing={isFixing}
                          type="article"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {filteredArticles.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {articles.length === 0 
                        ? "Nenhum artigo em rascunho ou revisão"
                        : "Nenhum artigo encontrado com os filtros aplicados"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* E-books Tab */}
          <TabsContent value="ebooks" className="space-y-6">
            {/* Stats Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${ebookStats.avgScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{ebookStats.avgScore}% média</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      {ebookStats.critical} críticos
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      {ebookStats.warning} avisos
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {ebookStats.ok} OK
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* E-books List */}
            <div className="space-y-4">
              {filteredEbooks.map(ebook => (
                <Card key={ebook.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getScoreBadge(ebook.validation?.score || 0)}
                          <Badge variant="outline">{ebook.status}</Badge>
                        </div>
                        <h3 className="font-medium truncate">{ebook.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {ebook.validation?.issues && ebook.validation.issues.length > 0 && (
                            <>
                              {ebook.validation.issues.filter(i => i.type === 'critical').length > 0 && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="h-3 w-3" />
                                  {ebook.validation.issues.filter(i => i.type === 'critical').length} críticos
                                </span>
                              )}
                              {ebook.validation.issues.filter(i => i.type === 'warning').length > 0 && (
                                <span className="flex items-center gap-1 text-yellow-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  {ebook.validation.issues.filter(i => i.type === 'warning').length} avisos
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/ebooks/${ebook.id}`)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedEbook(
                            selectedEbook?.id === ebook.id ? null : ebook
                          )}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded validation details */}
                    {selectedEbook?.id === ebook.id && ebook.validation && (
                      <div className="mt-4 pt-4 border-t">
                        <ValidationChecklist
                          issues={ebook.validation.issues}
                          suggestions={ebook.validation.suggestions}
                          type="ebook"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {filteredEbooks.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {ebooks.length === 0 
                        ? "Nenhum e-book em rascunho"
                        : "Nenhum e-book encontrado com os filtros aplicados"}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Validação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Minimum approval score */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Score mínimo para aprovação</Label>
                    <span className="text-sm font-medium">{minApprovalScore}%</span>
                  </div>
                  <Slider
                    value={[minApprovalScore]}
                    onValueChange={(v) => setMinApprovalScore(v[0])}
                    min={50}
                    max={100}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Artigos com score abaixo de {minApprovalScore}% não poderão ser aprovados diretamente
                  </p>
                </div>

                {/* Auto-fix toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-correção habilitada</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite corrigir automaticamente parágrafos longos, blocos visuais e meta descriptions
                    </p>
                  </div>
                  <Switch
                    checked={autoFixEnabled}
                    onCheckedChange={setAutoFixEnabled}
                  />
                </div>

                {/* Criteria weights info */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Pesos dos Critérios</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mínimo 7 H2s</span>
                      <span>15 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seção Resumo</span>
                      <span>10 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seção CTA</span>
                      <span>10 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parágrafos curtos</span>
                      <span>15 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blocos visuais</span>
                      <span>10 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blockquotes</span>
                      <span>5 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Listas</span>
                      <span>5 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mín. 1000 palavras</span>
                      <span>10 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Keyword no título</span>
                      <span>5 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meta description</span>
                      <span>5 pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Imagem destacada</span>
                      <span>5 pts</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
