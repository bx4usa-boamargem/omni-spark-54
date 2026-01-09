import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Upload, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CsvModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (data: { themes: string[]; keywords?: string[]; wordCounts?: number[]; instructions?: string[] }) => void;
}

export function CsvModal({ open, onOpenChange, onContinue }: CsvModalProps) {
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [titleColumn, setTitleColumn] = useState<number>(0);
  const [keywordColumn, setKeywordColumn] = useState<number | null>(null);
  const [wordCountColumn, setWordCountColumn] = useState<number | null>(null);
  const [instructionsColumn, setInstructionsColumn] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast({
            variant: "destructive",
            title: "CSV inválido",
            description: "O arquivo precisa ter pelo menos um cabeçalho e uma linha de dados.",
          });
          setIsProcessing(false);
          return;
        }

        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if ((char === ',' || char === ';') && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1).map(line => parseCSVLine(line));

        setCsvHeaders(headers);
        setCsvData(rows);
        setTitleColumn(0);
        setKeywordColumn(null);
        setWordCountColumn(null);
        setInstructionsColumn(null);
        
        toast({
          title: "CSV importado!",
          description: `${rows.length} linhas encontradas.`,
        });
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          variant: "destructive",
          title: "Erro ao ler CSV",
          description: "Não foi possível processar o arquivo.",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
  };

  const themes = csvData
    ? csvData.map(row => row[titleColumn]).filter(t => t?.trim()).slice(0, 100)
    : [];

  const handleShowPreview = () => {
    if (themes.length > 0) {
      setShowPreview(true);
    }
  };

  const handleContinue = () => {
    if (!csvData) return;

    const keywords = keywordColumn !== null 
      ? csvData.map(row => row[keywordColumn] || '').slice(0, 100)
      : undefined;

    const wordCounts = wordCountColumn !== null
      ? csvData.map(row => parseInt(row[wordCountColumn]) || 0).slice(0, 100)
      : undefined;

    const instructions = instructionsColumn !== null
      ? csvData.map(row => row[instructionsColumn] || '').slice(0, 100)
      : undefined;

    onContinue({ themes, keywords, wordCounts, instructions });
    onOpenChange(false);
    setShowPreview(false);
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  const resetModal = () => {
    setCsvData(null);
    setCsvHeaders([]);
    setTitleColumn(0);
    setKeywordColumn(null);
    setWordCountColumn(null);
    setInstructionsColumn(null);
    setShowPreview(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetModal(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar CSV
          </DialogTitle>
          {!csvData && (
            <DialogDescription className="text-center space-y-2">
              <span>Importe um arquivo '.csv' que contenha as colunas:</span>
              <ul className="text-left list-disc pl-6 space-y-1">
                <li><strong>Título</strong> (obrigatório)</li>
                <li>Palavra-chave (opcional)</li>
                <li>Quantidade de Palavras (opcional)</li>
                <li>Instruções (opcional)</li>
              </ul>
              <span className="text-xs block mt-2">
                Obs.: tanto faz os nomes das colunas no seu arquivo atual, faremos um relacionamento quando fizer a importação. O número máximo de posts a serem importados é 100 a cada arquivo.
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            {!csvData ? (
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                )}
                <p className="text-sm text-muted-foreground">
                  Clique para escolher o seu arquivo CSV
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Coluna do Título (obrigatório)</Label>
                  <Select 
                    value={String(titleColumn)} 
                    onValueChange={(v) => setTitleColumn(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={String(index)}>
                          {header || `Coluna ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna de Palavra-chave (opcional)</Label>
                  <Select 
                    value={keywordColumn !== null ? String(keywordColumn) : "none"} 
                    onValueChange={(v) => setKeywordColumn(v === "none" ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não usar</SelectItem>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={String(index)}>
                          {header || `Coluna ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna de Quantidade de Palavras (opcional)</Label>
                  <Select 
                    value={wordCountColumn !== null ? String(wordCountColumn) : "none"} 
                    onValueChange={(v) => setWordCountColumn(v === "none" ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não usar</SelectItem>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={String(index)}>
                          {header || `Coluna ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna de Instruções (opcional)</Label>
                  <Select 
                    value={instructionsColumn !== null ? String(instructionsColumn) : "none"} 
                    onValueChange={(v) => setInstructionsColumn(v === "none" ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não usar</SelectItem>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={String(index)}>
                          {header || `Coluna ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>{themes.length}</strong> artigos serão importados
                  </p>
                </div>

                <Button variant="ghost" size="sm" onClick={resetModal}>
                  Escolher outro arquivo
                </Button>
              </div>
            )}

            <Button 
              onClick={handleShowPreview} 
              className="w-full"
              disabled={!csvData || themes.length === 0}
            >
              Ver Preview
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ← Voltar
              </Button>
              <Badge variant="outline">
                {themes.length} artigo{themes.length !== 1 ? 's' : ''} a gerar
              </Badge>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {themes.slice(0, 20).map((theme, index) => {
                const keyword = keywordColumn !== null ? csvData?.[index]?.[keywordColumn] : null;
                const wordCount = wordCountColumn !== null ? csvData?.[index]?.[wordCountColumn] : null;
                
                return (
                  <Card key={index} className="border-l-4 border-l-green-600">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <FileText className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">
                            {theme}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {keyword && (
                              <Badge variant="secondary" className="text-xs">
                                {keyword}
                              </Badge>
                            )}
                            {wordCount && (
                              <Badge variant="outline" className="text-xs">
                                {wordCount} palavras
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {themes.length > 20 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  + {themes.length - 20} artigos não exibidos
                </p>
              )}
            </div>

            <Button 
              onClick={handleContinue} 
              className="w-full"
            >
              Continuar com {themes.length} artigo{themes.length !== 1 ? 's' : ''}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
