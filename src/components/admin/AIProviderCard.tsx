import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Cpu, Image, MessageSquare } from "lucide-react";

interface AIProviderCardProps {
  providerName: string;
  providerLabel: string;
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  totalImages: number;
  previousPeriodCost?: number;
  icon?: React.ReactNode;
  color?: string;
}

export function AIProviderCard({
  providerName,
  providerLabel,
  totalCost,
  totalCalls,
  totalTokens,
  totalImages,
  previousPeriodCost,
  icon,
  color = "hsl(var(--primary))",
}: AIProviderCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("pt-BR").format(value);
  };

  const getTrend = () => {
    if (previousPeriodCost === undefined || previousPeriodCost === 0) {
      return { icon: <Minus className="h-3 w-3" />, label: "N/A", color: "text-muted-foreground" };
    }
    const change = ((totalCost - previousPeriodCost) / previousPeriodCost) * 100;
    if (change > 0) {
      return { 
        icon: <TrendingUp className="h-3 w-3" />, 
        label: `+${change.toFixed(1)}%`, 
        color: "text-destructive" 
      };
    } else if (change < 0) {
      return { 
        icon: <TrendingDown className="h-3 w-3" />, 
        label: `${change.toFixed(1)}%`, 
        color: "text-green-500" 
      };
    }
    return { icon: <Minus className="h-3 w-3" />, label: "0%", color: "text-muted-foreground" };
  };

  const trend = getTrend();

  return (
    <Card className="relative overflow-hidden">
      <div 
        className="absolute top-0 left-0 w-1 h-full" 
        style={{ backgroundColor: color }} 
      />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {icon || <Cpu className="h-4 w-4" />}
            {providerLabel}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {providerName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-2xl font-bold" style={{ color }}>
            {formatCurrency(totalCost)}
          </p>
          <div className={`flex items-center gap-1 text-xs ${trend.color}`}>
            {trend.icon}
            <span>{trend.label} vs período anterior</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold">{formatNumber(totalCalls)}</p>
            <p className="text-xs text-muted-foreground">Chamadas</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <p className="text-lg font-semibold">{formatNumber(totalTokens)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Tokens</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Image className="h-3 w-3 text-muted-foreground" />
              <p className="text-lg font-semibold">{formatNumber(totalImages)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Imagens</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
