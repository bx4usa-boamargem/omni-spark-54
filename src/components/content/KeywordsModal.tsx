import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, FileText } from "lucide-react";

interface KeywordsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (keywords: string[]) => void;
}

export function KeywordsModal({ open, onOpenChange, onContinue }: KeywordsModalProps) {
  const [keywordsText, setKeywordsText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const keywords = keywordsText
    .split('\n')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  const handleShowPreview = () => {
    if (keywords.length > 0) {
      setShowPreview(true);
    }
  };

  const handleContinue = () => {
    onContinue(keywords);
    onOpenChange(false);
    setShowPreview(false);
    setKeywordsText("");
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Criar artigos a partir de Palavras-Chave
          </DialogTitle>
          <DialogDescription className="text-center">
            Analise resultados reais do Google para uma palavra-chave para entender o que você precisa fazer para rankear bem e entregar o que o seu leitor precisa.
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Textarea
                placeholder={`Ex.: ia para blog\nautomação de seo\nchatgpt para blog\nblog automático`}
                className="min-h-[180px] font-mono text-sm"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Escreva os termos separados, um em cada linha
                {keywords.length > 0 && ` • ${keywords.length} palavra${keywords.length !== 1 ? 's' : ''}-chave`}
              </p>
            </div>

            <Button 
              onClick={handleShowPreview} 
              className="w-full"
              disabled={keywords.length === 0}
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
                {keywords.length} artigo{keywords.length !== 1 ? 's' : ''} a gerar
              </Badge>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {keywords.map((keyword, index) => (
                <Card key={index} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm">
                          Artigo para: "{keyword}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Artigo otimizado para SEO com análise de concorrência
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          Análise SERP incluída
                        </Badge>
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
              Continuar com {keywords.length} artigo{keywords.length !== 1 ? 's' : ''}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
