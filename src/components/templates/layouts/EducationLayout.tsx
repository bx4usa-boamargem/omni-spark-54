import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, GraduationCap, BookOpen } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const EducationLayout = ({ blog, articles, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-950' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const borderClass = isDark ? 'border-gray-800' : 'border-gray-200';
  
  // Education-focused color
  const accentColor = blog.primary_color || '#3b82f6';
  
  // Group articles by category
  const categories = [...new Set(articles.map(a => a.category || 'Geral'))];
  
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
                <GraduationCap className="h-7 w-7" style={{ color: accentColor }} />
                <span className="font-bold text-xl">{blog.name}</span>
              </div>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to={`/blog/${blog.slug}`} className={`text-sm font-medium ${textClass}`}>Início</Link>
            <span className={`text-sm ${mutedClass}`}>Cursos</span>
            <span className={`text-sm ${mutedClass}`}>Recursos</span>
            {blog.cta_url && (
              <a 
                href={blog.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: accentColor }}
              >
                Matricule-se
              </a>
            )}
          </nav>
        </div>
      </header>
      
      {/* Hero */}
      <section 
        className="py-20 px-6"
        style={{
          background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)`
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <span 
            className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full"
            style={{ 
              backgroundColor: `${accentColor}20`,
              color: accentColor 
            }}
          >
            <BookOpen className="h-4 w-4" />
            Blog Educacional
          </span>
          <h1 className={`text-4xl font-bold mt-6 ${textClass}`}>
            {blog.banner_title || 'Aprenda algo novo hoje'}
          </h1>
          <p className={`mt-4 text-lg ${mutedClass}`}>
            {blog.banner_description || blog.description}
          </p>
        </div>
      </section>
      
      {/* Categories */}
      <section className="py-6 px-6 border-b" style={{ borderColor: borderClass }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            <span className={`text-sm font-medium ${textClass} shrink-0`}>Categorias:</span>
            {categories.map(cat => (
              <button
                key={cat}
                className={`text-sm px-4 py-2 rounded-full shrink-0 border ${borderClass} hover:border-primary transition-colors`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>
      
      {/* Articles */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${cardBg} rounded-xl overflow-hidden border ${borderClass} hover:shadow-lg transition-all group`}
              >
                {article.featured_image_url && (
                  <div className="aspect-video overflow-hidden relative">
                    <img 
                      src={article.featured_image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Reading time badge */}
                    <div 
                      className="absolute bottom-3 right-3 text-xs font-medium px-2 py-1 rounded text-white flex items-center gap-1"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Clock className="h-3 w-3" />
                      {article.reading_time || 5} min
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    {article.category && (
                      <span className={`text-xs font-medium ${mutedClass}`}>
                        📚 {article.category}
                      </span>
                    )}
                  </div>
                  <h3 className={`font-semibold ${textClass} group-hover:underline line-clamp-2`}>
                    {article.title}
                  </h3>
                  <p className={`mt-2 text-sm ${mutedClass} line-clamp-2`}>
                    {article.excerpt}
                  </p>
                  <div className={`mt-4 text-xs ${mutedClass}`}>
                    {format(new Date(article.published_at || article.created_at), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA */}
      {blog.cta_url && (
        <section 
          className="py-16 px-6"
          style={{ backgroundColor: accentColor }}
        >
          <div className="max-w-3xl mx-auto text-center text-white">
            <GraduationCap className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-2xl font-bold">
              Pronto para aprender mais?
            </h3>
            <p className="mt-2 opacity-90">
              Acesse nossos cursos e recursos exclusivos.
            </p>
            <a 
              href={blog.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 px-8 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              {blog.cta_text || 'Começar Agora'}
            </a>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className={`border-t ${borderClass} py-8 px-6`}>
        <div className="max-w-6xl mx-auto text-center">
          <p className={`text-sm ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.name}
          </p>
        </div>
      </footer>
    </div>
  );
};
