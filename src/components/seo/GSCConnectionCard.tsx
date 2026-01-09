import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, RefreshCw, Unlink } from "lucide-react";
import { GSCConnection } from "@/hooks/useGSCConnection";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GSCConnectionCardProps {
  connection: GSCConnection | null;
  isLoading: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}

export function GSCConnectionCard({
  connection,
  isLoading,
  isConnecting,
  onConnect,
  onDisconnect,
  onRefresh,
}: GSCConnectionCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Google Search Console</CardTitle>
              <CardDescription>Carregando...</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Google Search Console</CardTitle>
              <CardDescription>
                Conecte o Search Console para ver dados de pesquisa orgânica.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 rounded-lg bg-muted/50 border border-dashed">
            <div>
              <h4 className="font-medium mb-1">Conecte sua conta Google</h4>
              <p className="text-sm text-muted-foreground">
                Veja cliques, impressões, posições e queries de pesquisa diretamente no seu dashboard.
              </p>
            </div>
            <Button onClick={onConnect} disabled={isConnecting}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {isConnecting ? "Conectando..." : "Conectar GSC"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Search className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Google Search Console</CardTitle>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  Conectado
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>{connection.site_url}</span>
                {connection.last_sync_at && (
                  <span className="text-xs">
                    • Sincronizado{" "}
                    {formatDistanceToNow(new Date(connection.last_sync_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={onDisconnect}>
              <Unlink className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
