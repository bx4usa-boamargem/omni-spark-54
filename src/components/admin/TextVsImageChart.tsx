import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { FileText, Image } from "lucide-react";

interface TextVsImageChartProps {
  textCost: number;
  imageCost: number;
  textCalls: number;
  imageCalls: number;
}

export function TextVsImageChart({ textCost, imageCost, textCalls, imageCalls }: TextVsImageChartProps) {
  const total = textCost + imageCost;
  const textPercentage = total > 0 ? ((textCost / total) * 100).toFixed(1) : "0";
  const imagePercentage = total > 0 ? ((imageCost / total) * 100).toFixed(1) : "0";

  const data = [
    { name: "Texto", value: textCost, calls: textCalls, color: "hsl(var(--primary))" },
    { name: "Imagem", value: imageCost, calls: imageCalls, color: "hsl(var(--chart-2))" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            Custo: {formatCurrency(item.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Chamadas: {item.calls}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Texto vs Imagem
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Texto</p>
              <p className="text-xs text-muted-foreground">{textPercentage}% • {formatCurrency(textCost)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--chart-2))]/10">
            <Image className="h-5 w-5 text-[hsl(var(--chart-2))]" />
            <div>
              <p className="text-sm font-medium">Imagem</p>
              <p className="text-xs text-muted-foreground">{imagePercentage}% • {formatCurrency(imageCost)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
