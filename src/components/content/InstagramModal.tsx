import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, Info, Loader2, Instagram, Video, Image, 
  Upload, X, CheckCircle2, ImageIcon, Images 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InstagramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (data: { posts: ProcessedPost[] }) => void;
}

interface ProcessedPost {
  url: string;
  type: 'image' | 'carousel' | 'reel' | 'unknown';
  suggestedTitle: string;
  content: string;
  hasCaption: boolean;
  hasExtractedText: boolean;
  hasTranscription: boolean;
  videoUrl?: string;
}

interface ExtractedContent {
  textFromImages: string[];
  caption: string | null;
  videoUrl: string | null;
  suggestedTitle: string;
  fullContent: string;
  type: string;
}

export function InstagramModal({ open, onOpenChange, onContinue }: InstagramModalProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'carousel' | 'video'>('image');
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractedContent | null>(null);
  const { toast } = useToast();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxFiles = activeTab === 'carousel' ? 10 : 1;
    const filesToProcess = Array.from(files).slice(0, maxFiles);

    filesToProcess.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB."
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          if (activeTab === 'carousel') {
            setImages(prev => [...prev.slice(0, 9), base64]);
          } else {
            setImages([base64]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }, [activeTab, toast]);

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (images.length === 0 && !caption.trim() && !videoUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Nenhum conteúdo",
        description: "Adicione pelo menos uma imagem, legenda ou URL de vídeo."
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('import-instagram', {
        body: {
          type: activeTab,
          images: images.length > 0 ? images : undefined,
          caption: caption.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
        }
      });

      if (error) throw error;

      if (data.success) {
        setResult(data.extractedContent);
        toast({
          title: "Conteúdo processado!",
          description: "O texto foi extraído com sucesso."
        });
      } else {
        throw new Error(data.error || 'Erro ao processar conteúdo');
      }
    } catch (error) {
      console.error('Error processing Instagram content:', error);
      toast({
        variant: "destructive",
        title: "Erro ao processar",
        description: error instanceof Error ? error.message : "Não foi possível processar o conteúdo."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (!result) return;
    
    const post: ProcessedPost = {
      url: 'upload_manual',
      type: activeTab === 'video' ? 'reel' : activeTab,
      suggestedTitle: result.suggestedTitle,
      content: result.fullContent,
      hasCaption: !!result.caption,
      hasExtractedText: result.textFromImages.length > 0,
      hasTranscription: false,
      videoUrl: result.videoUrl || undefined,
    };

    onContinue({ posts: [post] });
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setImages([]);
    setCaption("");
    setVideoUrl("");
    setResult(null);
    setActiveTab('image');
  };

  const handleBack = () => {
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Criar artigo a partir de Post do Instagram
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-6 py-4">
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v as 'image' | 'carousel' | 'video');
              setImages([]);
            }}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="image" className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Imagem
                </TabsTrigger>
                <TabsTrigger value="carousel" className="flex items-center gap-2">
                  <Images className="h-4 w-4" />
                  Carrossel
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Vídeo/Reel
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Upload da Imagem (print do post)</Label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {images.length > 0 ? (
                      <div className="relative inline-block">
                        <img 
                          src={images[0]} 
                          alt="Preview" 
                          className="max-h-48 rounded-lg mx-auto"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(0);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Clique para selecionar ou arraste a imagem aqui
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (máx 10MB)</p>
                      </div>
                    )}
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </TabsContent>

              <TabsContent value="carousel" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Upload das Imagens do Carrossel (até 10)</Label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById('carousel-upload')?.click()}
                  >
                    {images.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {images.map((img, idx) => (
                            <div key={idx} className="relative">
                              <img 
                                src={img} 
                                alt={`Slide ${idx + 1}`} 
                                className="h-20 w-20 object-cover rounded-lg"
                              />
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute -top-1 -right-1 h-5 w-5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(idx);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center rounded-b-lg">
                                {idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {images.length}/10 imagens • Clique para adicionar mais
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-4">
                        <Images className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Clique para selecionar as imagens do carrossel
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (máx 10MB cada)</p>
                      </div>
                    )}
                  </div>
                  <input
                    id="carousel-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </TabsContent>

              <TabsContent value="video" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Upload de Print do Vídeo (opcional)</Label>
                  <div 
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById('video-thumb-upload')?.click()}
                  >
                    {images.length > 0 ? (
                      <div className="relative inline-block">
                        <img 
                          src={images[0]} 
                          alt="Preview" 
                          className="max-h-32 rounded-lg mx-auto"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(0);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 py-2">
                        <Video className="h-6 w-6 mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Print do vídeo para extração de texto (opcional)
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    id="video-thumb-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL do Vídeo para Embedding</Label>
                  <Input
                    placeholder="https://www.instagram.com/reel/ABC123/ ou https://youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    O vídeo será incorporado no artigo para visualização
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Caption Input - Common for all tabs */}
            <div className="space-y-2">
              <Label>Legenda do Post (opcional)</Label>
              <Textarea
                placeholder="Cole aqui a legenda do post do Instagram..."
                className="min-h-[100px]"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Como funciona:</strong> Faça upload das imagens (prints) do post e a IA vai extrair todo o texto visível. 
                Cole também a legenda do post para um artigo mais completo.
                {activeTab === 'video' && " Para vídeos, cole a URL para embedding e/ou transcreva manualmente o conteúdo na legenda."}
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleProcess} 
              className="w-full"
              disabled={isLoading || (images.length === 0 && !caption.trim() && !videoUrl.trim())}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando com IA...
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Processar com IA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ← Voltar
              </Button>
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Processado
              </Badge>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Título Sugerido</Label>
                  <p className="font-medium mt-1">{result.suggestedTitle}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {result.textFromImages.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {result.textFromImages.length} imagem(ns) processada(s)
                    </Badge>
                  )}
                  {result.caption && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Legenda incluída
                    </Badge>
                  )}
                  {result.videoUrl && (
                    <Badge variant="secondary" className="gap-1">
                      <Video className="h-3 w-3 text-blue-500" />
                      Vídeo para embedding
                    </Badge>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Preview do Conteúdo</Label>
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg max-h-[200px] overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">
                      {result.fullContent.substring(0, 1000)}
                      {result.fullContent.length > 1000 && '...'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleContinue} className="w-full">
              Gerar Artigo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
