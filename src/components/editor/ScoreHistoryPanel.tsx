import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, TrendingUp, TrendingDown, Minus, User, Bot, Wand2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ScoreChangeEntry {
  id: string;
  old_score: number;
  new_score: number;
  change_reason: string;
  triggered_by: string;
  created_at: string;
}

interface ScoreHistoryPanelProps {
  history: ScoreChangeEntry[];
  lastChangeReason?: string | null;
}

export function ScoreHistoryPanel({ history, lastChangeReason }: ScoreHistoryPanelProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2 py-2">
        <History className="h-4 w-4" />
        <span>Nenhuma alteração de score registrada</span>
      </div>
    );
  }

  const getChangeIcon = (oldScore: number, newScore: number) => {
    if (newScore > oldScore) {
      return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    } else if (newScore < oldScore) {
      return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    }
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getTriggerIcon = (triggeredBy: string) => {
    switch (triggeredBy) {
      case 'user':
      case 'recalculate':
        return <User className="h-3 w-3" />;
      case 'boost':
        return <Wand2 className="h-3 w-3" />;
      case 'auto-fix':
        return <RefreshCw className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  const getTriggerLabel = (triggeredBy: string) => {
    switch (triggeredBy) {
      case 'user':
        return 'Usuário';
      case 'recalculate':
        return 'Recálculo';
      case 'boost':
        return 'Boost IA';
      case 'auto-fix':
        return 'Auto-fix';
      case 'system':
        return 'Sistema';
      default:
        return triggeredBy;
    }
  };

  const getChangeColor = (oldScore: number, newScore: number) => {
    if (newScore > oldScore) return 'text-green-600 dark:text-green-400';
    if (newScore < oldScore) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-3">
      {/* Last change reason summary */}
      {lastChangeReason && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <History className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">Última alteração: {lastChangeReason}</span>
        </div>
      )}

      {/* History list */}
      <ScrollArea className="h-[180px] pr-3">
        <div className="space-y-2">
          <TooltipProvider>
            {history.map((entry) => {
              const diff = entry.new_score - entry.old_score;
              const diffText = diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0);

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 text-xs border-b border-border/50 pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getChangeIcon(entry.old_score, entry.new_score)}
                    <span className="font-mono">
                      {entry.old_score?.toFixed(0) || '0'} → {entry.new_score?.toFixed(0) || '0'}
                    </span>
                    <span className={`font-medium ${getChangeColor(entry.old_score, entry.new_score)}`}>
                      ({diffText})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                          {getTriggerIcon(entry.triggered_by)}
                          {getTriggerLabel(entry.triggered_by)}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px]">{entry.change_reason}</p>
                      </TooltipContent>
                    </Tooltip>

                    <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      </ScrollArea>
    </div>
  );
}
