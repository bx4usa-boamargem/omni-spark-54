import { BookOpen } from "lucide-react";

interface EbookCoverPreviewProps {
  title: string;
  author: string;
  logoUrl?: string;
  accentColor: string;
  coverImageUrl?: string | null;
}

export function EbookCoverPreview({
  title,
  author,
  logoUrl,
  accentColor,
  coverImageUrl,
}: EbookCoverPreviewProps) {
  return (
    <div
      className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg"
      style={{ backgroundColor: accentColor }}
    >
      {/* Background Image */}
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40" />
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-6 text-white">
        {/* Logo */}
        <div className="flex justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-10 object-contain" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold leading-tight line-clamp-4">{title}</h2>
          {author && <p className="text-sm text-white/80">Por {author}</p>}
        </div>

        {/* Decorative element */}
        <div className="flex justify-center">
          <div className="w-16 h-1 rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}
