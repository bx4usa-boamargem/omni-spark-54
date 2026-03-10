import { useState, useEffect, useCallback } from "react";
import {
  Instagram,
  Linkedin,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Unplug,
  Plug,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = "instagram" | "linkedin" | "google_business";

interface SocialConnectionStatus {
  connected: boolean;
  account_name?: string;
  account_id?: string;
  expires_at?: string;
}

interface SocialCredentials {
  instagram_account_name?: string | null;
  instagram_business_account_id?: string | null;
  instagram_expires_at?: string | null;
  linkedin_account_name?: string | null;
  linkedin_account_id?: string | null;
  linkedin_expires_at?: string | null;
  google_account_name?: string | null;
  google_business_account_id?: string | null;
  google_expires_at?: string | null;
}

interface PlatformConfig {
  id: Platform;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor?: string;
  scopes: string[];
  notice?: string;
}

// ─── Platform Config ──────────────────────────────────────────────────────────

const PLATFORMS: PlatformConfig[] = [
  {
    id: "instagram",
    name: "Instagram & Facebook",
    description: "Publique posts, carrosséis, reels e stories no Instagram e posts no Facebook.",
    icon: Instagram,
    iconBg: "from-purple-600 via-pink-500 to-orange-400",
    scopes: ["Publicar posts", "Publicar vídeos/reels", "Insights de engajamento"],
    notice: "Requer uma Conta Profissional no Instagram conectada a uma Página do Facebook.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Compartilhe artigos e posts profissionais no seu perfil pessoal ou página da empresa.",
    icon: Linkedin,
    iconBg: "from-blue-700 to-blue-900",
    scopes: ["Publicar no perfil pessoal", "Publicar em páginas da empresa", "Articles"],
  },
  {
    id: "google_business",
    name: "Google Business Profile",
    description: "Publique updates, ofertas e eventos diretamente no seu perfil do Google Meu Negócio.",
    icon: Globe,
    iconBg: "from-green-500 to-emerald-700",
    scopes: ["Posts de atualização", "Ofertas e promoções", "Eventos"],
    notice: "Requer um Google Business Profile ativo e verificado.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface SocialConnectionsSectionProps {
  blogId: string;
}

export function SocialConnectionsSection({ blogId }: SocialConnectionsSectionProps) {
  const [credentials, setCredentials] = useState<SocialCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [disconnecting, setDisconnecting] = useState<Platform | null>(null);

  const fetchCredentials = useCallback(async () => {
    if (!blogId) return;
    try {
      const { data, error } = await supabase
        .from("social_credentials")
        .select(
          "instagram_account_name, instagram_business_account_id, instagram_expires_at, linkedin_account_name, linkedin_account_id, linkedin_expires_at, google_account_name, google_business_account_id, google_expires_at"
        )
        .eq("blog_id", blogId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching social credentials:", error);
      }
      setCredentials(data || null);
    } catch (err) {
      console.error("Unexpected error fetching credentials:", err);
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const getStatus = (platform: Platform): SocialConnectionStatus => {
    if (!credentials) return { connected: false };

    switch (platform) {
      case "instagram":
        return {
          connected: !!credentials.instagram_account_name,
          account_name: credentials.instagram_account_name || undefined,
          account_id: credentials.instagram_business_account_id || undefined,
          expires_at: credentials.instagram_expires_at || undefined,
        };
      case "linkedin":
        return {
          connected: !!credentials.linkedin_account_name,
          account_name: credentials.linkedin_account_name || undefined,
          account_id: credentials.linkedin_account_id || undefined,
          expires_at: credentials.linkedin_expires_at || undefined,
        };
      case "google_business":
        return {
          connected: !!credentials.google_account_name,
          account_name: credentials.google_account_name || undefined,
          account_id: credentials.google_business_account_id || undefined,
          expires_at: credentials.google_expires_at || undefined,
        };
    }
  };

  const handleConnect = async (platform: Platform) => {
    setConnecting(platform);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const { data, error } = await supabase.functions.invoke("social-oauth-start", {
        body: { platform, blog_id: blogId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || !data?.oauth_url) {
        throw new Error(error?.message || "Falha ao iniciar autenticação");
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        data.oauth_url,
        `oauth_${platform}`,
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        throw new Error("Popups bloqueados. Permita popups para este site e tente novamente.");
      }

      // Poll for popup close
      const pollTimer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setConnecting(null);
          // Refresh credentials after popup closes
          await fetchCredentials();
        }
      }, 500);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: Platform) => {
    setDisconnecting(platform);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const { error } = await supabase.functions.invoke("social-oauth-revoke", {
        body: { platform, blog_id: blogId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw new Error(error.message || "Falha ao desconectar");

      toast.success("Conta desconectada com sucesso.");
      await fetchCredentials();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao desconectar";
      toast.error(msg);
    } finally {
      setDisconnecting(null);
    }
  };

  const isExpiringSoon = (expiresAt?: string): boolean => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt).getTime();
    const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;
    return expiry < threeDaysFromNow;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando conexões...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {PLATFORMS.map((platform) => {
        const status = getStatus(platform.id);
        const Icon = platform.icon;
        const isConnecting = connecting === platform.id;
        const isDisconnecting = disconnecting === platform.id;
        const expiring = status.connected && isExpiringSoon(status.expires_at);

        return (
          <Card
            key={platform.id}
            className={`border transition-colors ${status.connected ? "border-green-500/30 bg-green-500/5" : "border-border"}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${platform.iconBg} flex items-center justify-center shadow-md`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{platform.name}</h3>
                    {status.connected ? (
                      <Badge variant="outline" className="text-green-600 border-green-500/50 bg-green-500/10 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Conectado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground gap-1">
                        <Unplug className="h-3 w-3" />
                        Desconectado
                      </Badge>
                    )}
                    {expiring && (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/50 bg-amber-500/10 gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Token expirando
                      </Badge>
                    )}
                  </div>

                  {status.connected && status.account_name ? (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Conta: <span className="text-foreground font-medium">@{status.account_name}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">{platform.description}</p>
                  )}

                  {/* Scopes */}
                  {status.connected && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {platform.scopes.map((scope) => (
                        <span key={scope} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {scope}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notice */}
                  {!status.connected && platform.notice && (
                    <Alert className="mt-3 py-2 px-3">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <AlertDescription className="text-xs ml-1">{platform.notice}</AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0 flex flex-col gap-2">
                  {status.connected ? (
                    <>
                      {expiring && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConnect(platform.id)}
                          disabled={isConnecting}
                          className="gap-1.5 text-amber-600 border-amber-500/50"
                        >
                          {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                          Renovar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisconnect(platform.id)}
                        disabled={isDisconnecting}
                        className="gap-1.5 text-destructive border-destructive/50 hover:bg-destructive/10"
                      >
                        {isDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(platform.id)}
                      disabled={isConnecting}
                      className="gap-1.5"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plug className="h-3.5 w-3.5" />
                      )}
                      {isConnecting ? "Conectando..." : "Conectar"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
        <ExternalLink className="h-3 w-3" />
        A autenticação usa OAuth oficial de cada plataforma. Nenhuma senha é solicitada ou armazenada.
      </p>
    </div>
  );
}
