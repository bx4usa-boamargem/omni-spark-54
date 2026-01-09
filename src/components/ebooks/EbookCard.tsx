import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EbookCardProps {
  ebook: {
    id: string;
    title: string;
    status: string;
    cover_image_url: string | null;
    pdf_url: string | null;
    created_at: string;
  };
  onDelete: (id: string) => void;
  onClick: () => void;
}

export function EbookCard({ ebook, onDelete, onClick }: EbookCardProps) {
  const statusBadge = () => {
    switch (ebook.status) {
      case "ready":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Pronto</Badge>;
      case "generating":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Gerando...</Badge>;
      case "error":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Erro</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer" onClick={onClick}>
      {/* Cover Image */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
        {ebook.cover_image_url ? (
          <img
            src={ebook.cover_image_url}
            alt={ebook.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-16 w-16 text-primary/30" />
          </div>
        )}
        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ebook.pdf_url && (
                <DropdownMenuItem asChild>
                  <a
                    href={ebook.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(ebook.id);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Status Badge */}
        <div className="absolute bottom-3 left-3">{statusBadge()}</div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-2 mb-2">{ebook.title}</h3>
        <p className="text-xs text-muted-foreground">
          Criado {formatDistanceToNow(new Date(ebook.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </CardContent>
    </Card>
  );
}
