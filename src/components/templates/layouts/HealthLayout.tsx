import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Heart, Leaf } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const HealthLayout = ({ blog, articles, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-950' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const borderClass = isDark ? 'border-gray-800' : 'border-gray-200';
  
  // Health-focused colors
  const accentColor = blog.primary_color || '#10b981'; // Green for health
  
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
                <Heart className="h-6 w-6" style={{ color: accentColor }} />
                <span className="font-semibold text-xl">{blog.name}</span>
              </div>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to={`/blog/${blog.slug}`} className={`text-sm ${mutedClass}`}>Home</Link>
            <span className={`text-sm ${mutedClass}`}>Artigos</span>
            <span className={`text-sm ${mutedClass}`}>Sobre</span>
          </nav>
        </div>
      </header>
      
      {/* Hero */}
      <section 
        className="py-20 px-6"
        style={{
          background: `linear-gradient(135deg, ${accentColor}10, ${accentColor}05)`
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Leaf className="h-12 w-12" style={{ color: accentColor }} />
          </div>
          <h1 className={`text-4xl font-bold ${textClass}`}>
            {blog.banner_title || blog.name}
          </h1>
          <p className={`mt-4 text-lg ${mutedClass}`}>
            {blog.banner_description || 'Cuidando da sua saúde com informações de qualidade'}
          </p>
        </div>
      </section>
      
      {/* Info Cards */}
      <section className="py-8 px-6 -mt-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: '🏥', label: 'Conteúdo verificado' },
              { icon: '👨‍⚕️', label: 'Profissionais de saúde' },
              { icon: '📚', label: 'Baseado em evidências' },
            ].map((item, i) => (
              <div key={i} className={`${cardBg} rounded-xl p-4 text-center border ${borderClass}`}>
                <span className="text-2xl">{item.icon}</span>
                <p className={`text-sm mt-2 ${mutedClass}`}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Articles */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-2xl font-bold mb-8 ${textClass}`}>Artigos sobre Saúde</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${cardBg} rounded-2xl overflow-hidden border ${borderClass} hover:shadow-lg transition-shadow group`}
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
                  {article.category && (
                    <span 
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{ 
                        backgroundColor: `${accentColor}20`,
                        color: accentColor 
                      }}
                    >
                      {article.category}
                    </span>
                  )}
                  <h3 className={`font-semibold mt-3 ${textClass} group-hover:underline line-clamp-2`}>
                    {article.title}
                  </h3>
                  <p className={`mt-2 text-sm ${mutedClass} line-clamp-2`}>
                    {article.excerpt}
                  </p>
                  <div className={`flex items-center gap-4 mt-4 text-xs ${mutedClass}`}>
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
      
      {/* Disclaimer */}
      <section className={`py-8 px-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-3xl mx-auto text-center">
          <p className={`text-sm ${mutedClass}`}>
            ⚠️ <strong>Aviso:</strong> O conteúdo deste blog é apenas informativo e não substitui 
            a consulta com um profissional de saúde. Sempre procure orientação médica qualificada.
          </p>
        </div>
      </section>
      
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
