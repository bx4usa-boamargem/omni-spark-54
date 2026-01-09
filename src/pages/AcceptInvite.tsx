import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Users, LogIn } from "lucide-react";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired" | "login_required">("loading");
  const [message, setMessage] = useState("");
  const [blogName, setBlogName] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setStatus("error");
      setMessage("Token de convite inválido.");
      return;
    }

    if (!user) {
      // Store token in sessionStorage and redirect to auth
      sessionStorage.setItem("pendingInviteToken", token);
      setStatus("login_required");
      return;
    }

    acceptInvite();
  }, [token, user, authLoading]);

  const acceptInvite = async () => {
    if (!token || !user) return;

    try {
      // Call edge function to accept invite
      const { data, error } = await supabase.functions.invoke("accept-invite", {
        body: { token, userId: user.id }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        if (data.error === "expired") {
          setStatus("expired");
          setMessage("Este convite expirou. Solicite um novo convite ao administrador.");
        } else if (data.error === "not_found") {
          setStatus("error");
          setMessage("Convite não encontrado. Verifique se o link está correto.");
        } else if (data.error === "already_member") {
          setStatus("error");
          setMessage("Você já é membro desta equipe.");
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setBlogName(data.blogName || "");
      setInviteRole(data.role || "");
      setStatus("success");
      setMessage("Convite aceito com sucesso!");

      // Clear pending token
      sessionStorage.removeItem("pendingInviteToken");

    } catch (error) {
      console.error("Error accepting invite:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Erro ao aceitar convite.");
    }
  };

  const handleLoginRedirect = () => {
    navigate(`/auth?returnUrl=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
  };

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Processando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === "success" && (
            <>
              <div className="mx-auto p-4 rounded-full bg-success/10 mb-4">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <CardTitle className="text-2xl">Convite Aceito!</CardTitle>
              <CardDescription>
                Você agora faz parte da equipe do blog <strong>{blogName}</strong> como <strong>{inviteRole}</strong>.
              </CardDescription>
            </>
          )}

          {status === "login_required" && (
            <>
              <div className="mx-auto p-4 rounded-full bg-primary/10 mb-4">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">Convite de Equipe</CardTitle>
              <CardDescription>
                Você foi convidado para fazer parte de uma equipe. Faça login ou crie uma conta para aceitar o convite.
              </CardDescription>
            </>
          )}

          {(status === "error" || status === "expired") && (
            <>
              <div className="mx-auto p-4 rounded-full bg-destructive/10 mb-4">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-2xl">
                {status === "expired" ? "Convite Expirado" : "Erro"}
              </CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {status === "success" && (
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Ir para o Dashboard
            </Button>
          )}

          {status === "login_required" && (
            <Button onClick={handleLoginRedirect} className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Fazer Login / Criar Conta
            </Button>
          )}

          {(status === "error" || status === "expired") && (
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Voltar ao Início
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
