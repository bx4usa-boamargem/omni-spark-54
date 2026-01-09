import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getArticlePath } from "@/utils/blogUrl";

interface ArticleCardProps {
  title: string;
  excerpt?: string | null;
  slug: string;
  blogSlug: string;
  category?: string | null;
  publishedAt?: string | null;
  featuredImageUrl?: string | null;
  primaryColor?: string;
  customDomain?: string | null;
  domainVerified?: boolean | null;
}

const calculateReadingTime = (content?: string | null): number => {
  if (!content) return 3;
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

export const ArticleCard = ({
  title,
  excerpt,
  slug,
  blogSlug,
  category,
  publishedAt,
  featuredImageUrl,
  primaryColor,
  customDomain,
  domainVerified,
}: ArticleCardProps) => {
  const readingTime = calculateReadingTime(excerpt);
  const articlePath = getArticlePath(
    { slug: blogSlug, custom_domain: customDomain, domain_verified: domainVerified },
    slug
  );
  
  return (
    <Link 
      to={articlePath}
      className="group block"
    >
      <article className="bg-card border border-border/50 rounded-xl overflow-hidden hover:shadow-lg hover:border-border transition-all duration-300 h-full flex flex-col">
        {featuredImageUrl ? (
          <div className="aspect-video overflow-hidden bg-muted">
            <img
              src={featuredImageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </div>
        ) : (
          <div 
            className="aspect-video flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}15` || "hsl(var(--primary) / 0.1)" }}
          >
            <span 
              className="text-4xl font-heading font-bold opacity-30"
              style={{ color: primaryColor || "hsl(var(--primary))" }}
            >
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        <div className="p-5 flex flex-col flex-1">
          {category && (
            <Badge 
              variant="secondary" 
              className="w-fit mb-3 text-xs"
              style={{ 
                backgroundColor: `${primaryColor}15` || "hsl(var(--primary) / 0.1)",
                color: primaryColor || "hsl(var(--primary))"
              }}
            >
              {category}
            </Badge>
          )}
          
          <h2 className="font-heading font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {title}
          </h2>
          
          {excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
              {excerpt}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-3 border-t border-border/30">
            {publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(publishedAt).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readingTime} min de leitura
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};
