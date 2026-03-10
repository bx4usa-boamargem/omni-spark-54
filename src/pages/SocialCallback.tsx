import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * SocialCallback — página de retorno do fluxo OAuth
 *
 * Funciona como alvo de redirect após o usuário confirmar a conexão
 * na janela de popup OAuth. Lê os parâmetros da URL (`?success=1&platform=...`
 * ou `?error=...`) e exibe o resultado. Como é um popup, não precisa de
 * layout completo — é auto-suficiente e fecha automaticamente após 2s.
 */
export default function SocialCallback() {
  const [params] = useSearchParams();
  const [countdown, setCountdown] = useState(3);

  const success = params.get("success") === "1";
  const error = params.get("error");
  const platform = params.get("platform");
  const account = params.get("account");

  const platformLabels: Record<string, string> = {
    instagram: "Instagram & Facebook",
    linkedin: "LinkedIn",
    google_business: "Google Business Profile",
  };

  const platformLabel = platform ? (platformLabels[platform] || platform) : "Rede social";

  useEffect(() => {
    if (!success && !error) return;

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          window.close();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [success, error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Loading state — OAuth still in progress */}
        {!success && !error && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Processando conexão...</h2>
              <p className="text-sm text-muted-foreground mt-1">Aguarde enquanto validamos sua autorização.</p>
            </div>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Conta conectada!</h2>
              {account && (
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-foreground font-medium">{platformLabel}</span> conectado como{" "}
                  <span className="text-foreground font-medium">@{account}</span>
                </p>
              )}
              {!account && (
                <p className="text-sm text-muted-foreground mt-1">
                  {platformLabel} conectado com sucesso.
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Esta janela fecha em <span className="font-semibold text-foreground">{countdown}s</span>...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Falha na conexão</h2>
              <p className="text-sm text-muted-foreground mt-1">{decodeURIComponent(error)}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => window.close()}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Fechar e tentar novamente
              </button>
              <p className="text-xs text-muted-foreground">
                Ou aguarde {countdown}s para fechar automaticamente.
              </p>
            </div>
          </div>
        )}

        {/* Branding */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            🔒 Autenticação OAuth segura · Nenhuma senha foi compartilhada
          </p>
        </div>
      </div>
    </div>
  );
}
