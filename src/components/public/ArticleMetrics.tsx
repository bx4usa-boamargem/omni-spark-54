import { Eye, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArticleMetricsProps {
  viewCount: number;
  shareCount: number;
  className?: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

export const ArticleMetrics = ({ viewCount, shareCount, className }: ArticleMetricsProps) => {
  return (
    <div className={cn("flex items-center gap-4 text-sm text-muted-foreground", className)}>
      <span className="flex items-center gap-1.5">
        <Eye className="h-4 w-4" />
        {formatNumber(viewCount)} visualizações
      </span>
      <span className="flex items-center gap-1.5">
        <Share2 className="h-4 w-4" />
        {formatNumber(shareCount)} compartilhamentos
      </span>
    </div>
  );
};
