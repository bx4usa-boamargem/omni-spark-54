import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, FileEdit, AlertTriangle, Lightbulb, Target, Search } from "lucide-react";

interface Improvement {
  type: 'paragraph' | 'visual_block' | 'seo' | 'cta';
  description: string;
  location?: string;
}

interface ImproveStats {
  addedVisualBlocks: number;
  fixedParagraphs: number;
  seoIssues: number;
  totalImprovements: number;
}

interface ImproveArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  improvements: Improvement[];
  stats: ImproveStats;
  onKeep: () => void;
  onDiscard: () => void;
}

const getIcon = (type: Improvement['type']) => {
  switch (type) {
    case 'paragraph':
      return <FileEdit className="h-4 w-4 text-blue-500" />;
    case 'visual_block':
      return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    case 'seo':
      return <Search className="h-4 w-4 text-green-500" />;
    case 'cta':
      return <Target className="h-4 w-4 text-purple-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getTypeLabel = (type: Improvement['type']) => {
  switch (type) {
    case 'paragraph':
      return 'Parágrafo';
    case 'visual_block':
      return 'Bloco Visual';
    case 'seo':
      return 'SEO';
    case 'cta':
      return 'CTA';
    default:
      return 'Outro';
  }
};

export function ImproveArticleDialog({
  open,
  onOpenChange,
  improvements,
  stats,
  onKeep,
  onDiscard,
}: ImproveArticleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Melhorias Aplicadas
          </DialogTitle>
          <DialogDescription>
            O artigo foi analisado e otimizado automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.fixedParagraphs}</div>
            <div className="text-xs text-muted-foreground">Parágrafos corrigidos</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-yellow-500">{stats.addedVisualBlocks}</div>
            <div className="text-xs text-muted-foreground">Blocos visuais</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.seoIssues}</div>
            <div className="text-xs text-muted-foreground">Alertas SEO</div>
          </div>
        </div>

        {/* Improvements List */}
        <ScrollArea className="h-[200px] rounded-lg border p-3">
          <div className="space-y-2">
            {improvements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma melhoria necessária - o artigo já está otimizado!
              </p>
            ) : (
              improvements.map((improvement, index) => (
                <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  {getIcon(improvement.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(improvement.type)}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1">{improvement.description}</p>
                    {improvement.location && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {improvement.location}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDiscard}>
            <X className="h-4 w-4 mr-2" />
            Desfazer
          </Button>
          <Button onClick={onKeep} className="bg-green-600 hover:bg-green-700">
            <Check className="h-4 w-4 mr-2" />
            Manter Melhorias
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
