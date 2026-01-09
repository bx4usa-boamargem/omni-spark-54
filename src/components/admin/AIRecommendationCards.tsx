import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Zap, Palette, TrendingDown, Star } from "lucide-react";

interface ModelPricing {
  id: string;
  model_provider: string;
  model_name: string;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  cost_per_image: number;
  is_active: boolean;
}

interface ConsumptionLog {
  action_type: string;
  model_used: string | null;
  estimated_cost_usd: number;
  images_generated: number;
}

interface AIRecommendationCardsProps {
  modelPricing: ModelPricing[];
  logs: ConsumptionLog[];
  previousPeriodCost?: number;
}

interface ModelRecommendation {
  title: string;
  subtitle: string;
  model: string;
  cost: string;
  comparison: string;
  comparisonValue: number;
  icon: React.ReactNode;
  isWinner: boolean;
  isPremium: boolean;
}

export function AIRecommendationCards({ modelPricing, logs, previousPeriodCost = 0 }: AIRecommendationCardsProps) {
  const recommendations = useMemo(() => {
    const activeModels = modelPricing.filter(m => m.is_active);
    
    // Separate text and image models
    const textModels = activeModels.filter(m => 
      m.cost_per_1k_input_tokens > 0 || m.cost_per_1k_output_tokens > 0
    );
    const imageModels = activeModels.filter(m => m.cost_per_image > 0);

    // Calculate average cost per article (assuming ~2k input + 4k output tokens)
    const avgTokensInput = 2000;
    const avgTokensOutput = 4000;
    
    const textModelCosts = textModels.map(m => ({
      ...m,
      costPerArticle: (m.cost_per_1k_input_tokens * avgTokensInput / 1000) + 
                      (m.cost_per_1k_output_tokens * avgTokensOutput / 1000)
    })).sort((a, b) => a.costPerArticle - b.costPerArticle);

    const imageModelCosts = imageModels
      .sort((a, b) => a.cost_per_image - b.cost_per_image);

    // Find cheapest and most expensive for comparison
    const cheapestText = textModelCosts[0];
    const expensiveText = textModelCosts[textModelCosts.length - 1];
    const cheapestImage = imageModelCosts[0];
    const expensiveImage = imageModelCosts[imageModelCosts.length - 1];
    const premiumImage = imageModelCosts.find(m => 
      m.model_name.toLowerCase().includes('dall-e') || 
      m.model_name.toLowerCase().includes('midjourney')
    ) || imageModelCosts[imageModelCosts.length - 1];

    // Calculate current period stats
    const currentTotalCost = logs.reduce((sum, log) => sum + log.estimated_cost_usd, 0);
    const economyVsPrevious = previousPeriodCost > 0 
      ? ((previousPeriodCost - currentTotalCost) / previousPeriodCost) * 100 
      : 0;

    const cards: ModelRecommendation[] = [];

    // Cheapest text model
    if (cheapestText && expensiveText) {
      const savings = expensiveText.costPerArticle > 0 
        ? ((expensiveText.costPerArticle - cheapestText.costPerArticle) / expensiveText.costPerArticle) * 100
        : 0;
      
      cards.push({
        title: "TEXTO MAIS BARATO",
        subtitle: getModelLabel(cheapestText.model_name),
        model: cheapestText.model_name,
        cost: `$${cheapestText.costPerArticle.toFixed(3)}/artigo`,
        comparison: `vs ${getModelLabel(expensiveText.model_name)}:`,
        comparisonValue: savings,
        icon: <Trophy className="h-4 w-4" />,
        isWinner: true,
        isPremium: false,
      });
    }

    // Cheapest image model
    if (cheapestImage && expensiveImage) {
      const savings = expensiveImage.cost_per_image > 0 
        ? ((expensiveImage.cost_per_image - cheapestImage.cost_per_image) / expensiveImage.cost_per_image) * 100
        : 0;
      
      cards.push({
        title: "IMAGEM MAIS BARATA",
        subtitle: getModelLabel(cheapestImage.model_name),
        model: cheapestImage.model_name,
        cost: `$${cheapestImage.cost_per_image.toFixed(4)}/img`,
        comparison: `vs ${getModelLabel(expensiveImage.model_name)}:`,
        comparisonValue: savings,
        icon: <Zap className="h-4 w-4" />,
        isWinner: true,
        isPremium: false,
      });
    }

    // Premium image model
    if (premiumImage && cheapestImage) {
      cards.push({
        title: "IMAGEM PREMIUM",
        subtitle: getModelLabel(premiumImage.model_name),
        model: premiumImage.model_name,
        cost: `$${premiumImage.cost_per_image.toFixed(3)}/img`,
        comparison: "Melhor para: Fotorrealismo",
        comparisonValue: 0,
        icon: <Palette className="h-4 w-4" />,
        isWinner: false,
        isPremium: true,
      });
    }

    // SEO/Fast model (cheapest text for quick tasks)
    const seoModel = textModelCosts.find(m => 
      m.model_name.toLowerCase().includes('flash') || 
      m.model_name.toLowerCase().includes('mini') ||
      m.model_name.toLowerCase().includes('nano')
    ) || cheapestText;

    if (seoModel && expensiveText) {
      const seoCost = seoModel.costPerArticle * 0.3; // SEO tasks use ~30% of article tokens
      const expensiveSeo = expensiveText.costPerArticle * 0.3;
      const savings = expensiveSeo > 0 ? ((expensiveSeo - seoCost) / expensiveSeo) * 100 : 0;
      
      cards.push({
        title: "SEO MAIS RÁPIDO",
        subtitle: getModelLabel(seoModel.model_name),
        model: seoModel.model_name,
        cost: `$${seoCost.toFixed(4)}/melhoria`,
        comparison: `vs ${getModelLabel(expensiveText.model_name)}:`,
        comparisonValue: savings,
        icon: <Star className="h-4 w-4" />,
        isWinner: true,
        isPremium: false,
      });
    }

    // Overall economy card
    cards.push({
      title: "ECONOMIA GERAL",
      subtitle: economyVsPrevious >= 0 ? "vs período anterior" : "aumento vs anterior",
      model: "",
      cost: `$${currentTotalCost.toFixed(2)}`,
      comparison: "Total do período",
      comparisonValue: economyVsPrevious,
      icon: <TrendingDown className="h-4 w-4" />,
      isWinner: economyVsPrevious > 0,
      isPremium: false,
    });

    return cards;
  }, [modelPricing, logs, previousPeriodCost]);

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4" />
        RECOMENDAÇÕES INTELIGENTES
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {recommendations.map((rec, index) => (
          <Card 
            key={index}
            className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
              rec.isWinner 
                ? "border-2 border-green-500/50 bg-green-50/50 dark:bg-green-950/20" 
                : rec.isPremium 
                  ? "border-2 border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-border"
            }`}
          >
            {rec.isWinner && (
              <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">
                RECOMENDADO
              </div>
            )}
            {rec.isPremium && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">
                PREMIUM
              </div>
            )}
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className={`p-1 rounded ${
                  rec.isWinner ? "bg-green-500/20 text-green-600" : 
                  rec.isPremium ? "bg-blue-500/20 text-blue-600" : 
                  "bg-muted text-muted-foreground"
                }`}>
                  {rec.icon}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {rec.title}
                </span>
              </div>
              
              <div className={`text-sm font-bold mb-1 ${
                rec.isWinner ? "text-green-700 dark:text-green-400" : 
                rec.isPremium ? "text-blue-700 dark:text-blue-400" : 
                "text-foreground"
              }`}>
                {rec.subtitle}
              </div>
              
              <div className="text-lg font-bold font-mono">
                {rec.cost}
              </div>
              
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="text-[10px] text-muted-foreground">
                  {rec.comparison}
                </div>
                {rec.comparisonValue !== 0 && (
                  <Badge 
                    variant="secondary" 
                    className={`text-[10px] mt-1 ${
                      rec.comparisonValue > 0 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {rec.comparisonValue > 0 ? "-" : "+"}{Math.abs(rec.comparisonValue).toFixed(1)}% custo
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function getModelLabel(modelName: string): string {
  const name = modelName.toLowerCase();
  if (name.includes("gemini-2.5-flash")) return "Gemini 2.5 Flash";
  if (name.includes("gemini-2.5-pro")) return "Gemini 2.5 Pro";
  if (name.includes("gemini-3")) return "Gemini 3 Pro";
  if (name.includes("gpt-5-nano")) return "GPT-5 Nano";
  if (name.includes("gpt-5-mini")) return "GPT-5 Mini";
  if (name.includes("gpt-5")) return "GPT-5";
  if (name.includes("gpt-4o")) return "GPT-4o";
  if (name.includes("flux.1-schnell") || name.includes("flux-schnell")) return "FLUX Schnell";
  if (name.includes("flux.1-dev") || name.includes("flux-dev")) return "FLUX Dev";
  if (name.includes("dall-e-3-hd")) return "DALL-E 3 HD";
  if (name.includes("dall-e-3")) return "DALL-E 3";
  if (name.includes("stable-diffusion")) return "Stable Diffusion";
  return modelName.split("/").pop()?.substring(0, 15) || modelName.substring(0, 15);
}
