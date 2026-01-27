import { useState } from "react";
import { 
  RefreshCw, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  Info,
  FileText,
  Image,
  Type,
  Hash,
  BarChart3,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SEOScoreGauge } from "@/components/seo/SEOScoreGauge";
import { LandingPageData } from "./types/landingPageTypes";

interface SEOMetrics {
  breakdown?: {
    title_points: number;
    meta_points: number;
    keywords_points: number;
    content_points: number;
    density_points: number;
    image_points: number;
  };
  diagnostics?: {
    title_length: number;
    meta_length: number;
    word_count: number;
    density: Record<string, number>;
    missing: string[];
    h2_count?: number;
    image_count?: number;
  };
  serp_benchmark?: {
    avg_words_niche: number;
    competitors_analyzed: number;
    semantic_coverage: number;
  };
}

interface SEORecommendation {
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
  auto_fixable: boolean;
}

interface LandingPageSEOPanelProps {
  pageId?: string;
  pageData: LandingPageData | null;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  seoScore?: number | null;
  seoMetrics?: SEOMetrics | null;
  seoRecommendations?: SEORecommendation[] | null;
  seoAnalyzedAt?: string | null;
  onReanalyze: () => Promise<void>;
  onAutoFix: () => Promise<void>;
  isAnalyzing?: boolean;
  isFixing?: boolean;
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excelente", color: "text-green-600" };
  if (score >= 50) return { label: "Bom", color: "text-amber-600" };
  return { label: "Precisa melhorar", color: "text-red-600" };
}

function MetricItem({ 
  label, 
  value, 
  target, 
  icon: Icon,
  status 
}: { 
  label: string; 
  value: string | number; 
  target?: string;
  icon: any;
  status: "good" | "warning" | "error";
}) {
  const statusConfig = {
    good: { icon: Check, color: "text-green-600" },
    warning: { icon: AlertTriangle, color: "text-amber-600" },
    error: { icon: AlertTriangle, color: "text-red-600" },
  };
  
  const StatusIcon = statusConfig[status].icon;
  
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{value}</span>
        {target && <span className="text-xs text-muted-foreground">({target})</span>}
        <StatusIcon className={cn("h-4 w-4", statusConfig[status].color)} />
      </div>
    </div>
  );
}

export function LandingPageSEOPanel({
  pageId,
  pageData,
  seoTitle,
  seoDescription,
  seoKeywords,
  seoScore,
  seoMetrics,
  seoRecommendations,
  seoAnalyzedAt,
  onReanalyze,
  onAutoFix,
  isAnalyzing = false,
  isFixing = false,
}: LandingPageSEOPanelProps) {
  const hasScore = seoScore !== null && seoScore !== undefined;
  const scoreInfo = hasScore ? getScoreLabel(seoScore) : null;
  
  const diagnostics = seoMetrics?.diagnostics;
  const benchmark = seoMetrics?.serp_benchmark;
  const recommendations = seoRecommendations || [];

  // Calculate metric statuses
  const getTitleStatus = () => {
    const len = diagnostics?.title_length || seoTitle.length;
    if (len >= 50 && len <= 60) return "good";
    if (len >= 30 && len <= 70) return "warning";
    return "error";
  };
  
  const getMetaStatus = () => {
    const len = diagnostics?.meta_length || seoDescription.length;
    if (len >= 140 && len <= 160) return "good";
    if (len >= 100 && len <= 180) return "warning";
    return "error";
  };
  
  const getWordCountStatus = () => {
    const count = diagnostics?.word_count || 0;
    if (count >= 1500) return "good";
    if (count >= 800) return "warning";
    return "error";
  };

  return (
    <div className="space-y-4 p-4">
      {/* Score Gauge */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            SEO Score
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {hasScore ? (
            <>
              <SEOScoreGauge 
                score={seoScore} 
                size="md" 
                showLabel={false}
                animated
              />
              <p className={cn("text-sm font-medium mt-2", scoreInfo?.color)}>
                {scoreInfo?.label}
              </p>
              {seoAnalyzedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Analisado em {new Date(seoAnalyzedAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Clique em "Analisar" para calcular o score SEO
              </p>
            </div>
          )}
          
          <div className="flex gap-2 mt-4 w-full">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onReanalyze}
              disabled={isAnalyzing || !pageId}
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {hasScore ? "Reanalisar" : "Analisar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SERP Benchmark */}
      {benchmark && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">📊 SERP do Nicho</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Média palavras</span>
              <span className="font-medium">{benchmark.avg_words_niche.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Concorrentes analisados</span>
              <span className="font-medium">{benchmark.competitors_analyzed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cobertura semântica</span>
              <span className="font-medium">{benchmark.semantic_coverage}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Structure Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📐 Estrutura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <MetricItem
            label="Título"
            value={`${diagnostics?.title_length || seoTitle.length} chars`}
            target="50-60"
            icon={Type}
            status={getTitleStatus()}
          />
          <Separator />
          <MetricItem
            label="Meta description"
            value={`${diagnostics?.meta_length || seoDescription.length} chars`}
            target="140-160"
            icon={FileText}
            status={getMetaStatus()}
          />
          <Separator />
          <MetricItem
            label="Palavras"
            value={diagnostics?.word_count?.toLocaleString() || "—"}
            target="1500+"
            icon={Hash}
            status={getWordCountStatus()}
          />
          <Separator />
          <MetricItem
            label="Imagens"
            value={diagnostics?.image_count || "—"}
            icon={Image}
            status={diagnostics?.image_count && diagnostics.image_count >= 3 ? "good" : "warning"}
          />
        </CardContent>
      </Card>

      {/* Keyword Density */}
      {diagnostics?.density && Object.keys(diagnostics.density).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🔤 Densidade de Keywords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(diagnostics.density).slice(0, 5).map(([keyword, density]) => (
              <div key={keyword} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate max-w-[120px]">{keyword}</span>
                  <span className={cn(
                    "font-medium",
                    density >= 0.5 && density <= 2.5 ? "text-green-600" : "text-amber-600"
                  )}>
                    {density.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(density * 40, 100)} 
                  className="h-1"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">💡 Recomendações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.map((rec, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-start gap-2 text-sm p-2 rounded-md",
                  rec.severity === "error" ? "bg-red-50 dark:bg-red-900/10" :
                  rec.severity === "warning" ? "bg-amber-50 dark:bg-amber-900/10" :
                  "bg-blue-50 dark:bg-blue-900/10"
                )}
              >
                {rec.severity === "error" ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                ) : rec.severity === "warning" ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <span className="text-muted-foreground">{rec.message}</span>
              </div>
            ))}
            
            {recommendations.some(r => r.auto_fixable) && (
              <Button 
                className="w-full mt-3"
                onClick={onAutoFix}
                disabled={isFixing || !pageId}
              >
                {isFixing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Corrigir automaticamente
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state when no recommendations */}
      {hasScore && recommendations.length === 0 && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="flex items-center gap-3 py-4">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-700 dark:text-green-400">
              Excelente! Não há recomendações de melhoria.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
