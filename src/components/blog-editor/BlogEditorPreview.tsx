import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Monitor, Smartphone, Search, FileText, ChevronDown, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorPalette } from "./ColorPaletteModal";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  featured_image_url: string | null;
  excerpt: string | null;
}

interface BlogEditorPreviewProps {
  blogId: string;
  blogName: string;
  blogDescription: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  colorPalette: ColorPalette | null;
  categories: Category[];
  ctaText: string;
  ctaType: string;
  bannerTitle: string;
  bannerDescription: string;
  bannerEnabled: boolean;
  brandDescription: string;
}

export function BlogEditorPreview({
  blogId,
  blogName,
  blogDescription,
  logoUrl,
  primaryColor,
  secondaryColor,
  colorPalette,
  categories,
  ctaText,
  ctaType,
  bannerTitle,
  bannerDescription,
  bannerEnabled,
  brandDescription,
}: BlogEditorPreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const effectivePrimary = colorPalette?.["500"] || primaryColor || "#7A5AF8";
  const effectiveSecondary = colorPalette?.["700"] || secondaryColor || "#4338CA";
  const effectiveLight = colorPalette?.["50"] || "#F4F3FF";
  const effectiveDark = colorPalette?.["900"] || "#3E1C96";

  // Fetch real articles from the blog
  useEffect(() => {
    const fetchArticles = async () => {
      if (!blogId) return;
      
      setLoadingArticles(true);
      try {
        const { data, error } = await supabase
          .from("articles")
          .select("id, title, slug, featured_image_url, excerpt")
          .eq("blog_id", blogId)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) throw error;
        setArticles(data || []);
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoadingArticles(false);
      }
    };

    fetchArticles();
  }, [blogId]);

  const displayArticles = viewMode === "desktop" ? articles.slice(0, 3) : articles.slice(0, 2);

  return (
    <div className="h-full flex flex-col">
      {/* Preview Controls */}
      <div className="flex items-center justify-center gap-2 p-3 border-b bg-muted/30">
        <Button
          variant={viewMode === "desktop" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewMode("desktop")}
          className="gap-2"
        >
          <Monitor className="h-4 w-4" />
          Desktop
        </Button>
        <Button
          variant={viewMode === "mobile" ? "default" : "ghost"}
          size="sm"
          onClick={() => setViewMode("mobile")}
          className="gap-2"
        >
          <Smartphone className="h-4 w-4" />
          Celular
        </Button>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-auto p-4 bg-muted/50">
        <div
          className={cn(
            "bg-white dark:bg-gray-950 rounded-xl shadow-lg overflow-hidden mx-auto transition-all duration-300",
            viewMode === "desktop" ? "w-full max-w-4xl" : "w-[375px]"
          )}
          style={{ minHeight: "600px" }}
        >
          {/* Mock Header */}
          <header
            className="border-b p-4 flex items-center justify-between"
            style={{ backgroundColor: effectiveLight + "40" }}
          >
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={blogName} className="h-8 w-8 object-contain rounded" />
              ) : (
                <div
                  className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: effectivePrimary }}
                >
                  {blogName?.charAt(0)?.toUpperCase() || "B"}
                </div>
              )}
              <span className="font-semibold text-gray-900 dark:text-white">
                {blogName || "Meu Blog"}
              </span>
            </div>

            {/* Nav Items */}
            <nav className={cn("flex items-center gap-4", viewMode === "mobile" && "hidden")}>
              <span className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 cursor-pointer">
                Início
              </span>
              
              {/* Interactive Categories Dropdown */}
              <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                <PopoverTrigger asChild>
                  <button className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                    Categorias
                    <ChevronDown className={cn("h-3 w-3 transition-transform", categoriesOpen && "rotate-180")} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  {categories.length > 0 ? (
                    <div className="space-y-1">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="px-3 py-2 text-sm rounded-md hover:bg-muted cursor-pointer transition-colors"
                        >
                          {cat.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <FolderOpen className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">Nenhuma categoria</p>
                      <p className="text-xs mt-1">Crie na aba Categorias</p>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {ctaText && (
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: effectivePrimary }}
                >
                  {ctaText}
                </button>
              )}
            </nav>
          </header>

          {/* Hero Section with Search */}
          <section
            className="py-12 px-6 text-center"
            style={{
              background: `linear-gradient(135deg, ${effectivePrimary}15, ${effectiveSecondary}10)`,
            }}
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {blogName || "Meu Blog"}
            </h1>
            {blogDescription && (
              <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto mb-6">
                {blogDescription}
              </p>
            )}

            {/* Search Bar */}
            <div className="max-w-md mx-auto flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar artigos no blog..."
                  className="pl-10 bg-white dark:bg-gray-900"
                  disabled
                />
              </div>
              <Button
                style={{ backgroundColor: effectivePrimary }}
                className="text-white"
                disabled
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </section>

          {/* Articles Grid - Real Articles */}
          <section className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Artigos Recentes
            </h2>

            {loadingArticles ? (
              <div className={cn("grid gap-4", viewMode === "desktop" ? "grid-cols-3" : "grid-cols-1")}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                    <Skeleton className="h-32 w-full" />
                    <div className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : articles.length > 0 ? (
              <div className={cn("grid gap-4", viewMode === "desktop" ? "grid-cols-3" : "grid-cols-1")}>
                {displayArticles.map((article) => (
                  <div key={article.id} className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900 hover:shadow-md transition-shadow cursor-pointer">
                    {article.featured_image_url ? (
                      <img
                        src={article.featured_image_url}
                        alt={article.title}
                        className="h-32 w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-32 bg-gradient-to-br"
                        style={{
                          background: `linear-gradient(135deg, ${effectivePrimary}30, ${effectiveSecondary}20)`,
                        }}
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-white mb-1">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Nenhum artigo publicado ainda</p>
                <p className="text-sm mt-1">Os artigos publicados aparecerão aqui</p>
              </div>
            )}
          </section>

          {/* CTA Banner */}
          {bannerEnabled && (bannerTitle || bannerDescription) && (
            <section
              className="mx-6 mb-6 p-6 rounded-xl text-center cursor-pointer hover:opacity-95 transition-opacity"
              style={{
                background: `linear-gradient(135deg, ${effectivePrimary}, ${effectiveSecondary})`,
              }}
            >
              {bannerTitle && (
                <h3 className="text-xl font-bold text-white mb-2">{bannerTitle}</h3>
              )}
              {bannerDescription && (
                <p className="text-white/90 mb-4 text-sm">{bannerDescription}</p>
              )}
              {ctaText && (
                <button className="px-6 py-2 bg-white text-gray-900 rounded-lg font-medium text-sm">
                  {ctaText}
                </button>
              )}
            </section>
          )}

          {/* Mock Footer */}
          <footer
            className="p-6"
            style={{ backgroundColor: effectiveDark }}
          >
            <div className={cn("grid gap-6 mb-6", viewMode === "desktop" ? "grid-cols-3" : "grid-cols-1")}>
              {/* Brand Column */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt={blogName} className="h-6 w-6 object-contain rounded" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                      {blogName?.charAt(0)?.toUpperCase() || "B"}
                    </div>
                  )}
                  <span className="font-semibold text-white">{blogName || "Meu Blog"}</span>
                </div>
                <p className="text-white/70 text-sm">
                  {brandDescription || "Seu blog pessoal com conteúdo de qualidade."}
                </p>
              </div>

              {/* Categories Column */}
              {categories.length > 0 && (
                <div>
                  <h4 className="font-semibold text-white mb-3">Categorias</h4>
                  <ul className="space-y-1">
                    {categories.slice(0, 5).map((cat) => (
                      <li key={cat.id}>
                        <span className="text-white/70 text-sm hover:text-white cursor-pointer">
                          {cat.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA Column */}
              <div>
                <h4 className="font-semibold text-white mb-3">
                  {bannerTitle || "Entre em contato"}
                </h4>
                <p className="text-white/70 text-sm mb-3">
                  {bannerDescription || "Fale conosco para saber mais."}
                </p>
                {ctaText && (
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: effectivePrimary,
                      color: "white",
                    }}
                  >
                    {ctaText}
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-white/20 pt-4 text-center">
              <p className="text-white/50 text-xs">
                © {new Date().getFullYear()} {blogName || "Meu Blog"}. Todos os direitos reservados.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
