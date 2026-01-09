import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Linkedin } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const PersonalLayout = ({ blog, articles, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-950' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const borderClass = isDark ? 'border-gray-800' : 'border-gray-200';
  
  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Hero with Author */}
      <section 
        className="py-20 px-6 text-center"
        style={{
          background: `linear-gradient(180deg, ${blog.primary_color}15, transparent)`
        }}
      >
        <div className="max-w-2xl mx-auto">
          {blog.author_photo_url && (
            <img 
              src={blog.author_photo_url} 
              alt={blog.author_name || blog.name}
              className="w-28 h-28 rounded-full mx-auto mb-6 object-cover border-4 border-white shadow-xl"
            />
          )}
          <h1 className={`text-3xl md:text-4xl font-bold ${textClass}`}>
            {blog.author_name || blog.name}
          </h1>
          <p className={`mt-4 text-lg ${mutedClass}`}>
            {blog.author_bio || blog.description}
          </p>
          {blog.author_linkedin && (
            <a 
              href={blog.author_linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium"
              style={{ color: blog.primary_color }}
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          )}
        </div>
      </section>
      
      {/* Navigation */}
      <nav className={`border-y ${borderClass} py-4 px-6 sticky top-0 ${bgClass} z-50`}>
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-8">
          <Link to={`/blog/${blog.slug}`} className={`text-sm font-medium ${textClass}`}>
            Artigos
          </Link>
          <span className={`text-sm ${mutedClass}`}>Sobre</span>
          {blog.cta_url && (
            <a 
              href={blog.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium"
              style={{ color: blog.primary_color }}
            >
              {blog.cta_text || 'Contato'}
            </a>
          )}
        </div>
      </nav>
      
      {/* Articles */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className={`text-xl font-bold mb-8 ${textClass}`}>Meus Artigos</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {articles.map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${cardBg} rounded-xl overflow-hidden group hover:shadow-lg transition-shadow`}
              >
                {article.featured_image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={article.featured_image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h3 className={`font-semibold ${textClass} group-hover:underline line-clamp-2`}>
                    {article.title}
                  </h3>
                  <p className={`mt-2 text-sm ${mutedClass} line-clamp-2`}>
                    {article.excerpt}
                  </p>
                  <div className={`flex items-center justify-between mt-4 text-xs ${mutedClass}`}>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.reading_time || 5} min
                    </span>
                    <span>
                      {format(new Date(article.published_at || article.created_at), "d 'de' MMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Newsletter/CTA */}
      {blog.cta_url && (
        <section className={`py-12 px-6 ${cardBg}`}>
          <div className="max-w-2xl mx-auto text-center">
            <h3 className={`text-xl font-bold ${textClass}`}>
              Quer receber mais conteúdo?
            </h3>
            <p className={`mt-2 ${mutedClass}`}>
              Acompanhe minhas redes sociais ou entre em contato.
            </p>
            <a 
              href={blog.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 px-6 py-3 rounded-full text-white font-medium"
              style={{ backgroundColor: blog.primary_color }}
            >
              {blog.cta_text || 'Entre em Contato'}
            </a>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className={`py-8 px-6 border-t ${borderClass}`}>
        <div className="max-w-4xl mx-auto text-center">
          <p className={`text-sm ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.author_name || blog.name}
          </p>
        </div>
      </footer>
    </div>
  );
};
