import { useNavigate } from "react-router-dom";
import { useBlog } from "@/hooks/useBlog";
import { Button } from "@/components/ui/button";
import { FileQuestion, RefreshCw, Building2 } from "lucide-react";

interface BlogRequiredStateProps {
  message?: string;
  showRefetch?: boolean;
}

export function BlogRequiredState({
  message = "Nenhum blog encontrado para esta conta.",
  showRefetch = true,
}: BlogRequiredStateProps) {
  const navigate = useNavigate();
  const { refetch } = useBlog();

  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] p-6 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Blog não encontrado</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="default"
          className="gap-2"
          onClick={() => navigate("/client/company")}
        >
          <Building2 className="h-4 w-4" />
          Ir para Configurações da Empresa
        </Button>
        {showRefetch && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Recarregar
          </Button>
        )}
      </div>
    </div>
  );
}
