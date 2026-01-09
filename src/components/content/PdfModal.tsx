import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Upload, Loader2, Info, FileText, File, Layers, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Chunk {
  index: number;
  text: string;
  estimatedWords: number;
  suggestedTitle: string;
}

interface PdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (data: { 
    text: string; 
    articleCount?: number; 
    chunks?: Chunk[];
    mode: 'multiple' | 'summarized';
  }) => void;
}

export function PdfModal({ open, onOpenChange, onContinue }: PdfModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChunking, setIsChunking] = useState(false);
  const [pdfText, setPdfText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [processingMode, setProcessingMode] = useState<'multiple' | 'summarized'>('multiple');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const suggestedCount = Math.max(1, Math.floor(wordCount / 1500));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    setChunks([]);

    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('parse-pdf', {
          body: { fileBase64: base64, fileName: file.name }
        });

        if (error) throw error;

        if (data.error) {
          throw new Error(data.error);
        }

        const text = data.text || '';
        const words = text.split(/\s+/).filter((w: string) => w.length > 0).length;
        setPdfText(text);
        setWordCount(words);
        
        toast({
          title: "PDF processado!",
          description: `${words.toLocaleString()} palavras extraídas.`,
        });
        
        setIsLoading(false);

        // Auto-chunk if document is large enough
        if (words > 3000) {
          setIsChunking(true);
          try {
            const targetChunks = Math.max(1, Math.floor(words / 1500));
            const { data: chunkData, error: chunkError } = await supabase.functions.invoke('chunk-document', {
              body: { text, targetChunks }
            });

            if (chunkError) throw chunkError;

            if (chunkData.chunks && chunkData.chunks.length > 0) {
              setChunks(chunkData.chunks);
              toast({
                title: "Documento analisado!",
                description: `${chunkData.chunks.length} seções detectadas.`,
              });
            }
          } catch (chunkErr) {
            console.error('Error chunking document:', chunkErr);
            // Non-fatal, continue without chunks
          } finally {
            setIsChunking(false);
          }
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        variant: "destructive",
        title: "Erro ao processar PDF",
        description: error instanceof Error ? error.message : "Não foi possível ler o arquivo.",
      });
      setIsLoading(false);
    }
  };

  const handleShowPreview = () => {
    if (pdfText) {
      setShowPreview(true);
    }
  };

  const handleContinue = () => {
    onContinue({ 
      text: pdfText, 
      articleCount: chunks.length > 0 ? chunks.length : suggestedCount,
      chunks: chunks.length > 0 ? chunks : undefined,
      mode: processingMode
    });
    onOpenChange(false);
    setShowPreview(false);
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  const resetModal = () => {
    setPdfText("");
    setWordCount(0);
    setFileName("");
    setShowPreview(false);
    setChunks([]);
    setProcessingMode('multiple');
  };

  const displayItems: Array<Chunk & { excerpt?: string }> = chunks.length > 0 
    ? chunks.map(c => ({ ...c, excerpt: c.text.substring(0, 200) }))
    : Array.from({ length: suggestedCount }).map((_, index) => {
        const chunkSize = Math.floor(pdfText.length / suggestedCount);
        const start = index * chunkSize;
        const excerpt = pdfText.substring(start, start + 200).trim();
        return {
          index,
          text: '',
          estimatedWords: Math.floor(wordCount / suggestedCount),
          suggestedTitle: `Artigo ${index + 1} de ${suggestedCount}`,
          excerpt
        };
  });

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetModal(); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <File className="h-5 w-5 text-red-500" />
            Criar artigos a partir de Arquivo em PDF
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              {isLoading || isChunking ? (
                <>
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? 'Processando PDF...' : 'Analisando estrutura do documento...'}
                  </p>
                </>
              ) : fileName ? (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {wordCount.toLocaleString()} palavras extraídas
                  </p>
                  {chunks.length > 0 && (
                    <Badge variant="secondary" className="mt-2">
                      {chunks.length} seções detectadas
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para escolher um arquivo PDF
                  </p>
                </>
              )}
            </div>

            {pdfText && (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Modo de processamento</AlertTitle>
                  <AlertDescription className="space-y-4">
                    <p className="text-sm">
                      Documento com <strong>{wordCount.toLocaleString()} palavras</strong>. 
                      Escolha como deseja processar:
                    </p>
                    
                    <RadioGroup 
                      value={processingMode} 
                      onValueChange={(v) => setProcessingMode(v as 'multiple' | 'summarized')}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="multiple" id="multiple" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="multiple" className="cursor-pointer flex items-center gap-2 font-medium">
                            <Layers className="h-4 w-4 text-blue-500" />
                            Gerar {chunks.length > 0 ? chunks.length : suggestedCount} artigos separados
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Cada seção do documento vira um artigo completo na fila de geração
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="summarized" id="summarized" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="summarized" className="cursor-pointer flex items-center gap-2 font-medium">
                            <BookOpen className="h-4 w-4 text-green-500" />
                            Gerar 1 artigo resumido
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            A IA cria um resumo de 2000 palavras que é expandido em um único artigo
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </AlertDescription>
                </Alert>
              </>
            )}

            <Button 
              onClick={handleShowPreview} 
              className="w-full"
              disabled={!pdfText || isLoading || isChunking}
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
              <Badge variant={processingMode === 'multiple' ? 'default' : 'secondary'}>
                {processingMode === 'multiple' 
                  ? `${displayItems.length} artigos a gerar`
                  : '1 artigo resumido'
                }
              </Badge>
            </div>

            {processingMode === 'multiple' ? (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                {displayItems.map((item, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="font-medium text-sm">
                            {item.suggestedTitle}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {'excerpt' in item ? item.excerpt : item.text.substring(0, 150)}...
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            ~{item.estimatedWords.toLocaleString()} palavras
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <BookOpen className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="font-medium text-sm">
                          Artigo Resumido
                        </p>
                        <p className="text-xs text-muted-foreground">
                          A IA vai criar um resumo inteligente de ~2000 palavras preservando 
                          os pontos principais, dados e estatísticas do documento. 
                          Este resumo será usado como base para gerar um artigo completo.
                        </p>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {wordCount.toLocaleString()} → ~2000 palavras
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Preserva dados importantes
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Button 
              onClick={handleContinue} 
              className="w-full"
            >
              {processingMode === 'multiple' 
                ? `Adicionar ${displayItems.length} artigos à fila`
                : 'Continuar com resumo'
              }
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
