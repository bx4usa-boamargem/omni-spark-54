import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlog } from "@/hooks/useBlog";
import { BlogRequiredState } from "@/components/client/BlogRequiredState";
import { useLandingPages } from "@/components/client/landingpage/hooks/useLandingPages";
import { LandingPageCard } from "@/components/client/landingpage/LandingPageCard";
import { LandingPageFilters, useLandingPageFilters } from "@/components/client/landingpage/LandingPageFilters";
import { getCanonicalBlogUrl } from "@/utils/blogUrl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ClientLandingPages() {
  const navigate = useNavigate();
  const { blog, loading: blogLoading } = useBlog();
  const { pages, loading, fetchPages, deletePage, duplicatePage, archivePage, unarchivePage } = useLandingPages();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);

  const publicBaseUrl = useMemo(() => (blog ? getCanonicalBlogUrl(blog) : ""), [blog]);

  // Use filter hook
  const {
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredPages,
  } = useLandingPageFilters(pages);

  useEffect(() => {
    if (!blog?.id) return;
    fetchPages(blog.id);
  }, [blog?.id, fetchPages]);

  const handleDuplicate = async (id: string) => {
    const result = await duplicatePage(id);
    if (result) {
      toast.success("Página duplicada com sucesso!");
      if (blog?.id) fetchPages(blog.id);
    }
  };

  const handleArchive = async (id: string) => {
    const page = pages.find(p => p.id === id);
    if (!page) return;
    
    if (page.status === "archived") {
      await unarchivePage(id);
    } else {
      await archivePage(id);
    }
    if (blog?.id) fetchPages(blog.id);
  };

  const handleDeleteClick = (id: string) => {
    setPageToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (pageToDelete) {
      await deletePage(pageToDelete);
      setDeleteDialogOpen(false);
      setPageToDelete(null);
    }
  };

  if (blogLoading) {
    return (
      <div className="flex items-center justify-center min-h-[240px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!blog) {
    return <BlogRequiredState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-800 dark:text-white">
            <FileText className="h-8 w-8 text-primary" />
            Super Páginas
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Landing pages rápidas, indexáveis e orientadas a conversão.
          </p>
        </div>

        <Button onClick={() => navigate("/client/landing-pages/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Super Página
        </Button>
      </div>

      {/* Filters */}
      {pages.length > 0 && (
        <LandingPageFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[240px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : pages.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Super Página ainda</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Clique em "Criar Super Página" para gerar uma landing page com base na sua empresa e no SERP.
            </p>
            <Button onClick={() => navigate("/client/landing-pages/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar agora
            </Button>
          </CardContent>
        </Card>
      ) : filteredPages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma página encontrada com os filtros atuais.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPages.map((p) => (
            <LandingPageCard
              key={p.id}
              page={p}
              publicBaseUrl={publicBaseUrl}
              onEdit={() => navigate(`/client/landing-pages/${p.id}`)}
              onDuplicate={() => handleDuplicate(p.id)}
              onArchive={() => handleArchive(p.id)}
              onDelete={() => handleDeleteClick(p.id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Super Página?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A página será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
