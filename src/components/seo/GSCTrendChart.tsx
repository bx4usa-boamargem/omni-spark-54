import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { GSCDataPoint } from "@/hooks/useGSCAnalytics";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GSCTrendChartProps {
  data: GSCDataPoint[];
  isLoading: boolean;
}

export function GSCTrendChart({ data, isLoading }: GSCTrendChartProps) {
  const chartData = data.map((d) => ({
    date: d.key,
    formattedDate: format(parseISO(d.key), "dd/MM", { locale: ptBR }),
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Cliques e Impressões</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando gráfico...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Cliques e Impressões</CardTitle>
          <CardDescription>Nenhum dado disponível</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Conecte o Google Search Console para ver os dados de tendência.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência de Cliques e Impressões</CardTitle>
        <CardDescription>
          Visualizações do período: {format(parseISO(data[0]?.key || ""), "dd/MM/yyyy", { locale: ptBR })} - {format(parseISO(data[data.length - 1]?.key || ""), "dd/MM/yyyy", { locale: ptBR })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                name="Cliques"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorClicks)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="impressions"
                name="Impressões"
                stroke="hsl(var(--secondary))"
                fillOpacity={1}
                fill="url(#colorImpressions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
