import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, CalendarDays } from "lucide-react";
import { PeriodComparison } from "@/hooks/useGSCAnalytics";

interface GSCPeriodComparisonProps {
  comparison: PeriodComparison | null;
  isLoading: boolean;
  periodDays?: number;
}

function ChangeIndicator({ value, label, type = "percent" }: { value: number; label: string; type?: "percent" | "position" }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const colorClass = isNeutral
    ? "text-muted-foreground"
    : isPositive
    ? "text-green-600"
    : "text-red-500";
  const bgClass = isNeutral
    ? "bg-muted"
    : isPositive
    ? "bg-green-500/10"
    : "bg-red-500/10";

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${bgClass}`}>
      <Icon className={`h-3 w-3 ${colorClass}`} />
      <span className={`text-sm font-medium ${colorClass}`}>
        {isPositive ? "+" : ""}
        {type === "position" ? value.toFixed(1) : `${value}%`}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function GSCPeriodComparison({ comparison, isLoading, periodDays = 28 }: GSCPeriodComparisonProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Comparação de Períodos
          </CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando comparação...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparison) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Comparação de Períodos
          </CardTitle>
          <CardDescription>Nenhum dado disponível</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sincronize o GSC para ver a comparação de períodos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Cliques",
      current: comparison.current.totalClicks,
      previous: comparison.previous.totalClicks,
      change: comparison.changes.clicks,
      format: (v: number) => v.toLocaleString("pt-BR"),
    },
    {
      label: "Impressões",
      current: comparison.current.totalImpressions,
      previous: comparison.previous.totalImpressions,
      change: comparison.changes.impressions,
      format: (v: number) => v.toLocaleString("pt-BR"),
    },
    {
      label: "CTR",
      current: comparison.current.avgCtr,
      previous: comparison.previous.avgCtr,
      change: comparison.changes.ctr,
      format: (v: number) => `${v.toFixed(2)}%`,
      type: "position" as const,
    },
    {
      label: "Posição",
      current: comparison.current.avgPosition,
      previous: comparison.previous.avgPosition,
      change: comparison.changes.position,
      format: (v: number) => v.toFixed(1),
      type: "position" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Comparação de Períodos
        </CardTitle>
        <CardDescription>
          Últimos {periodDays} dias vs {periodDays} dias anteriores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => {
            const max = Math.max(metric.current, metric.previous);
            const currentPercent = max > 0 ? (metric.current / max) * 100 : 0;
            const previousPercent = max > 0 ? (metric.previous / max) * 100 : 0;

            return (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.label}</span>
                  <ChangeIndicator value={metric.change} label="" type={metric.type || "percent"} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Atual</span>
                    <Progress value={currentPercent} className="flex-1 h-2" />
                    <span className="text-sm font-medium w-20 text-right">{metric.format(metric.current)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16">Anterior</span>
                    <Progress value={previousPercent} className="flex-1 h-2 [&>div]:bg-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground w-20 text-right">{metric.format(metric.previous)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
