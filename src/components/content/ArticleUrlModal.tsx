import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Link2, FileText, ExternalLink } from "lucide-react";

interface ArticleUrlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (data: { links: string[]; isText: boolean; text?: string }) => void;
}

export function ArticleUrlModal({ open, onOpenChange, onContinue }: ArticleUrlModalProps) {
  const [linksText, setLinksText] = useState("");
  const [useText, setUseText] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const links = linksText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url.substring(0, 30);
    }
  };

  const handleShowPreview = () => {
    if ((useText && linksText.trim()) || (!useText && links.length > 0)) {
      setShowPreview(true);
    }
  };

  const handleContinue = () => {
    if (useText) {
      onContinue({ links: [], isText: true, text: linksText });
    } else {
      onContinue({ links, isText: false });
    }
    onOpenChange(false);
    setShowPreview(false);
    setLinksText("");
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  const itemCount = useText ? (linksText.trim() ? 1 : 0) : links.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Link2 className="h-5 w-5 text-blue-500" />
            Criar a partir de Artigos ou Notícias
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>{useText ? "Texto de referência" : "Lista de Links (um em cada linha)"}</Label>
              <Textarea
                placeholder={useText 
                  ? "Cole aqui o texto que será usado como referência para criar o artigo..."
                  : `Ex.: https://automarticles.com/blog/palavras-chave\nhttps://automarticles.com/blog/seo-guia-completo\nhttps://automarticles.com/blog/chatgpt-o-que-e`
                }
                className="min-h-[180px] font-mono text-sm"
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
              />
              {!useText && links.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {links.length} link{links.length !== 1 ? 's' : ''} detectado{links.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="font-medium">Usar texto de referência em vez de links</Label>
                <p className="text-xs text-muted-foreground">
                  Caso prefira, ou caso seu texto não esteja em um link, você pode colar diretamente aqui o corpo do texto que será usado como referência.
                </p>
              </div>
              <Switch
                checked={useText}
                onCheckedChange={setUseText}
              />
            </div>

            <Button 
              onClick={handleShowPreview} 
              className="w-full"
              disabled={itemCount === 0}
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
                {itemCount} artigo{itemCount !== 1 ? 's' : ''} a gerar
              </Badge>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {useText ? (
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium text-sm">
                          Artigo baseado em texto
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {linksText.substring(0, 150)}...
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          Reescrita com sua voz
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                links.map((link, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <ExternalLink className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {extractDomain(link)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {link}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">
                              Reescrita
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Conteúdo original
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <Button 
              onClick={handleContinue} 
              className="w-full"
            >
              Continuar com {itemCount} artigo{itemCount !== 1 ? 's' : ''}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
