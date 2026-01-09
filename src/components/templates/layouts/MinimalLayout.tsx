import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';
import { TemplateDefinition, SeasonalTemplate } from '../templateData';

interface LayoutProps {
  blog: any;
  articles: any[];
  featuredArticle?: any;
  template: TemplateDefinition;
  seasonalTemplate?: SeasonalTemplate | null;
  isDark: boolean;
}

export const MinimalLayout = ({ blog, articles, isDark }: LayoutProps) => {
  const bgClass = isDark ? 'bg-gray-950' : 'bg-white';
  const textClass = isDark ? 'text-gray-100' : 'text-gray-900';
  const mutedClass = isDark ? 'text-gray-500' : 'text-gray-500';
  const borderClass = isDark ? 'border-gray-800' : 'border-gray-100';
  
  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      {/* Header */}
      <header className="py-12 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <Link to={`/blog/${blog.slug}`}>
            <h1 className="text-3xl font-serif font-bold">{blog.name}</h1>
          </Link>
          <p className={`mt-2 ${mutedClass}`}>{blog.description}</p>
        </div>
      </header>
      
      {/* Divider */}
      <div className="max-w-2xl mx-auto px-6">
        <div className={`border-t ${borderClass}`} />
      </div>
      
      {/* Articles List */}
      <section className="py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-12">
            {articles.map(article => (
              <article key={article.id} className={`pb-12 border-b ${borderClass} last:border-b-0`}>
                <Link 
                  to={`/blog/${blog.slug}/${article.slug}`}
                  className="group block"
                >
                  <time className={`text-sm ${mutedClass}`}>
                    {format(new Date(article.published_at || article.created_at), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </time>
                  <h2 className={`text-2xl font-serif font-bold mt-2 ${textClass} group-hover:underline`}>
                    {article.title}
                  </h2>
                  <p className={`mt-3 ${mutedClass} leading-relaxed`}>
                    {article.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium" style={{ color: blog.primary_color }}>
                    <span>Ler artigo</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </article>
            ))}
          </div>
          
          {articles.length === 0 && (
            <div className={`text-center py-12 ${mutedClass}`}>
              <p>Nenhum artigo publicado ainda.</p>
            </div>
          )}
        </div>
      </section>
      
      {/* Author Section */}
      {blog.author_name && (
        <section className={`py-12 px-6 border-t ${borderClass}`}>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
              {blog.author_photo_url && (
                <img 
                  src={blog.author_photo_url} 
                  alt={blog.author_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              )}
              <div>
                <h3 className={`font-medium ${textClass}`}>{blog.author_name}</h3>
                <p className={`text-sm ${mutedClass}`}>{blog.author_bio}</p>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className={`py-8 px-6 border-t ${borderClass}`}>
        <div className="max-w-2xl mx-auto text-center">
          <p className={`text-sm ${mutedClass}`}>
            © {new Date().getFullYear()} {blog.name}
          </p>
        </div>
      </footer>
    </div>
  );
};
