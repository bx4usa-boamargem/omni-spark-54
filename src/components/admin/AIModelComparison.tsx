import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Check } from "lucide-react";

interface ModelPricing {
  id: string;
  model_provider: string;
  model_name: string;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  cost_per_image: number;
  is_active: boolean;
}

interface AIModelComparisonProps {
  modelPricing: ModelPricing[];
}

interface TaskComparison {
  task: string;
  recommended: {
    model: string;
    cost: number;
    costLabel: string;
  } | null;
  alternative: {
    model: string;
    cost: number;
    costLabel: string;
  } | null;
  savings: number;
}

export function AIModelComparison({ modelPricing }: AIModelComparisonProps) {
  const comparisons = useMemo(() => {
    const activeModels = modelPricing.filter(m => m.is_active);
    
    // Separate by type
    const textModels = activeModels.filter(m => 
      m.cost_per_1k_input_tokens > 0 || m.cost_per_1k_output_tokens > 0
    );
    const imageModels = activeModels.filter(m => m.cost_per_image > 0);

    // Average tokens for different tasks
    const articleTokens = { input: 2000, output: 4000 };
    const complexArticleTokens = { input: 4000, output: 8000 };
    const seoTokens = { input: 500, output: 1000 };

    const calculateTextCost = (model: ModelPricing, tokens: { input: number; output: number }) => {
      return (model.cost_per_1k_input_tokens * tokens.input / 1000) + 
             (model.cost_per_1k_output_tokens * tokens.output / 1000);
    };

    const tasks: TaskComparison[] = [];

    // Simple articles task
    const simpleArticleCosts = textModels
      .map(m => ({ model: m, cost: calculateTextCost(m, articleTokens) }))
      .filter(m => m.cost > 0)
      .sort((a, b) => a.cost - b.cost);
    
    if (simpleArticleCosts.length >= 2) {
      const recommended = simpleArticleCosts[0];
      const alternative = simpleArticleCosts[simpleArticleCosts.length - 1];
      tasks.push({
        task: "Artigos simples",
        recommended: {
          model: getModelLabel(recommended.model.model_name),
          cost: recommended.cost,
          costLabel: `$${recommended.cost.toFixed(3)}`,
        },
        alternative: {
          model: getModelLabel(alternative.model.model_name),
          cost: alternative.cost,
          costLabel: `$${alternative.cost.toFixed(3)}`,
        },
        savings: alternative.cost > 0 ? ((alternative.cost - recommended.cost) / alternative.cost) * 100 : 0,
      });
    }

    // Complex articles task (premium models)
    const complexArticleCosts = textModels
      .filter(m => 
        m.model_name.includes("pro") || 
        m.model_name.includes("gpt-5") && !m.model_name.includes("mini") && !m.model_name.includes("nano")
      )
      .map(m => ({ model: m, cost: calculateTextCost(m, complexArticleTokens) }))
      .filter(m => m.cost > 0)
      .sort((a, b) => a.cost - b.cost);
    
    if (complexArticleCosts.length >= 2) {
      const recommended = complexArticleCosts[0];
      const alternative = complexArticleCosts[complexArticleCosts.length - 1];
      tasks.push({
        task: "Artigos complexos",
        recommended: {
          model: getModelLabel(recommended.model.model_name),
          cost: recommended.cost,
          costLabel: `$${recommended.cost.toFixed(3)}`,
        },
        alternative: {
          model: getModelLabel(alternative.model.model_name),
          cost: alternative.cost,
          costLabel: `$${alternative.cost.toFixed(3)}`,
        },
        savings: alternative.cost > 0 ? ((alternative.cost - recommended.cost) / alternative.cost) * 100 : 0,
      });
    }

    // Thumbnails (fast image models)
    const thumbnailCosts = imageModels
      .filter(m => m.cost_per_image < 0.05)
      .sort((a, b) => a.cost_per_image - b.cost_per_image);
    
    if (thumbnailCosts.length >= 1) {
      const recommended = thumbnailCosts[0];
      const alternative = thumbnailCosts[thumbnailCosts.length - 1] || imageModels[imageModels.length - 1];
      tasks.push({
        task: "Thumbnails/Rápidas",
        recommended: {
          model: getModelLabel(recommended.model_name),
          cost: recommended.cost_per_image,
          costLabel: `$${recommended.cost_per_image.toFixed(4)}`,
        },
        alternative: alternative ? {
          model: getModelLabel(alternative.model_name),
          cost: alternative.cost_per_image,
          costLabel: `$${alternative.cost_per_image.toFixed(4)}`,
        } : null,
        savings: alternative && alternative.cost_per_image > 0 
          ? ((alternative.cost_per_image - recommended.cost_per_image) / alternative.cost_per_image) * 100 
          : 0,
      });
    }

    // HD Images
    const hdImageCosts = imageModels
      .filter(m => m.cost_per_image >= 0.02 && m.cost_per_image < 0.1)
      .sort((a, b) => a.cost_per_image - b.cost_per_image);
    
    if (hdImageCosts.length >= 1) {
      const recommended = hdImageCosts[0];
      const alternative = hdImageCosts[hdImageCosts.length - 1];
      if (recommended !== alternative) {
        tasks.push({
          task: "Imagens HD",
          recommended: {
            model: getModelLabel(recommended.model_name),
            cost: recommended.cost_per_image,
            costLabel: `$${recommended.cost_per_image.toFixed(3)}`,
          },
          alternative: {
            model: getModelLabel(alternative.model_name),
            cost: alternative.cost_per_image,
            costLabel: `$${alternative.cost_per_image.toFixed(3)}`,
          },
          savings: alternative.cost_per_image > 0 
            ? ((alternative.cost_per_image - recommended.cost_per_image) / alternative.cost_per_image) * 100 
            : 0,
        });
      }
    }

    // Photorealistic (premium image models)
    const premiumImageCosts = imageModels
      .filter(m => 
        m.model_name.toLowerCase().includes("dall-e") || 
        m.model_name.toLowerCase().includes("midjourney") ||
        m.cost_per_image >= 0.05
      )
      .sort((a, b) => a.cost_per_image - b.cost_per_image);
    
    if (premiumImageCosts.length >= 1) {
      const recommended = premiumImageCosts[0];
      const alternative = premiumImageCosts[premiumImageCosts.length - 1];
      tasks.push({
        task: "Fotorrealismo",
        recommended: {
          model: getModelLabel(recommended.model_name),
          cost: recommended.cost_per_image,
          costLabel: `$${recommended.cost_per_image.toFixed(3)}`,
        },
        alternative: recommended !== alternative ? {
          model: getModelLabel(alternative.model_name),
          cost: alternative.cost_per_image,
          costLabel: `$${alternative.cost_per_image.toFixed(3)}`,
        } : null,
        savings: alternative && recommended !== alternative && alternative.cost_per_image > 0 
          ? ((alternative.cost_per_image - recommended.cost_per_image) / alternative.cost_per_image) * 100 
          : 0,
      });
    }

    // SEO tasks
    const seoCosts = textModels
      .filter(m => 
        m.model_name.toLowerCase().includes("flash") || 
        m.model_name.toLowerCase().includes("mini") ||
        m.model_name.toLowerCase().includes("nano")
      )
      .map(m => ({ model: m, cost: calculateTextCost(m, seoTokens) }))
      .filter(m => m.cost > 0)
      .sort((a, b) => a.cost - b.cost);
    
    if (seoCosts.length >= 1) {
      const recommended = seoCosts[0];
      const alternativeModel = textModels.find(m => 
        m.model_name.toLowerCase().includes("gpt-5") && 
        !m.model_name.toLowerCase().includes("mini") && 
        !m.model_name.toLowerCase().includes("nano")
      );
      const alternative = alternativeModel 
        ? { model: alternativeModel, cost: calculateTextCost(alternativeModel, seoTokens) }
        : null;
      
      tasks.push({
        task: "Melhorias SEO",
        recommended: {
          model: getModelLabel(recommended.model.model_name),
          cost: recommended.cost,
          costLabel: `$${recommended.cost.toFixed(4)}`,
        },
        alternative: alternative ? {
          model: getModelLabel(alternative.model.model_name),
          cost: alternative.cost,
          costLabel: `$${alternative.cost.toFixed(4)}`,
        } : null,
        savings: alternative && alternative.cost > 0 
          ? ((alternative.cost - recommended.cost) / alternative.cost) * 100 
          : 0,
      });
    }

    return tasks;
  }, [modelPricing]);

  if (comparisons.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Comparativo de Modelos por Tarefa
        </CardTitle>
        <CardDescription>
          Recomendações baseadas nos preços configurados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarefa</TableHead>
              <TableHead>Modelo Recomendado</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead>Alternativa</TableHead>
              <TableHead className="text-right">Custo Alt.</TableHead>
              <TableHead className="text-right">Economia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisons.map((comparison, index) => (
              <TableRow 
                key={index}
                className="bg-green-50/30 dark:bg-green-950/10 hover:bg-green-50/50 dark:hover:bg-green-950/20"
              >
                <TableCell className="font-medium">{comparison.task}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {comparison.recommended?.model}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {comparison.recommended?.costLabel}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {comparison.alternative?.model || "-"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  {comparison.alternative?.costLabel || "-"}
                </TableCell>
                <TableCell className="text-right">
                  {comparison.savings > 0 ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
                      <Check className="h-3 w-3 mr-1" />
                      {comparison.savings.toFixed(0)}%
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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
