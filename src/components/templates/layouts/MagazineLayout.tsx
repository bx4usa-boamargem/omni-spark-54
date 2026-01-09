import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const MagazineLayout = ({ blog, articles, featuredArticle, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderClass = isDark ? 'border-gray-700' : 'border-gray-200';
  
  const featured = featuredArticle || articles[0];
  const otherArticles = articles.filter(a => a.id !== featured?.id);
  
  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Header */}
      <header className={`border-b ${borderClass} py-4 px-6 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to={`/blog/${blog.slug}`} className="flex items-center gap-3">
            {blog.logo_url ? (
              <img src={isDark && blog.logo_negative_url ? blog.logo_negative_url : blog.logo_url} alt={blog.name} className="h-10 w-auto" />
            ) : (
              <span className="font-bold text-2xl" style={{ color: blog.primary_color }}>{blog.name}</span>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link to={`/blog/${blog.slug}`} className={`text-sm font-medium ${mutedClass} hover:${textClass}`}>Home</Link>
            <span className={`text-sm font-medium ${mutedClass}`}>Artigos</span>
            <span className={`text-sm font-medium ${mutedClass}`}>Categorias</span>
          </nav>
        </div>
      </header>
      
      {/* Featured Section */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Main Featured */}
            {featured && (
              <Link 
                to={`/blog/${blog.slug}/${featured.slug}`}
                className="lg:col-span-3 group"
              >
                <div className={`${cardBg} rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow`}>
                  {featured.featured_image_url && (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img 
                        src={featured.featured_image_url} 
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <span 
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: blog.primary_color }}
                    >
                      {featured.category || 'Destaque'}
                    </span>
                    <h2 className={`text-2xl md:text-3xl font-bold mt-2 ${textClass} group-hover:underline`}>
                      {featured.title}
                    </h2>
                    <p className={`mt-3 ${mutedClass} line-clamp-2`}>{featured.excerpt}</p>
                    <div className={`flex items-center gap-4 mt-4 text-sm ${mutedClass}`}>
                      <span>{format(new Date(featured.published_at || featured.created_at), "d 'de' MMMM, yyyy", { locale: ptBR })}</span>
                      <span>•</span>
                      <span>{featured.reading_time || 5} min de leitura</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}
            
            {/* Side Featured */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {otherArticles.slice(0, 2).map(article => (
                <Link 
                  key={article.id}
                  to={`/blog/${blog.slug}/${article.slug}`}
                  className={`${cardBg} rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group flex-1`}
                >
                  <div className="flex h-full">
                    {article.featured_image_url && (
                      <div className="w-1/3 overflow-hidden">
                        <img 
                          src={article.featured_image_url} 
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <span className="text-xs font-medium" style={{ color: blog.primary_color }}>
                        {article.category || 'Artigo'}
                      </span>
                      <h3 className={`font-semibold mt-1 ${textClass} line-clamp-2 group-hover:underline`}>
                        {article.title}
                      </h3>
                      <span className={`text-xs ${mutedClass} mt-2`}>
                        {article.reading_time || 5} min
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* More Articles */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className={`text-xl font-bold mb-6 ${textClass} border-b-2 pb-2 inline-block`} style={{ borderColor: blog.primary_color }}>
            Mais Artigos
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {otherArticles.slice(2).map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${cardBg} rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow group`}
              >
                {article.featured_image_url && (
                  <div className="aspect-[4/3] overflow-hidden">
                    <img 
                      src={article.featured_image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className={`font-semibold ${textClass} line-clamp-2 group-hover:underline`}>
                    {article.title}
                  </h3>
                  <div className={`flex items-center gap-2 mt-2 text-xs ${mutedClass}`}>
                    <Clock className="h-3 w-3" />
                    <span>{article.reading_time || 5} min</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className={`border-t ${borderClass} py-8 px-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className={`text-sm ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.name}
          </p>
        </div>
      </footer>
    </div>
  );
};
