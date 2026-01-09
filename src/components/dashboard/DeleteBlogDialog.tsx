import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteBlogDialogProps {
  blogId: string;
  blogName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBlogDialog({
  blogId,
  blogName,
  open,
  onOpenChange,
}: DeleteBlogDialogProps) {
  const navigate = useNavigate();
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isConfirmed = confirmName === blogName;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("blogs")
        .delete()
        .eq("id", blogId);

      if (error) throw error;

      // Sign out the user
      await supabase.auth.signOut();

      toast.success("Blog deletado com sucesso");
      navigate("/");
    } catch (error) {
      console.error("Error deleting blog:", error);
      toast.error("Erro ao deletar blog");
      setDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!deleting) {
      setConfirmName("");
      onOpenChange(newOpen);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Deletar blog permanentemente</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Esta ação é <strong>irreversível</strong>. Todos os artigos, personas, 
              configurações e dados do blog serão excluídos permanentemente.
            </p>
            <p>
              Você será deslogado automaticamente após a exclusão.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="confirm-name">
            Para confirmar, digite o nome do blog: <strong>"{blogName}"</strong>
          </Label>
          <Input
            id="confirm-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Digite o nome do blog"
            disabled={deleting}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deletando...
              </>
            ) : (
              "Deletar permanentemente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
