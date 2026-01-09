import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Download, Sparkles, AlertCircle, Eye, Settings, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArticleSelector } from "@/components/ebooks/ArticleSelector";
import { EbookCoverPreview } from "@/components/ebooks/EbookCoverPreview";
import { EbookContentPreview } from "@/components/ebooks/EbookContentPreview";
import { EbookFullPreview } from "@/components/ebooks/EbookFullPreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
interface Blog {
  id: string;
  author_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface Article {
  id: string;
  title: string;
  content: string;
  featured_image_url: string | null;
}

interface Ebook {
  id: string;
  title: string;
  status: string;
  word_count_target: number;
  content: string | null;
  cover_image_url: string | null;
  author: string | null;
  logo_url: string | null;
  light_color: string;
  accent_color: string;
  cta_title: string | null;
  cta_body: string | null;
  cta_button_text: string | null;
  cta_button_link: string | null;
  pdf_url: string | null;
  source_article_id: string | null;
  error_message: string | null;
  download_count?: number;
  slug?: string;
  is_public?: boolean;
}

export default function EbookDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [ebook, setEbook] = useState<Partial<Ebook>>({
    title: "",
    word_count_target: 1200,
    light_color: "#f8fafc",
    accent_color: "#6366f1",
    cta_title: "Gostou do conteúdo?",
    cta_body: "Entre em contato conosco para saber mais sobre como podemos ajudar seu negócio.",
    cta_button_text: "Fale Conosco",
    cta_button_link: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchBlogAndEbook();
  }, [user, id]);

  // Polling for ebook status when generating
  useEffect(() => {
    if (ebook.status !== "generating" || !id || isNew) return;
    
    const pollInterval = setInterval(async () => {
      const { data: ebookData } = await supabase
        .from("ebooks")
        .select("status, content, cover_image_url, pdf_url, error_message")
        .eq("id", id)
        .maybeSingle();
      
      if (ebookData) {
        if (ebookData.status === "ready") {
          setEbook((prev) => ({ 
            ...prev, 
            status: "ready",
            content: ebookData.content,
            cover_image_url: ebookData.cover_image_url,
            pdf_url: ebookData.pdf_url,
            error_message: null
          }));
          setGenerating(false);
          toast({ title: "eBook gerado com sucesso!" });
          clearInterval(pollInterval);
        } else if (ebookData.status === "error") {
          setEbook((prev) => ({ 
            ...prev, 
            status: "error",
            error_message: ebookData.error_message
          }));
          setGenerating(false);
          toast({ title: "Erro ao gerar eBook", description: ebookData.error_message || "", variant: "destructive" });
          clearInterval(pollInterval);
        }
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  }, [ebook.status, id, isNew]);

  const fetchBlogAndEbook = async () => {
    try {
      const { data: blogData } = await supabase
        .from("blogs")
        .select("id, author_name, logo_url, primary_color, secondary_color")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (blogData) {
        setBlog(blogData);
        setEbook((prev) => ({
          ...prev,
          author: prev.author || blogData.author_name || "",
          logo_url: prev.logo_url || blogData.logo_url || "",
          accent_color: prev.accent_color || blogData.primary_color || "#6366f1",
        }));
      }

      if (!isNew && id) {
        const { data: ebookData } = await supabase
          .from("ebooks")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (ebookData) {
          setEbook(ebookData);
          // If still generating, keep generating state
          if (ebookData.status === "generating") {
            setGenerating(true);
          }
          if (ebookData.source_article_id) {
            const { data: articleData } = await supabase
              .from("articles")
              .select("id, title, content, featured_image_url")
              .eq("id", ebookData.source_article_id)
              .maybeSingle();
            setSelectedArticle(articleData);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!blog || !selectedArticle) {
      toast({ title: "Selecione um artigo de referência", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const ebookData = {
        blog_id: blog.id,
        source_article_id: selectedArticle.id,
        title: ebook.title || selectedArticle.title,
        word_count_target: ebook.word_count_target,
        author: ebook.author,
        logo_url: ebook.logo_url,
        light_color: ebook.light_color,
        accent_color: ebook.accent_color,
        cta_title: ebook.cta_title,
        cta_body: ebook.cta_body,
        cta_button_text: ebook.cta_button_text,
        cta_button_link: ebook.cta_button_link,
        // Only set status to draft for new ebooks, preserve existing status for generated ones
        ...(isNew && { status: "draft" }),
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("ebooks")
          .insert(ebookData)
          .select()
          .single();

        if (error) throw error;
        toast({ title: "eBook salvo com sucesso!" });
        navigate(`/ebooks/${data.id}`);
      } else {
        const { error } = await supabase
          .from("ebooks")
          .update(ebookData)
          .eq("id", id);

        if (error) throw error;
        toast({ title: "eBook atualizado!" });
      }
    } catch (error) {
      console.error("Error saving ebook:", error);
      toast({ title: "Erro ao salvar eBook", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!blog || !selectedArticle || !id || isNew) {
      toast({ title: "Salve o eBook antes de gerar", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      // Update status to generating
      await supabase.from("ebooks").update({ status: "generating", error_message: null }).eq("id", id);
      setEbook((prev) => ({ ...prev, status: "generating", error_message: null }));

      // Call edge function using supabase.functions.invoke for better reliability
      const { data: result, error: invokeError } = await supabase.functions.invoke('generate-ebook-content', {
        body: {
          ebook_id: id,
          article_id: selectedArticle.id,
          article_title: selectedArticle.title,
          article_content: selectedArticle.content,
          word_count_target: ebook.word_count_target,
          author: ebook.author,
          logo_url: ebook.logo_url,
          light_color: ebook.light_color,
          accent_color: ebook.accent_color,
          cta_title: ebook.cta_title,
          cta_body: ebook.cta_body,
          cta_button_text: ebook.cta_button_text,
          cta_button_link: ebook.cta_button_link,
        }
      });

      if (invokeError) {
        throw new Error(invokeError.message || "Erro ao gerar eBook");
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      toast({ title: "eBook gerado com sucesso!" });
      fetchBlogAndEbook(); // Refresh data
    } catch (error) {
      console.error("Error generating ebook:", error);
      await supabase
        .from("ebooks")
        .update({ status: "error", error_message: error instanceof Error ? error.message : "Erro desconhecido" })
        .eq("id", id);
      setEbook((prev) => ({ ...prev, status: "error", error_message: error instanceof Error ? error.message : "Erro desconhecido" }));
      toast({ title: "Erro ao gerar eBook", description: error instanceof Error ? error.message : "", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
    if (!ebook.title) {
      setEbook((prev) => ({ ...prev, title: article.title }));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const statusBadge = () => {
    switch (ebook.status) {
      case "ready":
        return <Badge className="bg-green-500/10 text-green-500">Pronto</Badge>;
      case "generating":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Gerando...</Badge>;
      case "error":
        return <Badge className="bg-red-500/10 text-red-500">Erro</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/ebooks")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-bold text-foreground">
                  {isNew ? "Novo eBook" : "Detalhes do eBook"}
                </h1>
                {!isNew && statusBadge()}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
            {!isNew && ebook.status !== "ready" && (
              <Button className="gradient-primary gap-2" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Gerar eBook
              </Button>
            )}
            {ebook.status === "ready" && (
              <>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowFullPreview(true)}
                >
                  <Eye className="h-4 w-4" />
                  Visualizar Completo
                </Button>
                {ebook.slug && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => window.open(`/ebook/${ebook.slug}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver Landing Page
                  </Button>
                )}
              </>
            )}
            {ebook.pdf_url && (
              <Button
                className="gap-2"
                onClick={async () => {
                  setDownloading(true);
                  try {
                    // Validate PDF URL
                    if (!ebook.pdf_url) {
                      toast({ title: "PDF não disponível", variant: "destructive" });
                      return;
                    }
                    
                    // Check if file is accessible
                    const response = await fetch(ebook.pdf_url, { method: 'HEAD' });
                    if (!response.ok) {
                      toast({ 
                        title: "PDF não encontrado", 
                        description: "Tente regenerar o eBook",
                        variant: "destructive" 
                      });
                      return;
                    }
                    
                    // Increment download count
                    await supabase
                      .from('ebooks')
                      .update({ download_count: (ebook.download_count || 0) + 1 })
                      .eq('id', id);
                    
                    // Download
                    const link = document.createElement('a');
                    link.href = ebook.pdf_url;
                    link.download = `${ebook.title || 'ebook'}.pdf`;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    toast({ title: "Download iniciado!" });
                  } catch (error) {
                    console.error('Download error:', error);
                    toast({ 
                      title: "Erro no download", 
                      description: "Verifique sua conexão e tente novamente",
                      variant: "destructive" 
                    });
                  } finally {
                    setDownloading(false);
                  }
                }}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Baixar PDF
              </Button>
            )}
          </div>
        </div>

        {/* Full Preview Dialog */}
        <EbookFullPreview
          open={showFullPreview}
          onOpenChange={setShowFullPreview}
          title={ebook.title || ""}
          author={ebook.author || ""}
          content={ebook.content || null}
          coverImageUrl={ebook.cover_image_url || null}
          accentColor={ebook.accent_color || "#6366f1"}
          lightColor={ebook.light_color || "#f8fafc"}
          ctaTitle={ebook.cta_title || undefined}
          ctaBody={ebook.cta_body || undefined}
          ctaButtonText={ebook.cta_button_text || undefined}
        />

        {/* Generation Banner */}
        {ebook.status !== "ready" && !isNew && (
          <Alert className="border-primary/20 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              <strong>Pronto para gerar?</strong> Clique em "Gerar eBook" para criar o conteúdo expandido,
              capa e PDF automaticamente. Créditos serão consumidos apenas nesta etapa.
            </AlertDescription>
          </Alert>
        )}

        {ebook.error_message && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{ebook.error_message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Artigo de Referência</CardTitle>
              </CardHeader>
              <CardContent>
                <ArticleSelector
                  blogId={blog?.id || ""}
                  selectedArticle={selectedArticle}
                  onSelect={handleArticleSelect}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações do eBook</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título do eBook</Label>
                  <Input
                    value={ebook.title || ""}
                    onChange={(e) => setEbook({ ...ebook, title: e.target.value })}
                    placeholder="Título do eBook"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tamanho (palavras)</Label>
                  <Select
                    value={String(ebook.word_count_target)}
                    onValueChange={(v) => setEbook({ ...ebook, word_count_target: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="800">800 palavras (curto)</SelectItem>
                      <SelectItem value="1200">1.200 palavras (médio)</SelectItem>
                      <SelectItem value="1500">1.500 palavras (longo)</SelectItem>
                      <SelectItem value="2000">2.000 palavras (completo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Autor</Label>
                  <Input
                    value={ebook.author || ""}
                    onChange={(e) => setEbook({ ...ebook, author: e.target.value })}
                    placeholder="Nome do autor"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={ebook.light_color || "#f8fafc"}
                        onChange={(e) => setEbook({ ...ebook, light_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={ebook.light_color || "#f8fafc"}
                        onChange={(e) => setEbook({ ...ebook, light_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={ebook.accent_color || "#6366f1"}
                        onChange={(e) => setEbook({ ...ebook, accent_color: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={ebook.accent_color || "#6366f1"}
                        onChange={(e) => setEbook({ ...ebook, accent_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Banner CTA (Chamada para Ação)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título do Banner</Label>
                  <Input
                    value={ebook.cta_title || ""}
                    onChange={(e) => setEbook({ ...ebook, cta_title: e.target.value })}
                    placeholder="Gostou do conteúdo?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Corpo do Banner</Label>
                  <Textarea
                    value={ebook.cta_body || ""}
                    onChange={(e) => setEbook({ ...ebook, cta_body: e.target.value })}
                    placeholder="Entre em contato conosco..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto do Botão</Label>
                    <Input
                      value={ebook.cta_button_text || ""}
                      onChange={(e) => setEbook({ ...ebook, cta_button_text: e.target.value })}
                      placeholder="Fale Conosco"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link do Botão</Label>
                    <Input
                      value={ebook.cta_button_link || ""}
                      onChange={(e) => setEbook({ ...ebook, cta_button_link: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Prévia do eBook
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="content">Conteúdo</TabsTrigger>
                    <TabsTrigger value="cover">Capa</TabsTrigger>
                    <TabsTrigger value="cta">CTA</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="content">
                    <EbookContentPreview
                      title={ebook.title || selectedArticle?.title || "Título do eBook"}
                      content={ebook.content || null}
                      author={ebook.author || ""}
                      logoUrl={ebook.logo_url || ""}
                      lightColor={ebook.light_color || "#f8fafc"}
                      accentColor={ebook.accent_color || "#6366f1"}
                      coverImageUrl={ebook.cover_image_url || selectedArticle?.featured_image_url}
                      ctaTitle={ebook.cta_title || ""}
                      ctaBody={ebook.cta_body || ""}
                      ctaButtonText={ebook.cta_button_text || ""}
                    />
                  </TabsContent>
                  
                  <TabsContent value="cover">
                    <EbookCoverPreview
                      title={ebook.title || selectedArticle?.title || "Título do eBook"}
                      author={ebook.author || ""}
                      logoUrl={ebook.logo_url || ""}
                      accentColor={ebook.accent_color || "#6366f1"}
                      coverImageUrl={ebook.cover_image_url || selectedArticle?.featured_image_url}
                    />
                  </TabsContent>
                  
                  <TabsContent value="cta">
                    <div
                      className="rounded-lg p-8 text-center space-y-4 aspect-[3/4] flex flex-col items-center justify-center"
                      style={{ backgroundColor: ebook.accent_color || "#6366f1" }}
                    >
                      <h3 className="text-2xl font-bold text-white">
                        {ebook.cta_title || "Gostou do conteúdo?"}
                      </h3>
                      <p className="text-white/90 text-sm max-w-[80%]">
                        {ebook.cta_body || "Entre em contato conosco para saber mais."}
                      </p>
                      <Button
                        variant="secondary"
                        className="bg-white text-foreground hover:bg-white/90"
                      >
                        {ebook.cta_button_text || "Fale Conosco"}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
