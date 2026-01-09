import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Code, Terminal, Zap } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const TechLayout = ({ blog, articles, isDark: propIsDark }: LayoutProps) => {
  // Tech template defaults to dark mode
  const isDark = true; // Always dark for tech
  
  const bgClass = 'bg-gray-950';
  const textClass = 'text-white';
  const mutedClass = 'text-gray-400';
  const cardBg = 'bg-gray-900';
  const borderClass = 'border-gray-800';
  
  const accentColor = blog.primary_color || '#22c55e'; // Green for tech
  
  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Header */}
      <header className={`border-b ${borderClass} py-4 px-6`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={`/blog/${blog.slug}`} className="flex items-center gap-3">
            {blog.logo_url ? (
              <img src={blog.logo_negative_url || blog.logo_url} alt={blog.name} className="h-8 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <Terminal className="h-6 w-6" style={{ color: accentColor }} />
                <span className="font-mono font-bold text-lg">{blog.name}</span>
              </div>
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to={`/blog/${blog.slug}`} className={`text-sm ${mutedClass} hover:text-white font-mono`}>~/blog</Link>
            <span className={`text-sm ${mutedClass} font-mono`}>~/about</span>
            {blog.cta_url && (
              <a 
                href={blog.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-4 py-2 rounded font-mono text-black"
                style={{ backgroundColor: accentColor }}
              >
                $ start
              </a>
            )}
          </nav>
        </div>
      </header>
      
      {/* Hero */}
      <section className="py-20 px-6 relative overflow-hidden">
        {/* Code background effect */}
        <div className="absolute inset-0 opacity-5 font-mono text-xs overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="whitespace-nowrap">
              {'const blog = { name: "' + blog.name + '", type: "tech" }; // ' + Math.random().toString(36).substring(7)}
            </div>
          ))}
        </div>
        
        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">👨‍💻</span>
            <span 
              className="font-mono text-sm px-2 py-1 rounded"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              {'{developer_blog}'}
            </span>
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold ${textClass}`}>
            {blog.banner_title || blog.name}
          </h1>
          <p className={`mt-4 text-lg ${mutedClass} max-w-2xl`}>
            {blog.banner_description || blog.description}
          </p>
          
          {/* Terminal-style info */}
          <div className={`mt-8 ${cardBg} rounded-lg border ${borderClass} p-4 font-mono text-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className={mutedClass}>~ terminal</span>
            </div>
            <div className={mutedClass}>
              <span style={{ color: accentColor }}>$</span> blog --stats<br/>
              <span className="text-white">→ {articles.length} artigos publicados</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* Articles */}
      <section className={`py-12 px-6 ${cardBg}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <Code className="h-5 w-5" style={{ color: accentColor }} />
            <h2 className={`text-xl font-bold font-mono ${textClass}`}>latest_posts[]</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {articles.map(article => (
              <Link 
                key={article.id}
                to={`/blog/${blog.slug}/${article.slug}`}
                className={`${bgClass} rounded-lg border ${borderClass} overflow-hidden hover:border-gray-600 transition-colors group`}
              >
                {article.featured_image_url && (
                  <div className="aspect-[2/1] overflow-hidden">
                    <img 
                      src={article.featured_image_url} 
                      alt={article.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    {article.category && (
                      <span 
                        className="font-mono text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        #{article.category.toLowerCase().replace(/\s/g, '-')}
                      </span>
                    )}
                    {article.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className={`font-mono text-xs ${mutedClass}`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <h3 className={`font-semibold ${textClass} group-hover:underline line-clamp-2`}>
                    {article.title}
                  </h3>
                  <p className={`mt-2 text-sm ${mutedClass} line-clamp-2`}>
                    {article.excerpt}
                  </p>
                  <div className={`flex items-center gap-4 mt-4 text-xs font-mono ${mutedClass}`}>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.reading_time || 5}min
                    </span>
                    <span>
                      {format(new Date(article.published_at || article.created_at), "yyyy-MM-dd")}
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
          <div className="max-w-3xl mx-auto text-center">
            <Zap className="h-10 w-10 mx-auto mb-4" style={{ color: accentColor }} />
            <h3 className={`text-2xl font-bold ${textClass}`}>
              Quer acelerar seu desenvolvimento?
            </h3>
            <a 
              href={blog.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded font-mono font-medium text-black"
              style={{ backgroundColor: accentColor }}
            >
              <Terminal className="h-4 w-4" />
              {blog.cta_text || '$ npm start'}
            </a>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className={`border-t ${borderClass} py-8 px-6`}>
        <div className="max-w-6xl mx-auto text-center">
          <p className={`text-sm font-mono ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.name} {'// '}
            <span style={{ color: accentColor }}>built with</span> ❤️
          </p>
        </div>
      </footer>
    </div>
  );
};
