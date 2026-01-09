import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, TrendingUp, MousePointerClick } from "lucide-react";

interface FunnelArticleCardProps {
  article: {
    id: string;
    title: string;
    status: string;
    view_count: number;
    published_at: string | null;
    metrics: {
      readRate: number;
      scroll50: number;
      ctaRate: number;
    };
  };
  stage: 'top' | 'middle' | 'bottom';
}

export function FunnelArticleCard({ article, stage }: FunnelArticleCardProps) {
  const navigate = useNavigate();

  const stageColors = {
    top: 'border-l-blue-500',
    middle: 'border-l-purple-500',
    bottom: 'border-l-green-500',
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    published: { label: 'Publicado', variant: 'default' },
    draft: { label: 'Rascunho', variant: 'secondary' },
    scheduled: { label: 'Agendado', variant: 'outline' },
  };

  const statusInfo = statusLabels[article.status] || statusLabels.draft;

  return (
    <Card className={`border-l-4 ${stageColors[stage]} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2 flex-1">{article.title}</h4>
          <Badge variant={statusInfo.variant} className="shrink-0 text-xs">
            {statusInfo.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="h-3 w-3" />
            <span>{article.view_count.toLocaleString()} views</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>{article.metrics.readRate}% leitura</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs">50%</span>
            <span>{article.metrics.scroll50}% retenção</span>
          </div>
          {stage === 'bottom' && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MousePointerClick className="h-3 w-3" />
              <span>{article.metrics.ctaRate}% CTA</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs"
            onClick={() => navigate(`/app/articles/${article.id}/edit`)}
          >
            <Eye className="h-3 w-3 mr-1" />
            Ver
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-7 text-xs"
            onClick={() => navigate(`/app/articles/${article.id}/edit`)}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
