import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { FileText, Search, MessageSquare, RefreshCw, Loader2, ImageIcon, CheckCircle2, XCircle } from "lucide-react";
import type { ArticleData } from "@/utils/streamArticle";
import type { ContentImage, ImageGenerationProgress } from "@/utils/generateContentImages";

interface ArticlePreviewProps {
  article: ArticleData | null;
  streamingText: string;
  isStreaming: boolean;
  featuredImage?: string | null;
  contentImages?: ContentImage[];
  isGeneratingImages?: boolean;
  imageProgress?: ImageGenerationProgress | null;
  onRegenerateImages?: () => void;
}

const contextLabels: Record<string, string> = {
  hero: 'Capa',
  problem: 'Problema',
  solution: 'Solução',
  result: 'Resultado'
};

export function ArticlePreview({ 
  article, 
  streamingText, 
  isStreaming, 
  featuredImage, 
  contentImages = [],
  isGeneratingImages, 
  imageProgress,
  onRegenerateImages 
}: ArticlePreviewProps) {
  if (!article && !streamingText && !isStreaming) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted/30 border-dashed">
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-muted-foreground">Preview do Artigo</h3>
          <p className="text-sm text-muted-foreground mt-1">
            O artigo gerado aparecerá aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isStreaming && !article) {
    return (
      <Card className="h-full overflow-auto">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground bg-transparent p-0 overflow-hidden">
              {streamingText}
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!article) return null;

  // Convert markdown content to HTML-like structure for preview
  const formatContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let h2Count = 0;

    lines.forEach((line, i) => {
      if (line.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-lg font-semibold mt-6 mb-2">{line.slice(4)}</h3>);
      } else if (line.startsWith('## ')) {
        h2Count++;
        elements.push(<h2 key={i} className="text-xl font-bold mt-8 mb-3">{line.slice(3)}</h2>);
        
        // Insert content image after specific H2 sections
        const imageForSection = contentImages.find(img => img.after_section === h2Count);
        if (imageForSection) {
          elements.push(
            <div key={`img-${i}`} className="my-6 rounded-xl overflow-hidden shadow-lg">
              <img 
                src={imageForSection.url} 
                alt={`Ilustração: ${contextLabels[imageForSection.context]}`}
                className="w-full h-auto object-cover"
              />
              <p className="text-xs text-muted-foreground text-center py-2 bg-muted/30">
                {contextLabels[imageForSection.context]}
              </p>
            </div>
          );
        }
      } else if (line.startsWith('# ')) {
        elements.push(<h1 key={i} className="text-2xl font-bold mt-4 mb-4">{line.slice(2)}</h1>);
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(<li key={i} className="ml-4">{line.slice(2)}</li>);
      } else if (line.match(/^\d+\. /)) {
        elements.push(<li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>);
      } else if (line.trim() === '') {
        elements.push(<br key={i} />);
      } else {
        elements.push(<p key={i} className="mb-3 leading-relaxed">{line}</p>);
      }
    });

    return elements;
  };

  return (
    <Card className="h-full overflow-auto">
      {/* Image Generation Progress */}
      {isGeneratingImages && imageProgress && (
        <div className="border-b p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Gerando imagens ({imageProgress.current}/{imageProgress.total})
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {contextLabels[imageProgress.context] || imageProgress.context}
            </Badge>
          </div>
          <Progress value={(imageProgress.current / imageProgress.total) * 100} className="h-2" />
        </div>
      )}

      {/* Featured Image Section */}
      {isGeneratingImages && !featuredImage && (
        <div className="aspect-video bg-muted flex items-center justify-center border-b">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">Gerando imagem de capa...</span>
          </div>
        </div>
      )}
      
      {featuredImage && !isGeneratingImages && (
        <div className="relative group">
          <img 
            src={featuredImage} 
            alt="Imagem de capa do artigo" 
            className="w-full aspect-video object-cover"
          />
          {onRegenerateImages && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={onRegenerateImages}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Melhorar imagens
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Image Status Summary */}
      {!isGeneratingImages && (featuredImage || contentImages.length > 0) && (
        <div className="border-b p-3 bg-muted/20">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              {featuredImage ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span>Capa</span>
            </div>
            {['problem', 'solution', 'result'].map((ctx) => {
              const hasImage = contentImages.some(img => img.context === ctx);
              return (
                <div key={ctx} className="flex items-center gap-1.5">
                  {hasImage ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span>{contextLabels[ctx]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CardHeader className="pb-3 border-b">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold leading-tight">{article.title}</h1>
          <p className="text-muted-foreground italic">{article.excerpt}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{article.meta_description}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="prose prose-sm max-w-none text-foreground">
          {formatContent(article.content)}
        </div>

        {article.faq && article.faq.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Perguntas Frequentes</h2>
            </div>
            <div className="space-y-4">
              {article.faq.map((item, index) => (
                <div key={index} className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{item.question}</h3>
                  <p className="text-sm text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
