import { ImageIcon, ThumbsUp, MessageSquare, Repeat2, Send } from "lucide-react";

interface LinkedInPreviewProps {
  imageUrl: string | null;
  title: string;
  excerpt: string;
}

export function LinkedInPreview({ imageUrl, title, excerpt }: LinkedInPreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-background max-w-md mx-auto">
      {/* Header */}
      <div className="p-3 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-primary">B</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Seu Blog</p>
          <p className="text-xs text-muted-foreground">1.234 seguidores</p>
          <p className="text-xs text-muted-foreground">2h • 🌐</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        <p className="text-sm line-clamp-3">{excerpt}</p>
        <button className="text-sm text-muted-foreground hover:text-primary hover:underline mt-1">
          ...ver mais
        </button>
      </div>

      {/* Article Preview */}
      <div className="border-t border-b">
        <div className="aspect-[1.91/1] bg-muted relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
        </div>
        <div className="p-3 bg-muted/30">
          <p className="font-semibold text-sm line-clamp-2">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">seu-blog.omniseen.com</p>
        </div>
      </div>

      {/* Engagement */}
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white">👍</span>
              <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white">❤️</span>
            </div>
            <span>42</span>
          </div>
          <span>8 comentários • 3 compartilhamentos</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-around border-t pt-2">
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary text-sm py-2 px-3 rounded-lg hover:bg-muted transition-colors">
            <ThumbsUp className="h-4 w-4" />
            <span>Gostei</span>
          </button>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary text-sm py-2 px-3 rounded-lg hover:bg-muted transition-colors">
            <MessageSquare className="h-4 w-4" />
            <span>Comentar</span>
          </button>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary text-sm py-2 px-3 rounded-lg hover:bg-muted transition-colors">
            <Repeat2 className="h-4 w-4" />
            <span>Repostar</span>
          </button>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary text-sm py-2 px-3 rounded-lg hover:bg-muted transition-colors">
            <Send className="h-4 w-4" />
            <span>Enviar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
