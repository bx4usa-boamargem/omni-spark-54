import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Cpu, Sparkles, Palette, Server } from "lucide-react";
import { AIProviderCard } from "./AIProviderCard";
import { TextVsImageChart } from "./TextVsImageChart";
import { ArticleCostBreakdown } from "./ArticleCostBreakdown";
import { ImageCostComparison } from "./ImageCostComparison";
import { ProviderTimelineChart } from "./ProviderTimelineChart";
import { AIRecommendationCards } from "./AIRecommendationCards";
import { AIModelComparison } from "./AIModelComparison";

interface ConsumptionLog {
  id: string;
  user_id: string;
  blog_id: string | null;
  action_type: string;
  action_description: string | null;
  model_used: string | null;
  input_tokens: number;
  output_tokens: number;
  images_generated: number;
  estimated_cost_usd: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface ModelPricing {
  id: string;
  model_provider: string;
  model_name: string;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  cost_per_image: number;
  is_active: boolean;
}

interface AICostsTabProps {
  logs: ConsumptionLog[];
  startDate: Date;
  endDate: Date;
  modelPricing?: ModelPricing[];
  previousPeriodCost?: number;
}

export function AICostsTab({ logs, startDate, endDate, modelPricing = [], previousPeriodCost = 0 }: AICostsTabProps) {
  // Aggregate data by provider
  const providerData = useMemo(() => {
    const providers: Record<string, {
      totalCost: number;
      totalCalls: number;
      totalTokens: number;
      totalImages: number;
    }> = {
      nativeAI: { totalCost: 0, totalCalls: 0, totalTokens: 0, totalImages: 0 },
      openai: { totalCost: 0, totalCalls: 0, totalTokens: 0, totalImages: 0 },
      huggingface: { totalCost: 0, totalCalls: 0, totalTokens: 0, totalImages: 0 },
      outros: { totalCost: 0, totalCalls: 0, totalTokens: 0, totalImages: 0 },
    };

    logs.forEach((log) => {
      const model = log.model_used || "";
      let provider = "outros";
      
      if (model.startsWith("google/") || model.includes("gemini")) {
        provider = "nativeAI";
      } else if (model.startsWith("openai/") || model.includes("gpt") || model.includes("dall-e")) {
        provider = "openai";
      } else if (model.includes("huggingface") || model.includes("FLUX") || model.includes("black-forest")) {
        provider = "huggingface";
      }

      providers[provider].totalCost += log.estimated_cost_usd;
      providers[provider].totalCalls += 1;
      providers[provider].totalTokens += (log.input_tokens || 0) + (log.output_tokens || 0);
      providers[provider].totalImages += log.images_generated || 0;
    });

    return providers;
  }, [logs]);

  // Text vs Image costs
  const textVsImageData = useMemo(() => {
    let textCost = 0;
    let imageCost = 0;
    let textCalls = 0;
    let imageCalls = 0;

    logs.forEach((log) => {
      if (log.action_type === "image_generation") {
        imageCost += log.estimated_cost_usd;
        imageCalls += 1;
      } else {
        textCost += log.estimated_cost_usd;
        textCalls += 1;
      }
    });

    return { textCost, imageCost, textCalls, imageCalls };
  }, [logs]);

  // Article cost breakdown
  const articleBreakdown = useMemo(() => {
    let totalArticles = 0;
    let totalArticleCost = 0;
    let totalImageCost = 0;
    let totalSeoCost = 0;
    let totalImages = 0;

    logs.forEach((log) => {
      if (log.action_type === "article_generation") {
        totalArticles += 1;
        totalArticleCost += log.estimated_cost_usd;
      } else if (log.action_type === "image_generation") {
        totalImageCost += log.estimated_cost_usd;
        totalImages += log.images_generated || 1;
      } else if (log.action_type === "seo_improvement") {
        totalSeoCost += log.estimated_cost_usd;
      }
    });

    return {
      totalArticles,
      totalArticleCost,
      totalImageCost,
      totalSeoCost,
      avgImagesPerArticle: totalArticles > 0 ? totalImages / totalArticles : 0,
    };
  }, [logs]);

  // Image model comparison
  const imageModels = useMemo(() => {
    const modelData: Record<string, { 
      costPerImage: number; 
      imagesGenerated: number; 
      totalCost: number;
      label: string;
    }> = {};

    logs.forEach((log) => {
      if (log.action_type === "image_generation" && log.model_used) {
        const model = log.model_used;
        if (!modelData[model]) {
          // Create friendly label
          let label = model;
          if (model.includes("gemini")) label = "Gemini Image";
          else if (model.includes("FLUX.1-schnell")) label = "FLUX.1 Schnell";
          else if (model.includes("FLUX.1-dev")) label = "FLUX.1 Dev";
          else if (model.includes("dall-e-3-hd")) label = "DALL-E 3 HD";
          else if (model.includes("dall-e-3")) label = "DALL-E 3";
          else if (model.includes("stable-diffusion")) label = "Stable Diffusion XL";
          
          modelData[model] = {
            costPerImage: 0,
            imagesGenerated: 0,
            totalCost: 0,
            label,
          };
        }
        modelData[model].totalCost += log.estimated_cost_usd;
        modelData[model].imagesGenerated += log.images_generated || 1;
      }
    });

    // Calculate cost per image
    return Object.entries(modelData).map(([model, data]) => ({
      model,
      label: data.label,
      costPerImage: data.imagesGenerated > 0 ? data.totalCost / data.imagesGenerated : 0,
      imagesGenerated: data.imagesGenerated,
      totalCost: data.totalCost,
    }));
  }, [logs]);

  // Timeline data by provider
  const timelineData = useMemo(() => {
    const dailyData: Record<string, {
      nativeAI: number;
      openai: number;
      huggingface: number;
      outros: number;
    }> = {};

    logs.forEach((log) => {
      const date = format(parseISO(log.created_at), "yyyy-MM-dd");
      if (!dailyData[date]) {
        dailyData[date] = { nativeAI: 0, openai: 0, huggingface: 0, outros: 0 };
      }

      const model = log.model_used || "";
      let provider = "outros";
      
      if (model.startsWith("google/") || model.includes("gemini")) {
        provider = "nativeAI";
      } else if (model.startsWith("openai/") || model.includes("gpt") || model.includes("dall-e")) {
        provider = "openai";
      } else if (model.includes("huggingface") || model.includes("FLUX") || model.includes("black-forest")) {
        provider = "huggingface";
      }

      dailyData[date][provider as keyof typeof dailyData[string]] += log.estimated_cost_usd;
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* AI Recommendation Cards */}
      {modelPricing.length > 0 && (
        <AIRecommendationCards 
          modelPricing={modelPricing} 
          logs={logs} 
          previousPeriodCost={previousPeriodCost}
        />
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AIProviderCard
          providerName="google"
          providerLabel="IA Nativa (Google)"
          totalCost={providerData.nativeAI.totalCost}
          totalCalls={providerData.nativeAI.totalCalls}
          totalTokens={providerData.nativeAI.totalTokens}
          totalImages={providerData.nativeAI.totalImages}
          icon={<Sparkles className="h-4 w-4" />}
          color="hsl(var(--primary))"
        />
        <AIProviderCard
          providerName="openai"
          providerLabel="OpenAI"
          totalCost={providerData.openai.totalCost}
          totalCalls={providerData.openai.totalCalls}
          totalTokens={providerData.openai.totalTokens}
          totalImages={providerData.openai.totalImages}
          icon={<Cpu className="h-4 w-4" />}
          color="hsl(142, 76%, 36%)"
        />
        <AIProviderCard
          providerName="huggingface"
          providerLabel="Hugging Face (FLUX)"
          totalCost={providerData.huggingface.totalCost}
          totalCalls={providerData.huggingface.totalCalls}
          totalTokens={providerData.huggingface.totalTokens}
          totalImages={providerData.huggingface.totalImages}
          icon={<Palette className="h-4 w-4" />}
          color="hsl(38, 92%, 50%)"
        />
        <AIProviderCard
          providerName="outros"
          providerLabel="Outros Provedores"
          totalCost={providerData.outros.totalCost}
          totalCalls={providerData.outros.totalCalls}
          totalTokens={providerData.outros.totalTokens}
          totalImages={providerData.outros.totalImages}
          icon={<Server className="h-4 w-4" />}
          color="hsl(var(--muted-foreground))"
        />
      </div>

      {/* Text vs Image + Article Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TextVsImageChart
          textCost={textVsImageData.textCost}
          imageCost={textVsImageData.imageCost}
          textCalls={textVsImageData.textCalls}
          imageCalls={textVsImageData.imageCalls}
        />
        <ArticleCostBreakdown
          totalArticles={articleBreakdown.totalArticles}
          totalArticleCost={articleBreakdown.totalArticleCost}
          totalImageCost={articleBreakdown.totalImageCost}
          totalSeoCost={articleBreakdown.totalSeoCost}
          avgImagesPerArticle={articleBreakdown.avgImagesPerArticle}
        />
      </div>

      {/* Image Cost Comparison */}
      <ImageCostComparison models={imageModels} />

      {/* Timeline Chart */}
      <ProviderTimelineChart data={timelineData} />

      {/* Model Comparison Table */}
      {modelPricing.length > 0 && (
        <AIModelComparison modelPricing={modelPricing} />
      )}
    </div>
  );
}
