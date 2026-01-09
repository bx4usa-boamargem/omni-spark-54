import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Sparkles } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const CreativeLayout = ({ blog, articles, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  
  // Generate random heights for masonry effect
  const getRandomHeight = (index: number) => {
    const heights = ['h-64', 'h-72', 'h-80', 'h-56', 'h-68'];
    return heights[index % heights.length];
  };
  
  return (
    <div className={`min-h-screen ${bgClass}`}>
      {/* Header */}
      <header className="py-6 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to={`/blog/${blog.slug}`} className="flex items-center gap-3">
            {blog.logo_url ? (
              <img src={isDark && blog.logo_negative_url ? blog.logo_negative_url : blog.logo_url} alt={blog.name} className="h-8 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6" style={{ color: blog.primary_color }} />
                <span className={`font-bold text-xl ${textClass}`}>{blog.name}</span>
              </div>
            )}
          </Link>
        </div>
      </header>
      
      {/* Hero - Asymmetric */}
      <section className="py-16 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-8">
            <div className="flex-1">
              <h1 className={`text-5xl md:text-7xl font-black leading-tight ${textClass}`}>
                {blog.banner_title || blog.name}
              </h1>
              <p className={`mt-6 text-xl ${mutedClass} max-w-lg`}>
                {blog.banner_description || blog.description}
              </p>
            </div>
            <div className="hidden lg:block">
              <div 
                className="w-48 h-48 rounded-3xl transform rotate-12 opacity-80"
                style={{ backgroundColor: blog.primary_color }}
              />
              <div 
                className="w-32 h-32 rounded-2xl transform -rotate-6 -mt-16 ml-8 opacity-60"
                style={{ backgroundColor: blog.secondary_color }}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Masonry Grid */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {articles.map((article, index) => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${cardBg} rounded-2xl overflow-hidden block break-inside-avoid hover:scale-[1.02] transition-transform group`}
                style={{ 
                  borderLeft: `4px solid ${blog.primary_color}`,
                }}
              >
                {article.featured_image_url && (
                  <div className={`${getRandomHeight(index)} overflow-hidden`}>
                    <img 
                      src={article.featured_image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-6">
                  {article.category && (
                    <span 
                      className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded"
                      style={{ 
                        backgroundColor: `${blog.primary_color}20`,
                        color: blog.primary_color 
                      }}
                    >
                      {article.category}
                    </span>
                  )}
                  <h3 className={`text-xl font-bold mt-3 ${textClass} group-hover:underline`}>
                    {article.title}
                  </h3>
                  <p className={`mt-2 ${mutedClass} line-clamp-3`}>
                    {article.excerpt}
                  </p>
                  <div className={`flex items-center gap-4 mt-4 text-sm ${mutedClass}`}>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {article.reading_time || 5} min
                    </span>
                    <span>
                      {format(new Date(article.published_at || article.created_at), "d MMM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div 
            className="inline-block w-12 h-1 rounded-full mb-4"
            style={{ backgroundColor: blog.primary_color }}
          />
          <p className={`text-sm ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.name}
          </p>
        </div>
      </footer>
    </div>
  );
};
