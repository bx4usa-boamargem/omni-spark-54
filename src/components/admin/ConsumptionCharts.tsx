import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, parseISO, eachDayOfInterval, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConsumptionLog {
  id: string;
  user_id: string;
  action_type: string;
  model_used: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  images_generated: number | null;
  estimated_cost_usd: number;
  created_at: string;
}

interface ModelSummary {
  model_name: string;
  total_cost: number;
  total_calls: number;
  total_tokens: number;
}

interface ConsumptionChartsProps {
  logs: ConsumptionLog[];
  modelSummaries: ModelSummary[];
  startDate: string;
  endDate: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const chartConfig = {
  cost: {
    label: "Custo (USD)",
    color: "hsl(var(--primary))",
  },
  articles: {
    label: "Artigos",
    color: "hsl(var(--chart-2))",
  },
  images: {
    label: "Imagens",
    color: "hsl(var(--chart-3))",
  },
  tokens: {
    label: "Tokens",
    color: "hsl(var(--chart-4))",
  },
};

export function ConsumptionCharts({ logs, modelSummaries, startDate, endDate }: ConsumptionChartsProps) {
  // Daily cost trend data
  const dailyCostData = useMemo(() => {
    if (!logs.length) return [];

    const start = startOfDay(parseISO(startDate));
    const end = startOfDay(parseISO(endDate));
    const days = eachDayOfInterval({ start, end });

    const dailyMap = new Map<string, { cost: number; articles: number; images: number; tokens: number }>();

    // Initialize all days
    days.forEach(day => {
      const key = format(day, "yyyy-MM-dd");
      dailyMap.set(key, { cost: 0, articles: 0, images: 0, tokens: 0 });
    });

    // Aggregate logs by day
    logs.forEach(log => {
      const day = format(parseISO(log.created_at), "yyyy-MM-dd");
      const existing = dailyMap.get(day);
      if (existing) {
        existing.cost += log.estimated_cost_usd || 0;
        existing.tokens += (log.input_tokens || 0) + (log.output_tokens || 0);
        existing.images += log.images_generated || 0;
        if (log.action_type === "article_generation") existing.articles++;
      }
    });

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      dateLabel: format(parseISO(date), "dd/MM", { locale: ptBR }),
      ...data,
    }));
  }, [logs, startDate, endDate]);

  // Action type distribution
  const actionTypeData = useMemo(() => {
    const typeMap = new Map<string, number>();

    logs.forEach(log => {
      const type = log.action_type;
      typeMap.set(type, (typeMap.get(type) || 0) + (log.estimated_cost_usd || 0));
    });

    const typeLabels: Record<string, string> = {
      article_generation: "Artigos",
      image_generation: "Imagens",
      seo_improvement: "SEO",
      ebook_generation: "E-books",
    };

    return Array.from(typeMap.entries())
      .map(([type, cost]) => ({
        name: typeLabels[type] || type,
        value: cost,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [logs]);

  // Model distribution for pie chart
  const modelPieData = useMemo(() => {
    return modelSummaries
      .filter(m => m.total_cost > 0)
      .slice(0, 5)
      .map(m => ({
        name: m.model_name.split("/").pop() || m.model_name,
        value: m.total_cost,
        fullName: m.model_name,
      }));
  }, [modelSummaries]);

  // Cumulative cost data
  const cumulativeCostData = useMemo(() => {
    let cumulative = 0;
    return dailyCostData.map(day => {
      cumulative += day.cost;
      return {
        ...day,
        cumulative,
      };
    });
  }, [dailyCostData]);

  if (!logs.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum dado de consumo disponível para visualização
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Cost Trend */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Tendência de Custo Diário</CardTitle>
          <CardDescription>Evolução do custo ao longo do período</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={dailyCostData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value) => [`$${Number(value).toFixed(4)}`, "Custo"]}
                />} 
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorCost)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Cumulative Cost */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custo Acumulado</CardTitle>
          <CardDescription>Crescimento do custo total no período</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={cumulativeCostData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateLabel"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value) => [`$${Number(value).toFixed(4)}`, "Acumulado"]}
                />} 
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Articles and Images Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gerações por Dia</CardTitle>
          <CardDescription>Artigos e imagens gerados</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={dailyCostData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateLabel"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="articles" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Artigos" />
              <Bar dataKey="images" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Imagens" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Model Distribution Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Modelo</CardTitle>
          <CardDescription>Custo por modelo de IA</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <PieChart>
              <Pie
                data={modelPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {modelPieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value, name, props) => [`$${Number(value).toFixed(4)}`, props.payload.fullName]}
                />}
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Action Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custo por Tipo de Ação</CardTitle>
          <CardDescription>Distribuição de custos por categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={actionTypeData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis 
                type="number"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <YAxis 
                type="category"
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value) => [`$${Number(value).toFixed(4)}`, "Custo"]}
                />}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
