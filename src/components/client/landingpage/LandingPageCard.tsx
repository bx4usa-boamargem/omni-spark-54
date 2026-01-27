import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Globe, Pencil, Copy, Archive, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LandingPage } from "./types/landingPageTypes";
import { cn } from "@/lib/utils";

interface LandingPageCardProps {
  page: LandingPage;
  publicBaseUrl: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

// Template color mapping for placeholder backgrounds
const templateColors: Record<string, { bg: string; text: string }> = {
  service_authority_v1: { bg: "bg-blue-500", text: "text-white" },
  institutional_v1: { bg: "bg-slate-600", text: "text-white" },
  specialist_authority_v1: { bg: "bg-amber-500", text: "text-white" },
};

// Template labels in Portuguese
const templateLabels: Record<string, string> = {
  service_authority_v1: "Serviços Locais",
  institutional_v1: "Institucional",
  specialist_authority_v1: "Autoridade",
};

function getStatusBadge(status: string) {
  switch (status) {
    case "published":
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Publicada</Badge>;
    case "archived":
      return <Badge variant="outline" className="text-amber-600 border-amber-500/30">Arquivada</Badge>;
    default:
      return <Badge variant="secondary">Rascunho</Badge>;
  }
}

export function LandingPageCard({
  page,
  publicBaseUrl,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: LandingPageCardProps) {
  // Determine thumbnail - hero image or fallback
  const heroImage = page.featured_image_url || page.page_data?.hero?.background_image_url;
  const templateType = page.template_type || page.page_data?.template || "service_authority_v1";
  const colors = templateColors[templateType] || templateColors.service_authority_v1;
  const templateLabel = templateLabels[templateType] || "Super Página";
  
  // Get city from contact if available
  const city = page.page_data?.contact?.address?.split(",").pop()?.trim() || "";

  return (
    <Card className="group overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-200">
      {/* Thumbnail Area */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {heroImage ? (
          <img
            src={heroImage}
            alt={page.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center", colors.bg)}>
            <span className={cn("text-6xl font-bold opacity-30", colors.text)}>
              {page.title?.charAt(0)?.toUpperCase() || "S"}
            </span>
          </div>
        )}
        
        {/* SEO Score Badge - if available */}
        {page.seo_score !== undefined && page.seo_score !== null && (
          <div className="absolute top-2 right-2">
            <Badge 
              variant="outline" 
              className={cn(
                "font-mono text-xs backdrop-blur-sm",
                page.seo_score >= 80 
                  ? "bg-green-500/80 text-white border-green-400" 
                  : page.seo_score >= 50 
                  ? "bg-amber-500/80 text-white border-amber-400"
                  : "bg-red-500/80 text-white border-red-400"
              )}
            >
              SEO {page.seo_score}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-base line-clamp-2 leading-tight">
            {page.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {templateLabel}
            {city && ` • ${city}`}
          </p>
        </div>

        <div className="flex items-center justify-between">
          {getStatusBadge(page.status)}
          <span className="text-xs text-muted-foreground">
            {format(new Date(page.created_at), "d MMM yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {page.status === "published" && publicBaseUrl && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              asChild
            >
              <a
                href={`${publicBaseUrl}/p/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                Abrir
              </a>
            </Button>
          )}
          
          <Button
            variant={page.status === "published" ? "outline" : "default"}
            size="sm"
            className="flex-1"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                {page.status === "archived" ? "Desarquivar" : "Arquivar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
