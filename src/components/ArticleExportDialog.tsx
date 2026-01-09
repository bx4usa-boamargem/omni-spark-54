import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText, FileType, Code, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  exportToPDF, 
  exportToWord, 
  exportToHTML, 
  type ExportArticle, 
  type ExportOptions 
} from "@/utils/articleExport";

interface ArticleExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: ExportArticle;
}

export function ArticleExportDialog({ open, onOpenChange, article }: ArticleExportDialogProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [options, setOptions] = useState<ExportOptions>({
    includeImage: true,
    includeFaq: true,
    includeMeta: true,
  });

  const handleExport = async (format: 'pdf' | 'word' | 'html') => {
    setIsExporting(format);
    
    try {
      switch (format) {
        case 'pdf':
          await exportToPDF(article, options);
          break;
        case 'word':
          await exportToWord(article, options);
          break;
        case 'html':
          exportToHTML(article, options);
          break;
      }
      
      toast({
        title: "Exportação concluída!",
        description: `O artigo foi exportado com sucesso.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar o artigo. Tente novamente.",
      });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportar Artigo
          </DialogTitle>
          <DialogDescription>
            Escolha o formato de exportação e as opções desejadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex flex-col gap-2 h-auto py-4"
              onClick={() => handleExport('pdf')}
              disabled={isExporting !== null}
            >
              {isExporting === 'pdf' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileText className="h-6 w-6 text-red-500" />
              )}
              <span className="text-xs font-medium">PDF</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col gap-2 h-auto py-4"
              onClick={() => handleExport('word')}
              disabled={isExporting !== null}
            >
              {isExporting === 'word' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileType className="h-6 w-6 text-blue-500" />
              )}
              <span className="text-xs font-medium">Word</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col gap-2 h-auto py-4"
              onClick={() => handleExport('html')}
              disabled={isExporting !== null}
            >
              {isExporting === 'html' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Code className="h-6 w-6 text-orange-500" />
              )}
              <span className="text-xs font-medium">HTML</span>
            </Button>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground">Opções:</p>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-image"
                checked={options.includeImage}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeImage: checked === true }))
                }
              />
              <Label htmlFor="include-image" className="text-sm cursor-pointer">
                Incluir imagem de capa
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-faq"
                checked={options.includeFaq}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeFaq: checked === true }))
                }
              />
              <Label htmlFor="include-faq" className="text-sm cursor-pointer">
                Incluir FAQ
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-meta"
                checked={options.includeMeta}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, includeMeta: checked === true }))
                }
              />
              <Label htmlFor="include-meta" className="text-sm cursor-pointer">
                Incluir meta description
              </Label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
