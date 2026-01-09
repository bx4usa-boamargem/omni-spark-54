import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShoppingCart, Tag, ArrowRight } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const EcommerceLayout = ({ blog, articles, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-950' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const borderClass = isDark ? 'border-gray-800' : 'border-gray-200';
  
  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Promo Bar */}
      <div 
        className="py-2 px-6 text-center text-white text-sm"
        style={{ backgroundColor: blog.primary_color }}
      >
        <span className="flex items-center justify-center gap-2">
          <Tag className="h-4 w-4" />
          Confira nossas ofertas exclusivas no blog!
        </span>
      </div>
      
      {/* Header */}
      <header className={`border-b ${borderClass} py-4 px-6`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={`/blog/${blog.slug}`} className="flex items-center gap-3">
            {blog.logo_url ? (
              <img src={isDark && blog.logo_negative_url ? blog.logo_negative_url : blog.logo_url} alt={blog.name} className="h-10 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" style={{ color: blog.primary_color }} />
                <span className="font-bold text-xl">{blog.name}</span>
              </div>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to={`/blog/${blog.slug}`} className={`text-sm ${mutedClass}`}>Blog</Link>
            <span className={`text-sm ${mutedClass}`}>Produtos</span>
            <span className={`text-sm ${mutedClass}`}>Promoções</span>
            {blog.cta_url && (
              <a 
                href={blog.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-4 py-2 rounded text-white"
                style={{ backgroundColor: blog.primary_color }}
              >
                Loja
              </a>
            )}
          </nav>
        </div>
      </header>
      
      {/* Hero */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span 
                className="inline-block text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full"
                style={{ 
                  backgroundColor: `${blog.primary_color}20`,
                  color: blog.primary_color 
                }}
              >
                Blog
              </span>
              <h1 className={`text-4xl font-bold mt-4 ${textClass}`}>
                {blog.banner_title || 'Dicas e novidades do mundo das compras'}
              </h1>
              <p className={`mt-4 text-lg ${mutedClass}`}>
                {blog.banner_description || blog.description}
              </p>
            </div>
            <div 
              className="aspect-video rounded-2xl hidden lg:block"
              style={{
                background: `linear-gradient(135deg, ${blog.primary_color}20, ${blog.secondary_color || blog.primary_color}10)`
              }}
            />
          </div>
        </div>
      </section>
      
      {/* Articles */}
      <section className={`py-12 px-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-2xl font-bold mb-8 ${textClass}`}>Artigos em Destaque</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${cardBg} rounded-xl overflow-hidden border ${borderClass} hover:shadow-xl transition-shadow group`}
              >
                {article.featured_image_url && (
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img 
                      src={article.featured_image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {article.category && (
                      <span 
                        className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded text-white"
                        style={{ backgroundColor: blog.primary_color }}
                      >
                        {article.category}
                      </span>
                    )}
                  </div>
                )}
                <div className="p-5">
                  <h3 className={`font-semibold ${textClass} group-hover:underline line-clamp-2`}>
                    {article.title}
                  </h3>
                  <p className={`mt-2 text-sm ${mutedClass} line-clamp-2`}>
                    {article.excerpt}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className={`text-xs ${mutedClass}`}>
                      {format(new Date(article.published_at || article.created_at), "d 'de' MMM", { locale: ptBR })}
                    </span>
                    <span 
                      className="text-sm font-medium flex items-center gap-1"
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
      
      {/* CTA */}
      {blog.cta_url && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className={`text-2xl font-bold ${textClass}`}>
              Pronto para economizar?
            </h3>
            <p className={`mt-2 ${mutedClass}`}>
              Acesse nossa loja e confira as melhores ofertas.
            </p>
            <a 
              href={blog.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 px-8 py-4 rounded-lg text-white font-medium"
              style={{ backgroundColor: blog.primary_color }}
            >
              <ShoppingCart className="h-5 w-5" />
              {blog.cta_text || 'Ir para a Loja'}
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
