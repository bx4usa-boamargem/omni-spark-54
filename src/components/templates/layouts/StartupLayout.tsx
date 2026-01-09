import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, ArrowRight, Rocket } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const StartupLayout = ({ blog, articles, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-950' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const borderClass = isDark ? 'border-gray-800' : 'border-gray-200';
  
  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Header */}
      <header className="py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={`/blog/${blog.slug}`} className="flex items-center gap-2">
            {blog.logo_url ? (
              <img src={isDark && blog.logo_negative_url ? blog.logo_negative_url : blog.logo_url} alt={blog.name} className="h-8 w-auto" />
            ) : (
              <>
                <Rocket className="h-6 w-6" style={{ color: blog.primary_color }} />
                <span className="font-bold text-lg">{blog.name}</span>
              </>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to={`/blog/${blog.slug}`} className={`text-sm ${mutedClass}`}>Blog</Link>
            <a 
              href={blog.cta_url || '#'}
              className="text-sm px-4 py-2 rounded-full text-white"
              style={{ backgroundColor: blog.primary_color }}
            >
              {blog.cta_text || 'Comece Agora'}
            </a>
          </nav>
        </div>
      </header>
      
      {/* Hero - Split */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span 
                className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{ 
                  backgroundColor: `${blog.primary_color}20`,
                  color: blog.primary_color 
                }}
              >
                Blog
              </span>
              <h1 className={`text-4xl md:text-5xl font-bold mt-4 leading-tight ${textClass}`}>
                {blog.banner_title || `Explore o blog ${blog.name}`}
              </h1>
              <p className={`mt-6 text-lg ${mutedClass}`}>
                {blog.banner_description || blog.description}
              </p>
              {blog.cta_url && (
                <a 
                  href={blog.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full text-white font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: blog.primary_color }}
                >
                  {blog.cta_text || 'Saiba Mais'}
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
            <div className="hidden lg:block">
              <div 
                className="aspect-square rounded-3xl"
                style={{
                  background: `linear-gradient(135deg, ${blog.primary_color}30, ${blog.secondary_color || blog.primary_color}20)`
                }}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Articles */}
      <section className={`py-16 px-6 ${cardBg}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-2xl font-bold ${textClass}`}>Últimos Artigos</h2>
            <Link 
              to={`/blog/${blog.slug}`} 
              className="flex items-center gap-1 text-sm font-medium"
              style={{ color: blog.primary_color }}
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {articles.map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${bgClass} rounded-2xl overflow-hidden border ${borderClass} hover:shadow-xl transition-shadow group`}
              >
                {article.featured_image_url && (
                  <div className="aspect-[2/1] overflow-hidden">
                    <img 
                      src={article.featured_image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    {article.category && (
                      <span 
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: `${blog.primary_color}15`,
                          color: blog.primary_color 
                        }}
                      >
                        {article.category}
                      </span>
                    )}
                    <span className={`text-xs ${mutedClass}`}>
                      {format(new Date(article.published_at || article.created_at), "d 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>
                  <h3 className={`text-xl font-bold ${textClass} group-hover:underline`}>
                    {article.title}
                  </h3>
                  <p className={`mt-2 ${mutedClass} line-clamp-2`}>
                    {article.excerpt}
                  </p>
                  <div className={`flex items-center gap-4 mt-4 text-sm ${mutedClass}`}>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {article.reading_time || 5} min
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className={`py-12 px-6 border-t ${borderClass}`}>
        <div className="max-w-6xl mx-auto text-center">
          <Link to={`/blog/${blog.slug}`} className="inline-flex items-center gap-2 mb-4">
            {blog.logo_url ? (
              <img src={isDark && blog.logo_negative_url ? blog.logo_negative_url : blog.logo_url} alt={blog.name} className="h-6 w-auto" />
            ) : (
              <Rocket className="h-5 w-5" style={{ color: blog.primary_color }} />
            )}
            <span className="font-bold">{blog.name}</span>
          </Link>
          <p className={`text-sm ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.name}
          </p>
        </div>
      </footer>
    </div>
  );
};
