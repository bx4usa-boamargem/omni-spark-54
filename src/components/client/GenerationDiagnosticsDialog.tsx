/**
 * Generation Diagnostics Dialog
 * 
 * Shows detailed info about the generation process:
 * - Provider used for each stage
 * - Timing information
 * - Placeholder/fallback status
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Image, Search, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiagnosticsData {
  research?: {
    provider: string;
    durationMs: number;
    success: boolean;
    usedFallback?: boolean;
  };
  writer?: {
    provider: string;
    durationMs: number;
    success: boolean;
  };
  qa?: {
    provider: string;
    durationMs: number;
    score?: number;
  };
  images?: {
    total: number;
    completed: number;
    pending: boolean;
    usedPlaceholders: boolean;
    durationMs?: number;
  };
  totalDurationMs?: number;
}

interface GenerationDiagnosticsDialogProps {
  diagnostics: DiagnosticsData | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function GenerationDiagnosticsDialog({
  diagnostics,
  isOpen,
  onOpenChange,
  trigger
}: GenerationDiagnosticsDialogProps) {
  if (!diagnostics) {
    return null;
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Diagnóstico da Geração
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Research Stage */}
          {diagnostics.research && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Pesquisa</p>
                  <p className="text-xs text-muted-foreground">{diagnostics.research.provider}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={diagnostics.research.success ? 'default' : 'destructive'} className="text-xs">
                  {diagnostics.research.success ? 'OK' : 'Falhou'}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(diagnostics.research.durationMs)}
                </span>
                {diagnostics.research.usedFallback && (
                  <Badge variant="secondary" className="text-xs">Fallback</Badge>
                )}
              </div>
            </div>
          )}

          {/* Writer Stage */}
          {diagnostics.writer && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Escrita</p>
                  <p className="text-xs text-muted-foreground">{diagnostics.writer.provider}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={diagnostics.writer.success ? 'default' : 'destructive'} className="text-xs">
                  {diagnostics.writer.success ? 'OK' : 'Falhou'}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(diagnostics.writer.durationMs)}
                </span>
              </div>
            </div>
          )}

          {/* QA Stage */}
          {diagnostics.qa && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Quality Assurance</p>
                  <p className="text-xs text-muted-foreground">{diagnostics.qa.provider}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {diagnostics.qa.score !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    Score: {diagnostics.qa.score}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(diagnostics.qa.durationMs)}
                </span>
              </div>
            </div>
          )}

          {/* Images Stage */}
          {diagnostics.images && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Image className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Imagens</p>
                  <p className="text-xs text-muted-foreground">
                    {diagnostics.images.completed}/{diagnostics.images.total} geradas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {diagnostics.images.pending ? (
                  <Badge variant="secondary" className="text-xs animate-pulse">
                    Gerando...
                  </Badge>
                ) : diagnostics.images.usedPlaceholders ? (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Placeholders
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">Completo</Badge>
                )}
                {diagnostics.images.durationMs && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(diagnostics.images.durationMs)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Total Duration */}
          {diagnostics.totalDurationMs && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tempo total</span>
                <span className="font-medium">{formatDuration(diagnostics.totalDurationMs)}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
