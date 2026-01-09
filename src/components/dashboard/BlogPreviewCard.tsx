import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Settings, MoreVertical, Copy, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PreviewHeader } from "./PreviewHeader";
import { PreviewHero } from "./PreviewHero";
import { PreviewArticleGrid } from "./PreviewArticleGrid";
import { DeleteBlogDialog } from "./DeleteBlogDialog";
import { CloneBlogDialog } from "./CloneBlogDialog";
import { PermissionGate } from "@/components/auth/PermissionGate";

interface Article {
  id: string;
  title: string;
  featured_image_url?: string | null;
}

interface BlogPreviewCardProps {
  blog: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    logo_negative_url?: string | null;
    favicon_url?: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    dark_primary_color?: string | null;
    dark_secondary_color?: string | null;
    theme_mode?: string | null;
    layout_template?: string | null;
    author_name?: string | null;
    author_bio?: string | null;
    author_photo_url?: string | null;
    author_linkedin?: string | null;
    cta_type?: string | null;
    cta_text?: string | null;
    cta_url?: string | null;
    banner_title?: string | null;
    banner_description?: string | null;
  };
  recentArticles: Article[];
}

export function BlogPreviewCard({ blog, recentArticles }: BlogPreviewCardProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);

  const primaryColor = blog.primary_color || "#6366f1";
  const secondaryColor = blog.secondary_color || "#8b5cf6";
  const blogUrl = `/blog/${blog.slug}`;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-display">Preview do seu Blog</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
            
            <PermissionGate permission="blog.settings">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCloneOpen(true)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar blog
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar dados (em breve)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar blog
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGate>
          </div>
        </CardHeader>
        <CardContent>
          {/* Preview Container */}
          <div className="border border-border rounded-lg overflow-hidden bg-card mb-4">
            <div 
              className="origin-top-left"
              style={{ 
                width: '100%',
                maxHeight: '320px',
                overflow: 'hidden'
              }}
            >
              <PreviewHeader 
                name={blog.name} 
                logoUrl={blog.logo_url} 
                primaryColor={primaryColor}
              />
              <PreviewHero 
                name={blog.name}
                description={blog.description}
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
              />
              <PreviewArticleGrid 
                articles={recentArticles.slice(0, 3)}
                primaryColor={primaryColor}
              />
            </div>
          </div>

          {/* URL and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                {window.location.origin}{blogUrl}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(blogUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Blog Completo
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteBlogDialog
        blogId={blog.id}
        blogName={blog.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />

      <CloneBlogDialog
        blog={blog}
        open={cloneOpen}
        onOpenChange={setCloneOpen}
      />
    </>
  );
}
