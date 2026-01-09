import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Article {
  id: string;
  title: string;
  content: string;
  featured_image_url: string | null;
}

interface ArticleSelectorProps {
  blogId: string;
  selectedArticle: Article | null;
  onSelect: (article: Article) => void;
}

export function ArticleSelector({ blogId, selectedArticle, onSelect }: ArticleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && blogId) {
      fetchArticles();
    }
  }, [open, blogId]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("articles")
        .select("id, title, content, featured_image_url")
        .eq("blog_id", blogId)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (article: Article) => {
    onSelect(article);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {selectedArticle ? (
          <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex gap-4">
              {selectedArticle.featured_image_url ? (
                <img
                  src={selectedArticle.featured_image_url}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate">{selectedArticle.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">Clique para trocar</p>
              </div>
            </div>
          </Card>
        ) : (
          <Button variant="outline" className="w-full h-auto py-8 flex flex-col gap-2">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <span>Selecionar artigo de referência</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Selecionar Artigo</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar artigos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px] -mx-6 px-6">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {search ? "Nenhum artigo encontrado" : "Nenhum artigo publicado"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredArticles.map((article) => (
                <Card
                  key={article.id}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedArticle?.id === article.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleSelect(article)}
                >
                  <div className="flex gap-4">
                    {article.featured_image_url ? (
                      <img
                        src={article.featured_image_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground line-clamp-2">{article.title}</h4>
                    </div>
                    {selectedArticle?.id === article.id && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
