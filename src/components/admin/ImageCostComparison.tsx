import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Image } from "lucide-react";

interface ImageModel {
  model: string;
  label: string;
  costPerImage: number;
  imagesGenerated: number;
  totalCost: number;
}

interface ImageCostComparisonProps {
  models: ImageModel[];
}

export function ImageCostComparison({ models }: ImageCostComparisonProps) {
  const sortedModels = [...models].sort((a, b) => b.costPerImage - a.costPerImage);
  
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(142, 76%, 36%)",
    "hsl(38, 92%, 50%)",
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{item.label}</p>
          <p className="text-sm text-muted-foreground">
            Custo/imagem: {formatCurrency(item.costPerImage)}
          </p>
          <p className="text-sm text-muted-foreground">
            Imagens geradas: {item.imagesGenerated}
          </p>
          <p className="text-sm text-muted-foreground">
            Custo total: {formatCurrency(item.totalCost)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (models.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4" />
            Comparativo de Custo por Imagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de geração de imagens disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Image className="h-4 w-4" />
          Comparativo de Custo por Imagem
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedModels}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                type="number" 
                tickFormatter={(value) => `$${value.toFixed(3)}`}
                domain={[0, 'auto']}
              />
              <YAxis 
                type="category" 
                dataKey="label" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="costPerImage" radius={[0, 4, 4, 0]}>
                {sortedModels.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {sortedModels.slice(0, 4).map((model, index) => (
            <div key={model.model} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[index] }} 
              />
              <span className="text-muted-foreground truncate">{model.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
