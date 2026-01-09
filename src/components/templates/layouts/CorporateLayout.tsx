import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, ArrowRight, Building2 } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const CorporateLayout = ({ blog, articles, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-900' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  
  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Header */}
      <header className={`border-b ${borderClass} py-4 px-6`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={`/blog/${blog.slug}`} className="flex items-center gap-3">
            {blog.logo_url ? (
              <img src={isDark && blog.logo_negative_url ? blog.logo_negative_url : blog.logo_url} alt={blog.name} className="h-10 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <Building2 className="h-8 w-8" style={{ color: blog.primary_color }} />
                <span className="font-semibold text-xl">{blog.name}</span>
              </div>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link to={`/blog/${blog.slug}`} className={`text-sm ${mutedClass} hover:${textClass}`}>Home</Link>
            <span className={`text-sm ${mutedClass}`}>Blog</span>
            <span className={`text-sm ${mutedClass}`}>Sobre</span>
            <span className={`text-sm ${mutedClass}`}>Contato</span>
          </nav>
        </div>
      </header>
      
      {/* Hero Banner */}
      <section 
        className="py-16 px-6"
        style={{
          background: `linear-gradient(90deg, ${blog.primary_color}, ${blog.secondary_color || blog.primary_color})`
        }}
      >
        <div className="max-w-6xl mx-auto text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {blog.banner_title || `Blog ${blog.name}`}
          </h1>
          <p className="text-lg opacity-90 max-w-2xl">
            {blog.banner_description || blog.description}
          </p>
        </div>
      </section>
      
      {/* Breadcrumb */}
      <div className={`border-b ${borderClass} py-3 px-6`}>
        <div className="max-w-6xl mx-auto">
          <nav className={`text-sm ${mutedClass}`}>
            <span>Home</span>
            <span className="mx-2">/</span>
            <span className={textClass}>Blog</span>
          </nav>
        </div>
      </div>
      
      {/* Articles Grid */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-xl font-semibold ${textClass}`}>Artigos Recentes</h2>
            <span className={`text-sm ${mutedClass}`}>{articles.length} artigos</span>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${cardBg} overflow-hidden group border ${borderClass} hover:border-gray-300 dark:hover:border-gray-600 transition-colors`}
              >
                {article.featured_image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={article.featured_image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span 
                      className="text-xs font-medium px-2 py-1"
                      style={{ 
                        backgroundColor: `${blog.primary_color}15`,
                        color: blog.primary_color 
                      }}
                    >
                      {article.category || 'Artigo'}
                    </span>
                    <span className={`text-xs ${mutedClass}`}>
                      {format(new Date(article.published_at || article.created_at), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <h3 className={`font-semibold ${textClass} line-clamp-2 group-hover:underline`}>
                    {article.title}
                  </h3>
                  <p className={`mt-2 text-sm ${mutedClass} line-clamp-2`}>
                    {article.excerpt}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`text-xs ${mutedClass} flex items-center gap-1`}>
                      <Clock className="h-3 w-3" />
                      {article.reading_time || 5} min
                    </span>
                    <span 
                      className="text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
                      style={{ color: blog.primary_color }}
                    >
                      Ler mais
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      {blog.cta_url && (
        <section className={`py-12 px-6 ${cardBg}`}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-semibold ${textClass}`}>
                Quer saber mais sobre nossos serviços?
              </h3>
              <p className={`mt-1 ${mutedClass}`}>
                Entre em contato conosco para uma consultoria gratuita.
              </p>
            </div>
            <a 
              href={blog.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 text-white font-medium rounded hover:opacity-90 transition-opacity"
              style={{ backgroundColor: blog.primary_color }}
            >
              {blog.cta_text || 'Fale Conosco'}
            </a>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className={`border-t ${borderClass} py-8 px-6`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className={`text-sm ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.name}. Todos os direitos reservados.
          </p>
          <div className={`flex items-center gap-6 text-sm ${mutedClass}`}>
            <span>Privacidade</span>
            <span>Termos</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
