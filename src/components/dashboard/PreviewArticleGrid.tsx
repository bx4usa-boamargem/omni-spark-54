interface Article {
  id: string;
  title: string;
  featured_image_url?: string | null;
}

interface PreviewArticleGridProps {
  articles: Article[];
  primaryColor: string;
}

export function PreviewArticleGrid({ articles, primaryColor }: PreviewArticleGridProps) {
  if (articles.length === 0) {
    return (
      <div className="px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">Nenhum artigo publicado ainda</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-background">
      <div className="grid grid-cols-3 gap-2">
        {articles.map((article) => (
          <div 
            key={article.id}
            className="rounded border border-border/50 overflow-hidden bg-card"
          >
            {article.featured_image_url ? (
              <div className="aspect-video bg-muted">
                <img 
                  src={article.featured_image_url} 
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div 
                className="aspect-video flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <span 
                  className="text-lg font-bold opacity-30"
                  style={{ color: primaryColor }}
                >
                  {article.title.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="p-1.5">
              <p className="text-[10px] font-medium line-clamp-2 leading-tight text-foreground">
                {article.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
