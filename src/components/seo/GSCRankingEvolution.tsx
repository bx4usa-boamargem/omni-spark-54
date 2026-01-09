import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { GSCDataPoint } from "@/hooks/useGSCAnalytics";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GSCRankingEvolutionProps {
  data: GSCDataPoint[];
  isLoading: boolean;
}

export function GSCRankingEvolution({ data, isLoading }: GSCRankingEvolutionProps) {
  const chartData = data.map((d) => ({
    date: d.key,
    formattedDate: format(parseISO(d.key), "dd/MM", { locale: ptBR }),
    position: d.position,
  }));

  const avgPosition = data.length > 0
    ? data.reduce((sum, d) => sum + d.position, 0) / data.length
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Posição Média</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
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
          <CardTitle>Evolução de Posição Média</CardTitle>
          <CardDescription>Nenhum dado disponível</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Conecte o Google Search Console para ver a evolução de posição.
          </div>
        </CardContent>
      </Card>
    );
  }

  const firstPosition = data[0]?.position || 0;
  const lastPosition = data[data.length - 1]?.position || 0;
  const improvement = firstPosition - lastPosition;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Evolução de Posição Média</CardTitle>
            <CardDescription>
              Posição média nas buscas do Google ao longo do tempo
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{lastPosition.toFixed(1)}</div>
            <div className={`text-sm ${improvement > 0 ? "text-green-600" : improvement < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {improvement > 0 ? "↑" : improvement < 0 ? "↓" : "→"} {Math.abs(improvement).toFixed(1)} posições
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
                reversed
                domain={[1, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`Posição ${value.toFixed(1)}`, ""]}
              />
              <ReferenceLine
                y={avgPosition}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                label={{
                  value: `Média: ${avgPosition.toFixed(1)}`,
                  position: "right",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="position"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
