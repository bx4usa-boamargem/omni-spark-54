import { ArticleCard } from "./ArticleCard";

interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  category: string | null;
  published_at: string | null;
  featured_image_url: string | null;
}

interface RelatedArticlesProps {
  articles: Article[];
  blogSlug: string;
  primaryColor?: string;
  customDomain?: string | null;
  domainVerified?: boolean | null;
}

export const RelatedArticles = ({ 
  articles, 
  blogSlug, 
  primaryColor,
  customDomain,
  domainVerified 
}: RelatedArticlesProps) => {
  if (articles.length === 0) return null;

  return (
    <section className="mt-16 pt-12 border-t border-border/50">
      <h2 className="font-heading font-bold text-2xl text-foreground mb-8">
        Artigos Relacionados
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.slice(0, 3).map((article) => (
          <ArticleCard
            key={article.id}
            title={article.title}
            excerpt={article.excerpt}
            slug={article.slug}
            blogSlug={blogSlug}
            category={article.category}
            publishedAt={article.published_at}
            featuredImageUrl={article.featured_image_url}
            primaryColor={primaryColor}
            customDomain={customDomain}
            domainVerified={domainVerified}
          />
        ))}
      </div>
    </section>
  );
};
