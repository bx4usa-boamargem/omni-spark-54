import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  FileText, 
  Sparkles, 
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export type GenerationStage = 'analyzing' | 'structuring' | 'generating' | 'finalizing' | null;

interface GenerationProgressProps {
  stage: GenerationStage;
  progress: number;
  isActive: boolean;
}

const STAGES = [
  { id: 'analyzing', label: 'Analisando', icon: Search },
  { id: 'structuring', label: 'Estruturando', icon: FileText },
  { id: 'generating', label: 'Gerando', icon: Sparkles },
  { id: 'finalizing', label: 'Finalizando', icon: CheckCircle2 },
] as const;

export function GenerationProgress({ stage, progress, isActive }: GenerationProgressProps) {
  if (!isActive) return null;

  const currentStageIndex = useMemo(() => {
    return STAGES.findIndex(s => s.id === stage);
  }, [stage]);

  return (
    <Card className="border-primary/50 bg-primary/5 animate-in fade-in-50 duration-300">
      <CardContent className="py-4">
        <div className="space-y-4">
          {/* Stage indicators */}
          <div className="flex items-center justify-between">
            {STAGES.map((s, index) => {
              const Icon = s.icon;
              const isCompleted = index < currentStageIndex;
              const isCurrent = s.id === stage;
              
              return (
                <div key={s.id} className="flex flex-col items-center gap-1.5 flex-1">
                  <div 
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                      isCompleted && "bg-green-500 text-white",
                      isCurrent && "bg-primary text-primary-foreground animate-pulse",
                      !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span 
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isCurrent && "text-primary",
                      isCompleted && "text-green-600",
                      !isCompleted && !isCurrent && "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Connecting lines */}
          <div className="relative px-8">
            <div className="absolute top-0 left-8 right-8 flex justify-between -mt-[52px]">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className={cn(
                    "h-0.5 flex-1 mx-4 transition-colors duration-300",
                    i < currentStageIndex ? "bg-green-500" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Progress bar for generating stage */}
          {stage === 'generating' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Gerando conteúdo...</span>
                <span className="font-mono text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Status message */}
          <p className="text-sm text-center text-muted-foreground">
            {stage === 'analyzing' && 'Analisando tema e coletando contexto...'}
            {stage === 'structuring' && 'Estruturando seções e planejando conteúdo...'}
            {stage === 'generating' && 'Gerando texto otimizado para SEO...'}
            {stage === 'finalizing' && 'Finalizando e verificando qualidade...'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
