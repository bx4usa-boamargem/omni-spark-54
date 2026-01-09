import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Image, TrendingUp, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ArticleCostBreakdownProps {
  totalArticles: number;
  totalArticleCost: number;
  totalImageCost: number;
  totalSeoCost: number;
  avgImagesPerArticle: number;
}

export function ArticleCostBreakdown({
  totalArticles,
  totalArticleCost,
  totalImageCost,
  totalSeoCost,
  avgImagesPerArticle,
}: ArticleCostBreakdownProps) {
  const totalCost = totalArticleCost + totalImageCost + totalSeoCost;
  const avgCostPerArticle = totalArticles > 0 ? totalCost / totalArticles : 0;
  const avgTextCost = totalArticles > 0 ? totalArticleCost / totalArticles : 0;
  const avgImageCost = totalArticles > 0 ? totalImageCost / totalArticles : 0;
  const avgSeoCost = totalArticles > 0 ? totalSeoCost / totalArticles : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const textPercentage = totalCost > 0 ? (totalArticleCost / totalCost) * 100 : 0;
  const imagePercentage = totalCost > 0 ? (totalImageCost / totalCost) * 100 : 0;
  const seoPercentage = totalCost > 0 ? (totalSeoCost / totalCost) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Custo Médio por Artigo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center p-4 rounded-lg bg-primary/5 border">
          <p className="text-3xl font-bold text-primary">
            {formatCurrency(avgCostPerArticle)}
          </p>
          <p className="text-sm text-muted-foreground">
            por artigo ({totalArticles} artigos gerados)
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Geração de Texto</span>
              </div>
              <span className="font-medium">{formatCurrency(avgTextCost)}</span>
            </div>
            <Progress value={textPercentage} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Image className="h-3.5 w-3.5 text-[hsl(var(--chart-2))]" />
                <span>Imagens ({avgImagesPerArticle.toFixed(1)} média)</span>
              </div>
              <span className="font-medium">{formatCurrency(avgImageCost)}</span>
            </div>
            <Progress value={imagePercentage} className="h-2 [&>div]:bg-[hsl(var(--chart-2))]" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--chart-3))]" />
                <span>Melhorias SEO</span>
              </div>
              <span className="font-medium">{formatCurrency(avgSeoCost)}</span>
            </div>
            <Progress value={seoPercentage} className="h-2 [&>div]:bg-[hsl(var(--chart-3))]" />
          </div>
        </div>

        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Custo total do período</span>
            <span className="font-bold">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
