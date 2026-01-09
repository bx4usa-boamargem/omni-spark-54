import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { GSCDataPoint } from "@/hooks/useGSCAnalytics";
import { useNavigate } from "react-router-dom";

interface GSCTopQueriesProps {
  queries: GSCDataPoint[];
  isLoading: boolean;
  onViewAll?: () => void;
}

function getPositionBadgeColor(position: number): string {
  if (position <= 3) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (position <= 10) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  if (position <= 20) return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  return "bg-red-500/10 text-red-600 border-red-500/20";
}

export function GSCTopQueries({ queries, isLoading, onViewAll }: GSCTopQueriesProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Top Queries
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

  if (queries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Top Queries
          </CardTitle>
          <CardDescription>Nenhum dado disponível</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sincronize o GSC para ver as queries de pesquisa.</p>
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
              <Search className="h-5 w-5" />
              Top Queries
            </CardTitle>
            <CardDescription>Termos de pesquisa que trazem tráfego</CardDescription>
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
          {queries.slice(0, 10).map((query, index) => (
            <div
              key={query.key}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/performance/query/${encodeURIComponent(query.key)}`)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{query.key}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{query.clicks} cliques</span>
                    <span>•</span>
                    <span>{query.impressions.toLocaleString("pt-BR")} impressões</span>
                    <span>•</span>
                    <span>CTR {query.ctr.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className={getPositionBadgeColor(query.position)}>
                #{query.position.toFixed(0)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
