import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, ArrowRight } from "lucide-react";

interface Blog {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  author_name?: string | null;
  author_photo_url?: string | null;
  author_bio?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  reading_time?: number | null;
  created_at: string;
  published_at?: string | null;
  category?: string | null;
}

interface AutomarticlesLayoutProps {
  blog: Blog;
  articles: Article[];
  featuredArticle?: Article | null;
  isDark?: boolean;
}

export function AutomarticlesLayout({ blog, articles, featuredArticle, isDark }: AutomarticlesLayoutProps) {
  const primaryColor = blog.primary_color || '#1e40af';
  
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d 'de' MMMM, yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
      {/* Header - Ultra Minimal */}
      <header className="py-8 px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {blog.logo_url && (
            <Link to={`/blog/${blog.slug}`}>
              <img 
                src={blog.logo_url} 
                alt={blog.name} 
                className="h-10 w-auto"
              />
            </Link>
          )}
          <Link to={`/blog/${blog.slug}`} className="font-serif text-xl font-medium hover:opacity-80 transition-opacity">
            {blog.name}
          </Link>
        </div>
      </header>

      {/* Hero - Elegant Typography */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight leading-tight mb-6">
            {blog.name}
          </h1>
          {blog.description && (
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {blog.description}
            </p>
          )}
        </div>
      </section>

      {/* Articles - Single Column List */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="divide-y divide-border">
            {articles.map((article) => (
              <article key={article.id} className="py-10 first:pt-0 last:pb-0 group">
                <Link to={`/blog/${blog.slug}/${article.slug}`} className="block">
                  {/* Category & Date */}
                  <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
                    {article.category && (
                      <>
                        <span 
                          className="font-medium uppercase tracking-wider text-xs"
                          style={{ color: primaryColor }}
                        >
                          {article.category}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <time>
                      {formatDate(article.published_at || article.created_at)}
                    </time>
                    {article.reading_time && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {article.reading_time} min
                        </span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="font-serif text-2xl md:text-3xl font-medium mb-4 group-hover:opacity-70 transition-opacity leading-snug">
                    {article.title}
                  </h2>

                  {/* Excerpt */}
                  {article.excerpt && (
                    <p className="text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                  )}

                  {/* Read More */}
                  <div 
                    className="inline-flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all"
                    style={{ color: primaryColor }}
                  >
                    Ler artigo
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </article>
            ))}
          </div>

          {articles.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">Nenhum artigo publicado ainda.</p>
            </div>
          )}
        </div>
      </section>

      {/* Author Section */}
      {blog.author_name && (
        <section className={`py-16 px-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start gap-6">
              {blog.author_photo_url && (
                <img 
                  src={blog.author_photo_url} 
                  alt={blog.author_name}
                  className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div>
                <p className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Sobre o autor</p>
                <h3 className="font-serif text-xl font-medium mb-3">{blog.author_name}</h3>
                {blog.author_bio && (
                  <p className="text-muted-foreground leading-relaxed">{blog.author_bio}</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {blog.cta_text && blog.cta_url && (
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <blockquote 
              className="font-serif text-2xl md:text-3xl italic mb-8 pl-6 border-l-4"
              style={{ borderColor: primaryColor }}
            >
              "Quem age rápido, colhe primeiro."
            </blockquote>
            <a
              href={blog.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 font-medium text-white rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {blog.cta_text}
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </section>
      )}

      {/* Footer - Minimal */}
      <footer className={`py-8 px-6 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="max-w-3xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {blog.name}</p>
          {blog.logo_url && (
            <img 
              src={blog.logo_url} 
              alt={blog.name}
              className="h-6 w-auto opacity-50"
            />
          )}
        </div>
      </footer>
    </div>
  );
}
