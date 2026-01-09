import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailyProviderData {
  date: string;
  nativeAI: number;
  openai: number;
  huggingface: number;
  outros: number;
}

interface ProviderTimelineChartProps {
  data: DailyProviderData[];
}

export function ProviderTimelineChart({ data }: ProviderTimelineChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">
            {format(parseISO(label), "d 'de' MMM", { locale: ptBR })}
          </p>
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }} 
                />
                <span>{item.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução de Custos por Provedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Evolução de Custos por Provedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNativeAI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorOpenai" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorHuggingface" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorOutros" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(parseISO(value), "dd/MM", { locale: ptBR })}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="nativeAI"
                name="IA Nativa"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorNativeAI)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="openai"
                name="OpenAI"
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#colorOpenai)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="huggingface"
                name="Hugging Face"
                stroke="hsl(var(--chart-3))"
                fillOpacity={1}
                fill="url(#colorHuggingface)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="outros"
                name="Outros"
                stroke="hsl(var(--chart-4))"
                fillOpacity={1}
                fill="url(#colorOutros)"
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
