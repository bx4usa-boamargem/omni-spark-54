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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Youtube, Play, FileText } from "lucide-react";

interface YouTubeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (data: { links: string[]; embedVideo: boolean }) => void;
}

export function YouTubeModal({ open, onOpenChange, onContinue }: YouTubeModalProps) {
  const [linksText, setLinksText] = useState("");
  const [embedVideo, setEmbedVideo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const links = linksText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && (l.includes('youtube.com') || l.includes('youtu.be')));

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/shorts\/([^?]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleShowPreview = () => {
    if (links.length > 0) {
      setShowPreview(true);
    }
  };

  const handleContinue = () => {
    onContinue({ links, embedVideo });
    onOpenChange(false);
    setShowPreview(false);
    setLinksText("");
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            Criar artigos a partir de Vídeos do YouTube
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Lista de vídeos (um link em cada linha)</Label>
              <Textarea
                placeholder={`Ex.: https://youtube.com/watch?v=abc123\nhttps://youtu.be/xyz789\nhttps://youtube.com/shorts/short123`}
                className="min-h-[150px] font-mono text-sm"
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
              />
              {links.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {links.length} vídeo{links.length !== 1 ? 's' : ''} detectado{links.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">Incluir os vídeos dentro do artigo</Label>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Novo
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Além de usarmos o conteúdo como inspiração, iremos incluir o vídeo dentro do artigo com embedding. Recomendamos apenas se os vídeos forem seus.
                </p>
              </div>
              <Switch
                checked={embedVideo}
                onCheckedChange={setEmbedVideo}
              />
            </div>

            <Button 
              onClick={handleShowPreview} 
              className="w-full"
              disabled={links.length === 0}
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
                {links.length} artigo{links.length !== 1 ? 's' : ''} a gerar
              </Badge>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {links.map((link, index) => {
                const videoId = extractVideoId(link);
                const isShort = link.includes('/shorts/');
                
                return (
                  <Card key={index} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative w-24 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                          {videoId ? (
                            <img 
                              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                              alt="Video thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <Play className="h-5 w-5 text-white fill-white" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            Vídeo {index + 1}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {link}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {isShort ? 'Short' : 'Vídeo'}
                            </Badge>
                            {embedVideo && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                Embed incluído
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button 
              onClick={handleContinue} 
              className="w-full"
            >
              Continuar com {links.length} vídeo{links.length !== 1 ? 's' : ''}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
