import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, ArrowRight } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const ModernLayout = ({ blog, articles, featuredArticle, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  
  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Header */}
      <header className={`border-b ${borderClass} py-4 px-6 sticky top-0 ${bgClass} z-50`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={`/blog/${blog.slug}`} className="flex items-center gap-3">
            {blog.logo_url ? (
              <img src={isDark && blog.logo_negative_url ? blog.logo_negative_url : blog.logo_url} alt={blog.name} className="h-8 w-auto" />
            ) : (
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: blog.primary_color }}
              >
                {blog.name.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-lg">{blog.name}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to={`/blog/${blog.slug}`} className={`text-sm ${mutedClass} hover:${textClass} transition-colors`}>Home</Link>
            <span className={`text-sm ${mutedClass}`}>Artigos</span>
          </nav>
        </div>
      </header>
      
      {/* Hero */}
      <section 
        className="py-20 px-6"
        style={{
          background: `linear-gradient(135deg, ${blog.primary_color}15, ${blog.primary_color}05)`
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${textClass}`}>
            {blog.banner_title || blog.name}
          </h1>
          <p className={`text-lg md:text-xl ${mutedClass}`}>
            {blog.banner_description || blog.description}
          </p>
        </div>
      </section>
      
      {/* Articles Grid */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-2xl font-bold mb-8 ${textClass}`}>Últimos Artigos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${cardBg} rounded-xl overflow-hidden border ${borderClass} hover:shadow-lg transition-all group`}
              >
                {article.featured_image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={article.featured_image_url} 
                      alt={article.featured_image_alt || article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h3 className={`font-semibold mb-2 ${textClass} group-hover:text-primary transition-colors line-clamp-2`}>
                    {article.title}
                  </h3>
                  <p className={`text-sm ${mutedClass} line-clamp-2 mb-3`}>
                    {article.excerpt}
                  </p>
                  <div className={`flex items-center justify-between text-xs ${mutedClass}`}>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.reading_time || 5} min
                    </span>
                    <span>
                      {format(new Date(article.published_at || article.created_at), "d 'de' MMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Banner */}
      {blog.cta_url && (
        <section 
          className="py-16 px-6"
          style={{ backgroundColor: blog.primary_color }}
        >
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {blog.cta_text || 'Saiba mais'}
            </h2>
            <a 
              href={blog.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Acessar
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className={`border-t ${borderClass} py-8 px-6`}>
        <div className="max-w-6xl mx-auto text-center">
          <p className={`text-sm ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.name}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};
