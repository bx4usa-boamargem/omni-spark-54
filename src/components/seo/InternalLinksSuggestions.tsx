import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Link2, 
  RefreshCw, 
  Loader2, 
  Plus, 
  Check,
  ExternalLink,
  Sparkles
} from "lucide-react";

interface InternalLink {
  anchorText: string;
  targetArticleId: string;
  targetTitle: string;
  targetSlug: string;
  context: string;
  reason: string;
}

interface InternalLinksSuggestionsProps {
  articleId: string;
  blogId: string;
  content: string;
  onContentUpdate: (newContent: string) => void;
}

export function InternalLinksSuggestions({
  articleId,
  blogId,
  content,
  onContentUpdate,
}: InternalLinksSuggestionsProps) {
  const { toast } = useToast();
  const [links, setLinks] = useState<InternalLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [insertedLinks, setInsertedLinks] = useState<Set<string>>(new Set());
  const [insertingAll, setInsertingAll] = useState(false);
  const [blogSlug, setBlogSlug] = useState<string>("");

  // Fetch blog slug on mount
  useEffect(() => {
    async function fetchBlogSlug() {
      const { data } = await supabase
        .from("blogs")
        .select("slug")
        .eq("id", blogId)
        .single();
      
      if (data) {
        setBlogSlug(data.slug);
      }
    }
    fetchBlogSlug();
  }, [blogId]);

  const fetchSuggestions = async () => {
    setLoading(true);
    setLinks([]);
    setInsertedLinks(new Set());

    try {
      const response = await supabase.functions.invoke("generate-internal-links", {
        body: {
          articleId,
          blogId,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      if (data.links && Array.isArray(data.links)) {
        // Filter out invalid links where anchor text doesn't exist in content
        const validLinks = data.links.filter((link: InternalLink) => {
          const regex = new RegExp(escapeRegex(link.anchorText), 'i');
          return content.match(regex) !== null;
        });
        
        if (data.links.length > validLinks.length) {
          console.warn(`${data.links.length - validLinks.length} links descartados por texto não encontrado no conteúdo`);
        }
        
        setLinks(validLinks);
        
        if (validLinks.length === 0 && data.links.length > 0) {
          toast({
            title: "Sugestões inválidas",
            description: "A IA sugeriu textos que não existem no conteúdo. Tente novamente.",
          });
        }
      } else if (data.message) {
        toast({
          title: "Sem sugestões",
          description: data.message,
        });
      }
    } catch (error) {
      console.error("Error fetching internal links:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar sugestões",
        description: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setLoading(false);
    }
  };

  const insertLink = async (link: InternalLink) => {
    if (!blogSlug) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Slug do blog não encontrado",
      });
      return;
    }

    const linkMarkdown = `[${link.anchorText}](/blog/${blogSlug}/${link.targetSlug})`;
    
    // Try to find and replace the anchor text in the content
    // First, try exact match
    let newContent = content;
    const anchorTextLower = link.anchorText.toLowerCase();
    
    // Find the anchor text (case insensitive) and replace first occurrence
    const regex = new RegExp(`\\b${escapeRegex(link.anchorText)}\\b`, 'i');
    const match = newContent.match(regex);
    
    if (match) {
      newContent = newContent.replace(regex, linkMarkdown);
      onContentUpdate(newContent);
      
      // Mark as inserted
      setInsertedLinks(prev => new Set([...prev, link.targetArticleId]));
      
      // Save to database
      await supabase.from("article_internal_links").insert({
        source_article_id: articleId,
        target_article_id: link.targetArticleId,
        anchor_text: link.anchorText,
      }).select();
      
      toast({
        title: "Link inserido!",
        description: `Link para "${link.targetTitle}" adicionado.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Texto não encontrado",
        description: `O texto "${link.anchorText}" não foi encontrado no conteúdo.`,
      });
    }
  };

  const insertAllLinks = async () => {
    setInsertingAll(true);
    let updatedContent = content;
    let insertedCount = 0;

    for (const link of links) {
      if (insertedLinks.has(link.targetArticleId)) continue;
      
      const linkMarkdown = `[${link.anchorText}](/blog/${blogSlug}/${link.targetSlug})`;
      const regex = new RegExp(`\\b${escapeRegex(link.anchorText)}\\b`, 'i');
      const match = updatedContent.match(regex);
      
      if (match) {
        updatedContent = updatedContent.replace(regex, linkMarkdown);
        
        await supabase.from("article_internal_links").insert({
          source_article_id: articleId,
          target_article_id: link.targetArticleId,
          anchor_text: link.anchorText,
        }).select();
        
        setInsertedLinks(prev => new Set([...prev, link.targetArticleId]));
        insertedCount++;
      }
    }

    if (insertedCount > 0) {
      onContentUpdate(updatedContent);
      toast({
        title: "Links inseridos!",
        description: `${insertedCount} links adicionados ao conteúdo.`,
      });
    } else {
      toast({
        title: "Nenhum link inserido",
        description: "Nenhum texto âncora foi encontrado no conteúdo.",
      });
    }

    setInsertingAll(false);
  };

  // Escape special regex characters
  const escapeRegex = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const remainingLinks = links.filter(l => !insertedLinks.has(l.targetArticleId));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Links Internos
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSuggestions}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.length === 0 && !loading && (
          <div className="text-center py-6">
            <Link2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">
              Links internos melhoram SEO e engajamento
            </p>
            <Button
              variant="outline"
              onClick={fetchSuggestions}
              disabled={loading}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Sugerir Links com IA
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              Analisando conteúdo...
            </span>
          </div>
        )}

        {links.length > 0 && (
          <>
            {remainingLinks.length > 1 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={insertAllLinks}
                disabled={insertingAll}
              >
                {insertingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Inserir Todos os Links ({remainingLinks.length})
              </Button>
            )}

            <div className="space-y-3">
              {links.map((link, index) => {
                const isInserted = insertedLinks.has(link.targetArticleId);
                
                return (
                  <div
                    key={`${link.targetArticleId}-${index}`}
                    className={`p-3 rounded-lg border ${
                      isInserted 
                        ? "bg-primary/5 border-primary/20" 
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {link.targetTitle}
                          </span>
                          {isInserted && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Inserido
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Texto âncora: <strong>"{link.anchorText}"</strong>
                        </p>
                        <p className="text-xs text-muted-foreground italic">
                          {link.reason}
                        </p>
                      </div>
                      
                      {!isInserted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => insertLink(link)}
                          className="flex-shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          💡 Links internos melhoram a navegação e o SEO do seu blog
        </p>
      </CardContent>
    </Card>
  );
}
