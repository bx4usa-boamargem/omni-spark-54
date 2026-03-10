import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy, Download, ExternalLink, Instagram, Linkedin,
  Share2, Sparkles, Loader2, CheckCircle2, AlertCircle,
  Facebook, Globe, BookOpen, RefreshCw, ChevronLeft, ChevronRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InstagramContent {
  slides: { title: string; body: string; emoji?: string }[];
  caption: string;
  hashtags: string[];
}

interface LinkedInContent {
  post_text: string;
  summary: string;
  call_to_action: string;
}

interface FacebookContent {
  post_text: string;
  summary: string;
  image_description: string;
}

interface GoogleBusinessContent {
  title: string;
  summary: string;
  call_to_action: string;
  call_to_action_url?: string;
}

interface SocialContent {
  instagram?: InstagramContent;
  linkedin?: LinkedInContent;
  facebook?: FacebookContent;
  google_business?: GoogleBusinessContent;
}

interface ContentMultiplierPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleId: string;
  title: string;
  excerpt: string;
  featuredImage: string | null;
  articleUrl?: string;
  keywords?: string[];
}

type PlatformStatus = 'idle' | 'publishing' | 'published' | 'failed' | 'no_credentials';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PlatformBadge({ status }: { status: PlatformStatus }) {
  if (status === 'published') return <Badge variant="default" className="bg-green-600 text-xs">Publicado</Badge>;
  if (status === 'failed') return <Badge variant="destructive" className="text-xs">Erro</Badge>;
  if (status === 'no_credentials') return <Badge variant="outline" className="text-xs text-amber-500 border-amber-400">Sem credenciais</Badge>;
  if (status === 'publishing') return <Badge variant="secondary" className="text-xs">Publicando…</Badge>;
  return null;
}

function SlidePreview({ slides, currentIndex, onPrev, onNext }: {
  slides: InstagramContent['slides'];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const slide = slides[currentIndex];
  return (
    <div className="relative bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl aspect-square max-w-[280px] mx-auto flex flex-col items-center justify-center p-6 text-white shadow-lg select-none">
      <div className="absolute top-3 left-0 right-0 flex justify-center gap-1">
        {slides.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
        ))}
      </div>
      <span className="text-4xl mb-3">{slide.emoji || '📌'}</span>
      <p className="font-bold text-center text-sm leading-tight mb-2">{slide.title}</p>
      <p className="text-center text-xs opacity-90 leading-snug">{slide.body}</p>
      <div className="absolute inset-y-0 left-2 flex items-center">
        <button onClick={onPrev} disabled={currentIndex === 0} className="p-1 rounded-full bg-black/30 disabled:opacity-30 hover:bg-black/50 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-2 flex items-center">
        <button onClick={onNext} disabled={currentIndex === slides.length - 1} className="p-1 rounded-full bg-black/30 disabled:opacity-30 hover:bg-black/50 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="absolute bottom-3 right-3 text-xs opacity-60">{currentIndex + 1}/{slides.length}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContentMultiplierPanel({
  open,
  onOpenChange,
  articleId,
  title,
  excerpt,
  featuredImage,
  articleUrl,
  keywords = [],
}: ContentMultiplierPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("instagram");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [socialContent, setSocialContent] = useState<SocialContent | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<Record<string, string>>({});
  const [platformStatus, setPlatformStatus] = useState<Record<string, PlatformStatus>>({});
  const [slideIndex, setSlideIndex] = useState(0);

  // ── Gerar conteúdo social com IA ─────────────────────────────────────────
  const generateSocialContent = useCallback(async () => {
    setIsGenerating(true);
    setSocialContent(null);
    setSavedPostIds({});
    setPlatformStatus({});
    setSlideIndex(0);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        toast({ title: "Sessão expirada. Faça login novamente.", variant: "destructive" });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-social-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          article_id: articleId,
          platforms: ['instagram', 'linkedin', 'facebook', 'google_business'],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      setSocialContent(data.content);
      setSavedPostIds(data.saved_post_ids || {});
      toast({ title: "✨ Conteúdo gerado com sucesso!", description: "Revise e publique nas plataformas." });

    } catch (error) {
      toast({
        title: "Erro ao gerar conteúdo",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [articleId, toast]);

  // ── Publicar em uma plataforma ────────────────────────────────────────────
  const publishToPlatform = useCallback(async (platform: string) => {
    const postId = savedPostIds[platform];
    if (!postId) {
      toast({ title: "Gere o conteúdo antes de publicar.", variant: "destructive" });
      return;
    }

    setPlatformStatus(prev => ({ ...prev, [platform]: 'publishing' }));

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/publish-social-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          social_post_id: postId,
          article_url: articleUrl,
          image_url: featuredImage,
        }),
      });

      const data = await response.json();

      if (data.status === 'no_credentials') {
        setPlatformStatus(prev => ({ ...prev, [platform]: 'no_credentials' }));
        toast({
          title: "Credenciais não configuradas",
          description: `Conecte sua conta em Configurações → Integrações para publicar no ${platform}.`,
        });
        return;
      }

      if (data.success) {
        setPlatformStatus(prev => ({ ...prev, [platform]: 'published' }));
        toast({ title: `✅ Publicado no ${platform}!` });
      } else {
        setPlatformStatus(prev => ({ ...prev, [platform]: 'failed' }));
        toast({
          title: `Erro ao publicar no ${platform}`,
          description: data.error || "Verifique suas credenciais.",
          variant: "destructive",
        });
      }

    } catch (error) {
      setPlatformStatus(prev => ({ ...prev, [platform]: 'failed' }));
      toast({
        title: "Erro na publicação",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }, [savedPostIds, articleUrl, featuredImage, toast]);

  // ── Baixar PDF / eBook ────────────────────────────────────────────────────
  const downloadPdf = useCallback(async () => {
    setIsDownloadingPdf(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-article-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ article_id: articleId }),
      });

      if (!response.ok) throw new Error('Erro ao gerar PDF');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.slice(0, 40).replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "📄 PDF baixado com sucesso!" });

    } catch (error) {
      toast({
        title: "Erro ao gerar PDF",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [articleId, title, toast]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  const hashtags = keywords.slice(0, 5).map(k => `#${k.replace(/\s+/g, '')}`).join(' ');
  const instagramFallback = `📚 ${title}\n\n${excerpt}\n\n${hashtags}\n\n🔗 Link na bio`;
  const linkedInFallback = `${title}\n\n${excerpt}\n\n${hashtags}\n\n${articleUrl || ''}`;

  const instagramData = socialContent?.instagram;
  const linkedInData = socialContent?.linkedin;
  const facebookData = socialContent?.facebook;
  const googleData = socialContent?.google_business;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Multiplicar Conteúdo
          </DialogTitle>
        </DialogHeader>

        {/* Botão de geração centralizado */}
        <div className="flex flex-col items-center gap-2 py-3 border-b">
          <Button
            onClick={generateSocialContent}
            disabled={isGenerating}
            className="gap-2"
            size="lg"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Gerando com IA…</>
            ) : socialContent ? (
              <><RefreshCw className="h-4 w-4" />Regenerar Conteúdo</>
            ) : (
              <><Sparkles className="h-4 w-4" />Gerar Conteúdo para Todas as Redes</>
            )}
          </Button>
          {socialContent && (
            <p className="text-xs text-muted-foreground">Conteúdo gerado com IA. Revise antes de publicar.</p>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ebook" className="flex items-center gap-1 text-xs">
              <BookOpen className="h-3 w-3" />
              eBook
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex items-center gap-1 text-xs">
              <Instagram className="h-3 w-3" />
              Instagram
              <PlatformBadge status={platformStatus['instagram'] || 'idle'} />
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="flex items-center gap-1 text-xs">
              <Linkedin className="h-3 w-3" />
              LinkedIn
              <PlatformBadge status={platformStatus['linkedin'] || 'idle'} />
            </TabsTrigger>
            <TabsTrigger value="facebook" className="flex items-center gap-1 text-xs">
              <Facebook className="h-3 w-3" />
              Facebook
              <PlatformBadge status={platformStatus['facebook'] || 'idle'} />
            </TabsTrigger>
            <TabsTrigger value="google_business" className="flex items-center gap-1 text-xs">
              <Globe className="h-3 w-3" />
              Google
              <PlatformBadge status={platformStatus['google_business'] || 'idle'} />
            </TabsTrigger>
          </TabsList>

          {/* ─── eBook ─────────────────────────────────────────────────── */}
          <TabsContent value="ebook" className="space-y-4 mt-4">
            <div className="rounded-lg border bg-muted/20 p-6 text-center space-y-4">
              <BookOpen className="h-12 w-12 mx-auto text-primary" />
              <div>
                <h3 className="font-semibold text-lg mb-1">Exportar como PDF / eBook</h3>
                <p className="text-sm text-muted-foreground">
                  Gere um PDF profissional do artigo para distribuir como eBook ou material rico.
                </p>
              </div>
              {featuredImage && (
                <img
                  src={featuredImage}
                  alt="Capa"
                  className="w-32 h-32 object-cover rounded-lg mx-auto shadow"
                />
              )}
              <Button onClick={downloadPdf} disabled={isDownloadingPdf} size="lg" className="gap-2">
                {isDownloadingPdf ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Gerando PDF…</>
                ) : (
                  <><Download className="h-4 w-4" />Baixar PDF / eBook</>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ─── Instagram ──────────────────────────────────────────────── */}
          <TabsContent value="instagram" className="space-y-4 mt-4">
            {instagramData?.slides?.length ? (
              <SlidePreview
                slides={instagramData.slides}
                currentIndex={slideIndex}
                onPrev={() => setSlideIndex(i => Math.max(0, i - 1))}
                onNext={() => setSlideIndex(i => Math.min(instagramData.slides.length - 1, i + 1))}
              />
            ) : featuredImage ? (
              <div className="rounded-xl overflow-hidden max-w-[280px] mx-auto shadow">
                <img src={featuredImage} alt="Preview" className="w-full aspect-square object-cover" />
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium">Legenda para Instagram</label>
              <Textarea
                value={instagramData
                  ? `${instagramData.caption}\n\n${instagramData.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}`
                  : instagramFallback}
                readOnly
                className="min-h-[120px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {(instagramData
                  ? `${instagramData.caption} ${instagramData.hashtags.join(' ')}`
                  : instagramFallback).length}/2200 caracteres
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copyToClipboard(
                  instagramData
                    ? `${instagramData.caption}\n\n${instagramData.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}`
                    : instagramFallback,
                  "Legenda"
                )}
              >
                <Copy className="mr-2 h-4 w-4" />Copiar Legenda
              </Button>
              {featuredImage && (
                <Button variant="outline" className="flex-1" onClick={async () => {
                  try {
                    const blob = await fetch(featuredImage).then(r => r.blob());
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `${title.slice(0, 30).replace(/\s+/g, '-')}.jpg`;
                    a.click(); URL.revokeObjectURL(url);
                    toast({ title: "Imagem baixada!" });
                  } catch { toast({ title: "Erro ao baixar imagem", variant: "destructive" }); }
                }}>
                  <Download className="mr-2 h-4 w-4" />Baixar Imagem
                </Button>
              )}
              <Button
                className="flex-1"
                disabled={!savedPostIds['instagram'] || platformStatus['instagram'] === 'publishing' || platformStatus['instagram'] === 'published'}
                onClick={() => publishToPlatform('instagram')}
              >
                {platformStatus['instagram'] === 'publishing' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : platformStatus['instagram'] === 'published' ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <Instagram className="mr-2 h-4 w-4" />
                )}
                Publicar
              </Button>
            </div>
          </TabsContent>

          {/* ─── LinkedIn ───────────────────────────────────────────────── */}
          <TabsContent value="linkedin" className="space-y-4 mt-4">
            {featuredImage && (
              <div className="rounded-lg overflow-hidden border max-w-full shadow-sm">
                <img src={featuredImage} alt="Preview" className="w-full h-40 object-cover" />
                <div className="p-3 bg-muted/30">
                  <p className="font-semibold text-sm">{title}</p>
                  {linkedInData?.summary && (
                    <p className="text-xs text-muted-foreground mt-0.5">{linkedInData.summary}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Texto para LinkedIn</label>
              <Textarea
                value={linkedInData?.post_text || linkedInFallback}
                readOnly
                className="min-h-[140px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {(linkedInData?.post_text || linkedInFallback).length}/3000 caracteres
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copyToClipboard(linkedInData?.post_text || linkedInFallback, "Texto")}
              >
                <Copy className="mr-2 h-4 w-4" />Copiar Texto
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={!articleUrl}
                onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl || '')}`, '_blank', 'width=600,height=600')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />Abrir LinkedIn
              </Button>
              <Button
                className="flex-1"
                disabled={!savedPostIds['linkedin'] || platformStatus['linkedin'] === 'publishing' || platformStatus['linkedin'] === 'published'}
                onClick={() => publishToPlatform('linkedin')}
              >
                {platformStatus['linkedin'] === 'publishing' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : platformStatus['linkedin'] === 'published' ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <Linkedin className="mr-2 h-4 w-4" />
                )}
                Publicar
              </Button>
            </div>
          </TabsContent>

          {/* ─── Facebook ───────────────────────────────────────────────── */}
          <TabsContent value="facebook" className="space-y-4 mt-4">
            {featuredImage && (
              <div className="rounded-lg overflow-hidden border shadow-sm">
                <img src={featuredImage} alt="Preview" className="w-full h-40 object-cover" />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Texto para Facebook</label>
              <Textarea
                value={facebookData
                  ? `${facebookData.post_text}\n\n${articleUrl || ''}`
                  : `${excerpt}\n\n${articleUrl || ''}`}
                readOnly
                className="min-h-[120px] text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copyToClipboard(
                  facebookData ? `${facebookData.post_text}\n\n${articleUrl || ''}` : `${excerpt}\n\n${articleUrl || ''}`,
                  "Texto"
                )}
              >
                <Copy className="mr-2 h-4 w-4" />Copiar Texto
              </Button>
              {articleUrl && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`, '_blank', 'width=600,height=600')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />Abrir Facebook
                </Button>
              )}
              <Button
                className="flex-1"
                disabled={!savedPostIds['facebook'] || platformStatus['facebook'] === 'publishing' || platformStatus['facebook'] === 'published'}
                onClick={() => publishToPlatform('facebook')}
              >
                {platformStatus['facebook'] === 'publishing' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : platformStatus['facebook'] === 'published' ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <Facebook className="mr-2 h-4 w-4" />
                )}
                Publicar
              </Button>
            </div>
          </TabsContent>

          {/* ─── Google Business ────────────────────────────────────────── */}
          <TabsContent value="google_business" className="space-y-4 mt-4">
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-sm">Google Meu Negócio</span>
              </div>
              {featuredImage && (
                <img src={featuredImage} alt="Capa" className="rounded-lg w-full h-36 object-cover" />
              )}
              {googleData ? (
                <>
                  <p className="font-bold text-sm">{googleData.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{googleData.summary}</p>
                  <div className="flex items-center gap-2 text-blue-600 text-sm">
                    <Globe className="h-4 w-4" />
                    <span>{googleData.call_to_action}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <p>Gere o conteúdo com IA para ver o preview do Google Meu Negócio</p>
                </div>
              )}
            </div>

            {googleData && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Texto do Post</label>
                <Textarea value={googleData.summary} readOnly className="min-h-[100px] text-sm" />
                <p className="text-xs text-muted-foreground">{googleData.summary.length}/1500 caracteres</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!googleData}
                onClick={() => googleData && copyToClipboard(googleData.summary, "Texto")}
              >
                <Copy className="mr-2 h-4 w-4" />Copiar Texto
              </Button>
              <Button
                className="flex-1"
                disabled={!savedPostIds['google_business'] || platformStatus['google_business'] === 'publishing' || platformStatus['google_business'] === 'published'}
                onClick={() => publishToPlatform('google_business')}
              >
                {platformStatus['google_business'] === 'publishing' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : platformStatus['google_business'] === 'published' ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                Publicar
              </Button>
            </div>

            {platformStatus['google_business'] === 'no_credentials' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Conecte o Google Meu Negócio em <strong>Configurações → Integrações</strong> para publicar automaticamente.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
