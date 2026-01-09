import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MousePointer, Eye, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GSCAggregated, PeriodComparison } from "@/hooks/useGSCAnalytics";

interface GSCOverviewCardsProps {
  aggregated: GSCAggregated | null;
  comparison: PeriodComparison | null;
  isLoading: boolean;
}

function ChangeIndicator({ value, type = "percent" }: { value: number; type?: "percent" | "position" }) {
  if (value === 0) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-sm">
        <Minus className="h-3 w-3" />
        <span>0%</span>
      </span>
    );
  }

  const isPositive = type === "position" ? value > 0 : value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? "text-green-600" : "text-red-500";

  return (
    <span className={`flex items-center gap-1 ${colorClass} text-sm`}>
      <Icon className="h-3 w-3" />
      <span>
        {isPositive ? "+" : ""}
        {type === "position" ? value.toFixed(1) : `${value}%`}
      </span>
    </span>
  );
}

export function GSCOverviewCards({ aggregated, comparison, isLoading }: GSCOverviewCardsProps) {
  const cards = [
    {
      title: "Cliques",
      value: aggregated?.totalClicks ?? "--",
      change: comparison?.changes.clicks ?? null,
      icon: MousePointer,
      format: (v: number | string) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v),
    },
    {
      title: "Impressões",
      value: aggregated?.totalImpressions ?? "--",
      change: comparison?.changes.impressions ?? null,
      icon: Eye,
      format: (v: number | string) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v),
    },
    {
      title: "CTR Médio",
      value: aggregated?.avgCtr ?? "--",
      change: comparison?.changes.ctr ?? null,
      icon: Target,
      format: (v: number | string) => (typeof v === "number" ? `${v.toFixed(2)}%` : v),
      changeType: "position" as const,
    },
    {
      title: "Posição Média",
      value: aggregated?.avgPosition ?? "--",
      change: comparison?.changes.position ?? null,
      icon: TrendingUp,
      format: (v: number | string) => (typeof v === "number" ? v.toFixed(1) : v),
      changeType: "position" as const,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <span className="text-muted-foreground/50 animate-pulse">--</span>
              ) : (
                card.format(card.value)
              )}
            </div>
            {!isLoading && card.change !== null && (
              <div className="mt-1">
                <ChangeIndicator value={card.change} type={card.changeType || "percent"} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
