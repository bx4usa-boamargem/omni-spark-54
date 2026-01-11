import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { OptimizationType } from '@/config/seoOptimizationTypes';

interface SEOComparisonCardProps {
  articleTitle: string;
  originalValue: string;
  suggestedValue: string;
  improvement: string;
  predictedImpact: 'high' | 'medium' | 'low';
  type: OptimizationType;
  selected: boolean;
  onToggle: () => void;
  isApplied?: boolean;
  isApplying?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function SEOComparisonCard({
  articleTitle,
  originalValue,
  suggestedValue,
  improvement,
  predictedImpact,
  type,
  selected,
  onToggle,
  isApplied = false,
  isApplying = false,
  className,
  style
}: SEOComparisonCardProps) {
  const ImpactIcon = predictedImpact === 'high' ? TrendingUp : 
                     predictedImpact === 'medium' ? Minus : TrendingDown;
  
  const impactColor = predictedImpact === 'high' ? 'text-green-500' : 
                      predictedImpact === 'medium' ? 'text-amber-500' : 'text-gray-400';

  const impactLabel = predictedImpact === 'high' ? 'Alto impacto' : 
                      predictedImpact === 'medium' ? 'Médio impacto' : 'Baixo impacto';

  return (
    <div 
      className={cn(
        "rounded-xl border p-4 transition-all duration-300",
        selected 
          ? "border-purple-500/50 bg-purple-50 dark:bg-purple-500/10 shadow-lg shadow-purple-500/10" 
          : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5",
        isApplied && "border-green-500/50 bg-green-50 dark:bg-green-500/10",
        isApplying && "animate-ai-pulse opacity-80",
        className
      )}
      style={style}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-white truncate pr-2">
            {articleTitle}
          </h4>
          <div className={cn("flex items-center gap-1 text-xs mt-1", impactColor)}>
            <ImpactIcon className="h-3 w-3" />
            <span>{impactLabel}</span>
          </div>
        </div>
        
        {!isApplied && (
          <Checkbox 
            checked={selected} 
            onCheckedChange={onToggle}
            disabled={isApplying}
            className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
          />
        )}
        
        {isApplied && (
          <span className="text-green-500 text-sm font-medium animate-fade-in">
            ✓ Aplicado
          </span>
        )}
      </div>
      
      {/* Before/After Comparison */}
      <div className="space-y-3">
        {/* Before */}
        <div className="rounded-lg bg-gray-100 dark:bg-white/5 p-3">
          <span className="inline-block text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wider mb-1">
            Antes
          </span>
          <p className={cn(
            "text-sm text-gray-600 dark:text-gray-400",
            type === 'title' || type === 'meta' ? "line-through opacity-70" : ""
          )}>
            {originalValue || <span className="italic text-gray-400">(vazio)</span>}
          </p>
        </div>
        
        {/* After */}
        <div className="rounded-lg bg-green-50 dark:bg-green-500/10 p-3 border border-green-200 dark:border-green-500/20">
          <span className="inline-block text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
            Depois
          </span>
          <p className="text-sm text-gray-900 dark:text-white font-medium">
            {suggestedValue}
          </p>
        </div>
      </div>
      
      {/* Improvement Note */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
        <Sparkles className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
        <span className="text-xs text-purple-600 dark:text-purple-400">
          {improvement}
        </span>
      </div>
    </div>
  );
}
