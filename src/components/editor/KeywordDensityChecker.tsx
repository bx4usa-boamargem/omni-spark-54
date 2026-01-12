import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeywordDensityCheckerProps {
  content: string;
  keywords: string[];
}

interface DensityResult {
  keyword: string;
  count: number;
  density: number;
  status: 'low' | 'good' | 'high';
}

function calculateDensity(content: string, keyword: string): DensityResult {
  if (!content || !keyword) {
    return { keyword, count: 0, density: 0, status: 'low' };
  }
  
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (wordCount === 0) {
    return { keyword, count: 0, density: 0, status: 'low' };
  }
  
  // Escape special regex characters
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedKeyword, 'gi');
  const matches = content.match(regex) || [];
  const count = matches.length;
  const density = (count / wordCount) * 100;
  
  // Determine status
  let status: 'low' | 'good' | 'high';
  if (density < 0.5) {
    status = 'low';
  } else if (density > 2.5) {
    status = 'high';
  } else {
    status = 'good';
  }
  
  return { keyword, count, density, status };
}

export function KeywordDensityChecker({ content, keywords }: KeywordDensityCheckerProps) {
  const results = useMemo(() => {
    if (!keywords || keywords.length === 0) return [];
    return keywords.map(kw => calculateDensity(content, kw));
  }, [content, keywords]);
  
  const wordCount = useMemo(() => {
    return content.split(/\s+/).filter(w => w.length > 0).length;
  }, [content]);
  
  const avgDensity = useMemo(() => {
    if (results.length === 0) return 0;
    return results.reduce((acc, r) => acc + r.density, 0) / results.length;
  }, [results]);
  
  if (!keywords || keywords.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm">Adicione keywords para ver a densidade</span>
        </div>
      </div>
    );
  }
  
  const getStatusIcon = (status: 'low' | 'good' | 'high') => {
    switch (status) {
      case 'low':
        return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
      case 'good':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'high':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    }
  };
  
  const getStatusLabel = (status: 'low' | 'good' | 'high') => {
    switch (status) {
      case 'low':
        return 'Baixo';
      case 'good':
        return 'Ideal';
      case 'high':
        return 'Alto';
    }
  };
  
  const getProgressColor = (status: 'low' | 'good' | 'high') => {
    switch (status) {
      case 'low':
        return 'bg-yellow-500';
      case 'good':
        return 'bg-green-500';
      case 'high':
        return 'bg-red-500';
    }
  };
  
  // Normalize density to progress value (0-100)
  // Map 0-3% to 0-100%
  const getProgressValue = (density: number) => {
    return Math.min((density / 3) * 100, 100);
  };
  
  return (
    <div className="p-4 border rounded-lg bg-background/50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Densidade de Keywords</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {wordCount} palavras
        </Badge>
      </div>
      
      {/* Keywords List */}
      <div className="space-y-3">
        {results.map((result, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[60%]">
                {result.keyword}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono">
                  {result.count}x ({result.density.toFixed(1)}%)
                </span>
                <div className="flex items-center gap-1">
                  {getStatusIcon(result.status)}
                  <span className={cn(
                    "text-xs font-medium",
                    result.status === 'low' && "text-yellow-600",
                    result.status === 'good' && "text-green-600",
                    result.status === 'high' && "text-red-600"
                  )}>
                    {getStatusLabel(result.status)}
                  </span>
                </div>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all", getProgressColor(result.status))}
                style={{ width: `${getProgressValue(result.density)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>📈 Média: {avgDensity.toFixed(1)}%</span>
        <span className="text-xs opacity-70">Ideal: 0.5% - 2.5%</span>
      </div>
    </div>
  );
}
