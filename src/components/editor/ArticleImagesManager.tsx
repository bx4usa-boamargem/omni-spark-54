import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Image, RefreshCw, Loader2 } from "lucide-react";

interface ContentImage {
  context: string;
  url: string;
  after_section: number;
}

interface ArticleImagesManagerProps {
  articleId: string;
  featuredImageUrl: string | null;
  contentImages: ContentImage[];
  onImagesUpdated: (featuredUrl: string | null, contentImages: ContentImage[]) => void;
}

export function ArticleImagesManager({
  articleId,
  featuredImageUrl,
  contentImages,
  onImagesUpdated
}: ArticleImagesManagerProps) {
  const { toast } = useToast();
  const [regenerating, setRegenerating] = useState<'all' | 'cover' | 'internal' | null>(null);

  const handleRegenerate = async (type: 'all' | 'cover' | 'internal') => {
    setRegenerating(type);
    
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-article-images', {
        body: {
          article_id: articleId,
          regenerate_type: type
        }
      });

      if (error) throw error;

      if (data.success) {
        onImagesUpdated(data.featured_image_url, data.content_images || []);
        
        toast({
          title: "Imagens regeneradas!",
          description: `${data.images_generated} imagem(ns) regenerada(s) com sucesso.`
        });
      }
    } catch (error) {
      console.error('Error regenerating images:', error);
      toast({
        title: "Erro ao regenerar imagens",
        description: "Não foi possível regenerar as imagens. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Image className="h-4 w-4 text-primary" />
          Imagens do Artigo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cover Image */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Imagem de Capa</label>
          {featuredImageUrl ? (
            <div className="relative">
              <img 
                src={featuredImageUrl} 
                alt="Capa" 
                className="w-full h-32 object-cover rounded-lg"
              />
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-2 right-2"
                onClick={() => handleRegenerate('cover')}
                disabled={regenerating !== null}
              >
                {regenerating === 'cover' ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Regenerar
              </Button>
            </div>
          ) : (
            <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Sem imagem de capa</span>
            </div>
          )}
        </div>

        {/* Internal Images */}
        {contentImages.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Imagens Internas</label>
              <span className="text-xs text-muted-foreground">{contentImages.length} imagem(ns)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {contentImages.map((img, index) => (
                <div key={index} className="relative">
                  <img 
                    src={img.url} 
                    alt={img.context} 
                    className="w-full h-20 object-cover rounded"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate rounded-b">
                    {img.context}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRegenerate('internal')}
            disabled={regenerating !== null}
            className="w-full"
          >
            {regenerating === 'internal' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerar Internas
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => handleRegenerate('all')}
            disabled={regenerating !== null}
            className="w-full"
          >
            {regenerating === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerar Todas
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          A regeneração usa IA para criar novas imagens baseadas no conteúdo atual do artigo.
        </p>
      </CardContent>
    </Card>
  );
}
