import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getBlogPath } from "@/utils/blogUrl";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface BlogHeaderProps {
  blogId?: string;
  blogName: string;
  blogSlug: string;
  logoUrl?: string | null;
  primaryColor?: string;
  customDomain?: string | null;
  domainVerified?: boolean | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  ctaType?: string | null;
}

export const BlogHeader = ({ 
  blogId,
  blogName, 
  blogSlug, 
  logoUrl, 
  primaryColor,
  customDomain,
  domainVerified,
  ctaText,
  ctaUrl,
  ctaType,
}: BlogHeaderProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const blogPath = getBlogPath({ slug: blogSlug, custom_domain: customDomain, domain_verified: domainVerified });

  useEffect(() => {
    if (blogId) {
      fetchCategories();
    }
  }, [blogId]);

  const fetchCategories = async () => {
    if (!blogId) return;
    
    try {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("id, name, slug")
        .eq("blog_id", blogId)
        .order("sort_order", { ascending: true });

      if (!error && data) {
        setCategories(data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleCtaClick = () => {
    if (!ctaUrl) return;
    
    if (ctaType === "whatsapp") {
      const cleanNumber = ctaUrl.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanNumber}`, "_blank");
    } else {
      window.open(ctaUrl, "_blank");
    }
  };

  const getCategoryUrl = (categorySlug: string) => {
    return `${blogPath}?categoria=${categorySlug}`;
  };

  return (
    <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo and Name */}
        <Link 
          to={blogPath} 
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={blogName} 
              className="h-8 w-8 object-contain rounded"
            />
          ) : (
            <div 
              className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }}
            >
              {blogName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-heading font-semibold text-lg text-foreground">
            {blogName}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to={blogPath}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Início
          </Link>

          {categories.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Categorias
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {categories.map((category) => (
                  <DropdownMenuItem key={category.id} asChild>
                    <Link to={getCategoryUrl(category.slug)}>
                      {category.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {ctaText && ctaUrl && (
            <Button
              size="sm"
              onClick={handleCtaClick}
              style={{ backgroundColor: primaryColor }}
              className={cn(
                "text-white hover:opacity-90",
                !primaryColor && "bg-primary"
              )}
            >
              {ctaText}
            </Button>
          )}

          <LanguageSwitcher />
        </nav>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link 
                  to={blogPath}
                  className="text-lg font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Início
                </Link>

                {categories.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Categorias</span>
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        to={getCategoryUrl(category.slug)}
                        className="block pl-4 py-1 text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}

                {ctaText && ctaUrl && (
                  <Button
                    onClick={() => {
                      handleCtaClick();
                      setMobileMenuOpen(false);
                    }}
                    style={{ backgroundColor: primaryColor }}
                    className={cn(
                      "w-full text-white hover:opacity-90 mt-4",
                      !primaryColor && "bg-primary"
                    )}
                  >
                    {ctaText}
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
