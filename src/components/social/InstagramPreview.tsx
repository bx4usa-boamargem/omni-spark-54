import { ImageIcon, Heart, MessageCircle, Send, Bookmark } from "lucide-react";

interface InstagramPreviewProps {
  imageUrl: string | null;
  title: string;
}

export function InstagramPreview({ imageUrl, title }: InstagramPreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-background max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
            <span className="text-xs font-bold">B</span>
          </div>
        </div>
        <span className="text-sm font-medium">seu_blog</span>
      </div>

      {/* Image */}
      <div className="aspect-square bg-muted relative">
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

      {/* Actions */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6" />
            <MessageCircle className="h-6 w-6" />
            <Send className="h-6 w-6" />
          </div>
          <Bookmark className="h-6 w-6" />
        </div>

        {/* Likes */}
        <p className="text-sm font-medium">1.234 curtidas</p>

        {/* Caption preview */}
        <p className="text-sm">
          <span className="font-medium">seu_blog</span>{" "}
          <span className="text-muted-foreground line-clamp-2">
            📚 {title}
          </span>
        </p>

        <p className="text-xs text-muted-foreground">Ver todos os 42 comentários</p>
        <p className="text-xs text-muted-foreground uppercase">Há 2 horas</p>
      </div>
    </div>
  );
}
