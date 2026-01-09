import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, TrendingUp } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const NewsLayout = ({ blog, articles, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-950' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const borderClass = isDark ? 'border-gray-800' : 'border-gray-200';
  const tickerBg = isDark ? 'bg-gray-900' : 'bg-gray-100';
  
  const featured = articles[0];
  const trending = articles.slice(1, 4);
  const latest = articles.slice(4);
  
  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Header */}
      <header className={`border-b ${borderClass} py-4 px-6`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to={`/blog/${blog.slug}`} className="flex items-center gap-3">
            {blog.logo_url ? (
              <img src={isDark && blog.logo_negative_url ? blog.logo_negative_url : blog.logo_url} alt={blog.name} className="h-8 w-auto" />
            ) : (
              <span className="font-black text-2xl">{blog.name}</span>
            )}
          </Link>
          <div className={`text-sm ${mutedClass}`}>
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>
      </header>
      
      {/* Ticker */}
      <div className={`${tickerBg} py-2 px-6 overflow-hidden`}>
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <span 
            className="text-xs font-bold px-2 py-1 text-white shrink-0"
            style={{ backgroundColor: blog.primary_color }}
          >
            ÚLTIMAS
          </span>
          <div className="flex gap-8 animate-marquee">
            {articles.slice(0, 5).map((article, i) => (
              <span key={i} className={`whitespace-nowrap text-sm ${mutedClass}`}>
                {article.title}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <section className="py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Featured */}
            {featured && (
              <div className="lg:col-span-2">
                <Link 
                  to={`/blog/${blog.slug}/${featured.slug}`}
                  className="block group"
                >
                  {featured.featured_image_url && (
                    <div className="aspect-[4/3] overflow-hidden mb-4">
                      <img 
                        src={featured.featured_image_url} 
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <span 
                    className="text-xs font-bold uppercase"
                    style={{ color: blog.primary_color }}
                  >
                    {featured.category || 'Destaque'}
                  </span>
                  <h2 className={`text-2xl font-bold mt-2 ${textClass} group-hover:underline`}>
                    {featured.title}
                  </h2>
                  <p className={`mt-2 ${mutedClass} line-clamp-2`}>
                    {featured.excerpt}
                  </p>
                </Link>
              </div>
            )}
            
            {/* Trending */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5" style={{ color: blog.primary_color }} />
                <h3 className={`font-bold ${textClass}`}>Em Alta</h3>
              </div>
              <div className="space-y-4">
                {trending.map((article, index) => (
                  <Link 
                    key={article.id}
                    to={`/blog/${blog.slug}/${article.slug}`}
                    className={`flex gap-4 pb-4 border-b ${borderClass} group`}
                  >
                    <span 
                      className="text-3xl font-black opacity-20"
                      style={{ color: blog.primary_color }}
                    >
                      0{index + 1}
                    </span>
                    <div>
                      <h4 className={`font-semibold ${textClass} group-hover:underline line-clamp-2`}>
                        {article.title}
                      </h4>
                      <div className={`text-xs ${mutedClass} mt-1 flex items-center gap-2`}>
                        <Clock className="h-3 w-3" />
                        {article.reading_time || 5} min
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Latest News Grid */}
      <section className={`py-8 px-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto">
          <h3 className={`font-bold mb-6 ${textClass}`}>Mais Notícias</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(latest.length > 0 ? latest : articles).map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${cardBg} border ${borderClass} group`}
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
                <div className="p-3">
                  <h4 className={`text-sm font-semibold ${textClass} line-clamp-2 group-hover:underline`}>
                    {article.title}
                  </h4>
                  <span className={`text-xs ${mutedClass} mt-1 block`}>
                    {format(new Date(article.published_at || article.created_at), "dd/MM/yyyy")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className={`border-t ${borderClass} py-6 px-6`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className={`text-sm ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.name}
          </p>
          <div className={`flex items-center gap-4 text-sm ${mutedClass}`}>
            <span>Política</span>
            <span>Termos</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
