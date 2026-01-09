import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, FileText } from "lucide-react";

interface AISuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (data: { instructions: string; quantity: number }) => void;
}

export function AISuggestionModal({ open, onOpenChange, onContinue }: AISuggestionModalProps) {
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showPreview, setShowPreview] = useState(false);

  const handleShowPreview = () => {
    setShowPreview(true);
  };

  const handleContinue = () => {
    onContinue({ instructions, quantity });
    onOpenChange(false);
    setShowPreview(false);
    setInstructions("");
    setQuantity(1);
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Criar artigos a partir de Sugestão da IA
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Se quiser, especifique informações relevantes para levarmos em consideração na hora de escolher os temas (opcional)
              </Label>
              <Textarea
                placeholder="Ex.: aborde os temas X e Y, inclua artigos sobre Z, dê prioridade para temas atuais, listas, guias completos, etc...."
                className="min-h-[120px]"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Quantidade de Artigos</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-32"
              />
            </div>

            <Button onClick={handleShowPreview} className="w-full">
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
                {quantity} artigo{quantity !== 1 ? 's' : ''} a gerar
              </Badge>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {Array.from({ length: quantity }).map((_, index) => (
                <Card key={index} className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <Sparkles className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm">
                          Artigo {index + 1} - Sugerido pela IA
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {instructions 
                            ? `Baseado em: ${instructions.substring(0, 80)}${instructions.length > 80 ? '...' : ''}`
                            : 'A IA irá sugerir um tema relevante para o seu blog'
                          }
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">
                            Tema automático
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            SEO otimizado
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button 
              onClick={handleContinue} 
              className="w-full"
            >
              Continuar com {quantity} artigo{quantity !== 1 ? 's' : ''}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
