import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Zap, TrendingUp, Database, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface CacheEntry {
  id: string;
  cache_type: string;
  content_hash: string;
  prompt_text: string | null;
  model_used: string | null;
  tokens_saved: number;
  cost_saved_usd: number;
  hits: number;
  created_at: string;
  expires_at: string | null;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalCostSaved: number;
  totalTokensSaved: number;
  hitRate: number;
  byType: Record<string, { entries: number; hits: number; costSaved: number }>;
}

export function CacheStatsTab() {
  const [loading, setLoading] = useState(true);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [stats, setStats] = useState<CacheStats>({
    totalEntries: 0,
    totalHits: 0,
    totalCostSaved: 0,
    totalTokensSaved: 0,
    hitRate: 0,
    byType: {},
  });
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchCacheData();
  }, []);

  const fetchCacheData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("ai_content_cache")
      .select("*")
      .order("hits", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching cache data:", error);
      setLoading(false);
      return;
    }

    const entries = (data || []) as CacheEntry[];
    setCacheEntries(entries);

    // Calculate stats
    const byType: Record<string, { entries: number; hits: number; costSaved: number }> = {};
    let totalHits = 0;
    let totalCostSaved = 0;
    let totalTokensSaved = 0;

    for (const entry of entries) {
      totalHits += entry.hits || 0;
      totalCostSaved += (entry.cost_saved_usd || 0) * (entry.hits || 0);
      totalTokensSaved += (entry.tokens_saved || 0) * (entry.hits || 0);

      if (!byType[entry.cache_type]) {
        byType[entry.cache_type] = { entries: 0, hits: 0, costSaved: 0 };
      }
      byType[entry.cache_type].entries++;
      byType[entry.cache_type].hits += entry.hits || 0;
      byType[entry.cache_type].costSaved += (entry.cost_saved_usd || 0) * (entry.hits || 0);
    }

    setStats({
      totalEntries: entries.length,
      totalHits,
      totalCostSaved,
      totalTokensSaved,
      hitRate: entries.length > 0 ? (totalHits / entries.length) * 100 : 0,
      byType,
    });

    setLoading(false);
  };

  const clearExpiredCache = async () => {
    setClearing(true);

    const { error } = await supabase
      .from("ai_content_cache")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) {
      toast.error("Erro ao limpar cache expirado");
      console.error("Error clearing cache:", error);
    } else {
      toast.success("Cache expirado removido");
      fetchCacheData();
    }

    setClearing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  const getCacheTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      article: "bg-blue-500/20 text-blue-500",
      image: "bg-green-500/20 text-green-500",
      seo: "bg-purple-500/20 text-purple-500",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Economia Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(stats.totalCostSaved)}</div>
            <p className="text-xs text-muted-foreground">Valor economizado com cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cache Hits</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalHits)}</div>
            <p className="text-xs text-muted-foreground">Reutilizações de conteúdo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Hit</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Eficiência do cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entradas no Cache</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalEntries)}</div>
            <p className="text-xs text-muted-foreground">Itens armazenados</p>
          </CardContent>
        </Card>
      </div>

      {/* Economy by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Economia por Tipo</CardTitle>
          <CardDescription>Distribuição da economia por categoria de conteúdo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.byType).map(([type, data]) => (
              <div key={type} className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getCacheTypeBadge(type)}>{type}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {data.entries} entradas • {data.hits} hits
                  </p>
                  <p className="text-lg font-bold text-green-500">
                    {formatCurrency(data.costSaved)}
                  </p>
                </div>
              </div>
            ))}
            {Object.keys(stats.byType).length === 0 && (
              <p className="text-muted-foreground col-span-3 text-center py-4">
                Nenhum dado de cache ainda
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cache Entries Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Conteúdos Cacheados</CardTitle>
            <CardDescription>Conteúdos mais reutilizados</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearExpiredCache}
            disabled={clearing}
          >
            {clearing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Limpar Expirados
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Hits</TableHead>
                <TableHead className="text-right">Economia/Hit</TableHead>
                <TableHead className="text-right">Economia Total</TableHead>
                <TableHead>Expira</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cacheEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum conteúdo em cache
                  </TableCell>
                </TableRow>
              ) : (
                cacheEntries.slice(0, 20).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge className={getCacheTypeBadge(entry.cache_type)}>
                        {entry.cache_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {entry.prompt_text?.substring(0, 50) || entry.content_hash}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.model_used || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.hits || 0}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(entry.cost_saved_usd || 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      {formatCurrency((entry.cost_saved_usd || 0) * (entry.hits || 0))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.expires_at
                        ? format(new Date(entry.expires_at), "dd/MM/yy", { locale: ptBR })
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
