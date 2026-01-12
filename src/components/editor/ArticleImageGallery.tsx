import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Image, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContentImage {
  context: string;
  url: string;
  after_section: number;
}

interface ArticleImageGalleryProps {
  articleId: string;
  featuredImageUrl: string | null;
  contentImages: ContentImage[];
  category?: string | null;
  onImagesUpdated: (featuredUrl: string | null, contentImages: ContentImage[]) => void;
}

export const ArticleImageGallery = ({
  articleId,
  featuredImageUrl,
  contentImages,
  category,
  onImagesUpdated,
}: ArticleImageGalleryProps) => {
  const { toast } = useToast();
  const [regeneratingCover, setRegeneratingCover] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);

  // Regenerate a single image
  const handleRegenerateSingle = async (imageType: 'cover' | 'internal', imageIndex?: number, context?: string) => {
    if (imageType === 'cover') {
      setRegeneratingCover(true);
    } else if (imageIndex !== undefined) {
      setRegeneratingIndex(imageIndex);
    }

    try {
      const { data, error } = await supabase.functions.invoke('regenerate-single-image', {
        body: {
          article_id: articleId,
          image_type: imageType,
          image_index: imageIndex,
          context: context,
          category: category,
        },
      });

      if (error) throw error;

      if (data.success) {
        if (imageType === 'cover') {
          onImagesUpdated(data.featured_image_url, contentImages);
          toast({
            title: "Capa regenerada",
            description: "A imagem de capa foi regenerada com sucesso.",
          });
        } else if (imageIndex !== undefined && data.content_images) {
          onImagesUpdated(featuredImageUrl, data.content_images);
          toast({
            title: "Imagem regenerada",
            description: `A imagem "${context || 'interna'}" foi regenerada com sucesso.`,
          });
        }
      }
    } catch (error) {
      console.error('Error regenerating image:', error);
      toast({
        variant: "destructive",
        title: "Erro ao regenerar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setRegeneratingCover(false);
      setRegeneratingIndex(null);
    }
  };

  // Regenerate all images
  const handleRegenerateAll = async () => {
    setRegeneratingAll(true);

    try {
      const { data, error } = await supabase.functions.invoke('regenerate-article-images', {
        body: {
          article_id: articleId,
          regenerate_type: 'all',
        },
      });

      if (error) throw error;

      if (data.success) {
        onImagesUpdated(data.featured_image_url, data.content_images || []);
        toast({
          title: "Imagens regeneradas",
          description: `${data.images_generated} imagem(ns) regenerada(s) com sucesso.`,
        });
      }
    } catch (error) {
      console.error('Error regenerating all images:', error);
      toast({
        variant: "destructive",
        title: "Erro ao regenerar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setRegeneratingAll(false);
    }
  };

  const contextLabels: Record<string, string> = {
    problem: 'Problema',
    solution: 'Solução',
    result: 'Resultado',
    insight: 'Insight',
    cta: 'CTA',
  };

  const getContextLabel = (context: string) => {
    const normalizedContext = context.toLowerCase();
    for (const [key, label] of Object.entries(contextLabels)) {
      if (normalizedContext.includes(key)) return label;
    }
    return context.length > 20 ? context.substring(0, 20) + '...' : context;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Image className="h-4 w-4" />
          Galeria de Imagens
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerateAll}
          disabled={regeneratingAll || regeneratingCover || regeneratingIndex !== null}
          className="gap-1.5"
        >
          {regeneratingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          Regenerar Todas
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Featured Image */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Imagem de Capa</span>
            <Badge variant="secondary" className="text-xs">Hero</Badge>
          </div>
          <div className="relative group">
            {featuredImageUrl ? (
              <img
                src={featuredImageUrl}
                alt="Capa do artigo"
                className="w-full h-48 object-cover rounded-lg border"
              />
            ) : (
              <div className="w-full h-48 bg-muted rounded-lg border flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Sem imagem de capa</span>
              </div>
            )}
            {/* Overlay with regenerate button */}
            <div className={cn(
              "absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center transition-opacity",
              regeneratingCover ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRegenerateSingle('cover')}
                disabled={regeneratingCover || regeneratingAll}
                className="gap-1.5"
              >
                {regeneratingCover ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Regenerar Capa
              </Button>
            </div>
          </div>
        </div>

        {/* Content Images Grid */}
        {contentImages.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Imagens Internas ({contentImages.length})
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {contentImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={image.context || `Imagem ${index + 1}`}
                    className="w-full h-28 object-cover rounded-lg border"
                  />
                  {/* Context badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-1 left-1 text-xs bg-black/60 text-white border-0"
                  >
                    {getContextLabel(image.context)}
                  </Badge>
                  {/* Overlay with regenerate button */}
                  <div className={cn(
                    "absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center transition-opacity",
                    regeneratingIndex === index ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRegenerateSingle('internal', index, image.context)}
                      disabled={regeneratingIndex === index || regeneratingAll}
                      className="gap-1 px-2"
                    >
                      {regeneratingIndex === index ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {contentImages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma imagem interna gerada ainda.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
