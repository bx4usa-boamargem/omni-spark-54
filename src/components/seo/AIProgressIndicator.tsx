import { Brain, Sparkles, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizationPhase, OptimizationProgress } from '@/hooks/useSEOOptimization';

interface AIProgressIndicatorProps {
  phase: OptimizationPhase;
  progress: OptimizationProgress;
  className?: string;
}

export function AIProgressIndicator({ phase, progress, className }: AIProgressIndicatorProps) {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* AI Icon with Animation */}
      <div className="flex justify-center">
        <div className={cn(
          "relative p-4 rounded-full",
          phase === 'analyzing' && "bg-purple-500/10 animate-ai-pulse",
          phase === 'generating' && "bg-purple-500/20 animate-ai-thinking-container",
          phase === 'applying' && "bg-amber-500/10",
          phase === 'complete' && "bg-green-500/20"
        )}>
          {phase === 'analyzing' && (
            <Brain className="h-10 w-10 text-purple-500 animate-pulse" />
          )}
          {phase === 'generating' && (
            <Sparkles className="h-10 w-10 text-purple-400 animate-spin-slow" />
          )}
          {phase === 'applying' && (
            <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
          )}
          {phase === 'complete' && (
            <Check className="h-10 w-10 text-green-500 animate-check-bounce" />
          )}
          
          {/* Pulse rings for generating phase */}
          {phase === 'generating' && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
              <span className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" style={{ animationDelay: '0.5s' }} />
            </>
          )}
        </div>
      </div>

      {/* Progress Message */}
      <div className="text-center space-y-2">
        <p className="text-gray-900 dark:text-white font-medium animate-fade-in">
          {progress.message}
        </p>
        
        {progress.total > 0 && phase !== 'complete' && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {progress.current} de {progress.total}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {progress.total > 0 && (
        <div className="relative h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
              phase === 'complete' 
                ? "bg-green-500" 
                : "bg-gradient-to-r from-purple-500 to-amber-500"
            )}
            style={{ width: `${percentage}%` }}
          />
          
          {/* Shimmer effect while processing */}
          {phase !== 'complete' && phase !== 'idle' && (
            <div className="absolute inset-0 animate-progress-shimmer">
              <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
