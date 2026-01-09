import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Undo2, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComparisonData {
  changeType: 'title' | 'meta' | 'content' | 'density';
  before: {
    value: string;
    score: number;
    maxScore: number;
  };
  after: {
    value: string;
    score: number;
    maxScore: number;
  };
  keywords: string[];
  totalScoreBefore: number;
  totalScoreAfter: number;
}

interface SEOChangeComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  data: ComparisonData | null;
  onUndo: () => void;
  onKeep: () => void;
  isLoading?: boolean;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  title: 'Título',
  meta: 'Meta Description',
  content: 'Conteúdo',
  density: 'Densidade de Palavras-chave',
};

export function SEOChangeComparison({
  isOpen,
  onClose,
  data,
  onUndo,
  onKeep,
  isLoading = false,
}: SEOChangeComparisonProps) {
  if (!data) return null;

  const label = CHANGE_TYPE_LABELS[data.changeType] || data.changeType;
  const scoreDiff = data.totalScoreAfter - data.totalScoreBefore;
  const itemScoreDiff = data.after.score - data.before.score;

  const countKeywordsIn = (text: string) => {
    return data.keywords.filter(kw => 
      text.toLowerCase().includes(kw.toLowerCase())
    ).length;
  };

  const beforeKeywords = countKeywordsIn(data.before.value);
  const afterKeywords = countKeywordsIn(data.after.value);

  const truncateText = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary">✨</span>
            Correção de SEO: {label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Before/After Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm">ANTES</span>
              </div>
              <div className="p-4 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50 min-h-[120px]">
                <p className="text-sm whitespace-pre-wrap break-words">
                  {truncateText(data.before.value) || <span className="text-muted-foreground italic">Vazio</span>}
                </p>
              </div>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>{data.before.value.length} caracteres</span>
                {data.keywords.length > 0 && (
                  <span className={cn(
                    beforeKeywords === 0 && "text-red-500",
                    beforeKeywords > 0 && beforeKeywords < data.keywords.length && "text-yellow-500"
                  )}>
                    {beforeKeywords === 0 ? "Sem palavra-chave ✗" : `${beforeKeywords} palavra(s)-chave`}
                  </span>
                )}
              </div>
            </div>

            {/* After */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">DEPOIS</span>
              </div>
              <div className="p-4 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/50 min-h-[120px]">
                <p className="text-sm whitespace-pre-wrap break-words">
                  {truncateText(data.after.value)}
                </p>
              </div>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className={cn(
                  data.changeType === 'title' && data.after.value.length >= 50 && data.after.value.length <= 60 && "text-green-500",
                  data.changeType === 'meta' && data.after.value.length >= 140 && data.after.value.length <= 160 && "text-green-500"
                )}>
                  {data.after.value.length} caracteres ✓
                </span>
                {data.keywords.length > 0 && (
                  <span className={cn(
                    afterKeywords === data.keywords.length && "text-green-500"
                  )}>
                    {afterKeywords > 0 ? `Com palavra-chave ✓` : "Sem palavra-chave"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Score Impact */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              📊 Impacto no SEO Score:
            </p>
            
            <div className="space-y-3">
              {/* Item Score */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground min-w-[80px]">{label}:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {Math.round(data.before.score)}/{data.before.maxScore}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-mono text-xs",
                    itemScoreDiff > 0 && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/50"
                  )}
                >
                  {Math.round(data.after.score)}/{data.after.maxScore}
                </Badge>
                {itemScoreDiff > 0 && (
                  <span className="text-xs text-green-600">+{itemScoreDiff} pts</span>
                )}
              </div>

              {/* Total Score */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground min-w-[80px]">Score Total:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {data.totalScoreBefore}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge 
                  variant="outline"
                  className={cn(
                    "font-mono text-xs",
                    scoreDiff > 0 && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/50"
                  )}
                >
                  {data.totalScoreAfter}
                </Badge>
                {scoreDiff > 0 && (
                  <span className="text-xs text-green-600">+{scoreDiff} pts</span>
                )}
              </div>

              {/* Progress visualization */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1">
                  <Progress value={data.totalScoreBefore} className="h-2" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div 
                      className={cn(
                        "h-full transition-all",
                        data.totalScoreAfter >= 80 ? "bg-green-500" :
                        data.totalScoreAfter >= 60 ? "bg-yellow-500" :
                        "bg-orange-500"
                      )}
                      style={{ width: `${data.totalScoreAfter}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onUndo}
              disabled={isLoading}
              className="flex-1"
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Desfazer alteração
            </Button>
            <Button
              onClick={onKeep}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="mr-2 h-4 w-4" />
              Manter alteração
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
