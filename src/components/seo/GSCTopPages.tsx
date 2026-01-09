import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";
import { GSCDataPoint } from "@/hooks/useGSCAnalytics";

interface GSCTopPagesProps {
  pages: GSCDataPoint[];
  isLoading: boolean;
  onViewAll?: () => void;
}

function getPositionBadgeColor(position: number): string {
  if (position <= 3) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (position <= 10) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  if (position <= 20) return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  return "bg-red-500/10 text-red-600 border-red-500/20";
}

function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname === "/" ? "/" : urlObj.pathname;
  } catch {
    return url;
  }
}

export function GSCTopPages({ pages, isLoading, onViewAll }: GSCTopPagesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Top Páginas
          </CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Top Páginas
          </CardTitle>
          <CardDescription>Nenhum dado disponível</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sincronize o GSC para ver as páginas indexadas.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Top Páginas
            </CardTitle>
            <CardDescription>Páginas com melhor desempenho no Google</CardDescription>
          </div>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              Ver todas
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {pages.slice(0, 10).map((page, index) => (
            <div
              key={page.key}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={page.key}>
                    {extractPath(page.key)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{page.clicks} cliques</span>
                    <span>•</span>
                    <span>{page.impressions.toLocaleString("pt-BR")} impressões</span>
                    <span>•</span>
                    <span>CTR {page.ctr.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getPositionBadgeColor(page.position)}>
                  #{page.position.toFixed(0)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(page.key, "_blank");
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
