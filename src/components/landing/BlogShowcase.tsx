import { useTranslation } from 'react-i18next';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { ExternalLink, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const blogs = [
  { 
    name: 'Tech Insights', 
    category: 'Marketing Digital', 
    views: 12000,
    color: '#6366f1',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop'
  },
  { 
    name: 'Fit & Healthy', 
    category: 'Saúde e Fitness', 
    views: 8000,
    color: '#22c55e',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=250&fit=crop'
  },
  { 
    name: 'Invest Pro', 
    category: 'Finanças Pessoais', 
    views: 5000,
    color: '#f59e0b',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop'
  },
  { 
    name: 'Cozinha Criativa', 
    category: 'Gastronomia', 
    views: 15000,
    color: '#ef4444',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=250&fit=crop'
  },
  { 
    name: 'Pet Love', 
    category: 'Pets e Animais', 
    views: 6000,
    color: '#ec4899',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=250&fit=crop'
  },
  { 
    name: 'Viagem Total', 
    category: 'Turismo', 
    views: 9000,
    color: '#0ea5e9',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=250&fit=crop'
  }
];

export const BlogShowcase = () => {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation<HTMLElement>(0.1);

  return (
    <section ref={ref} className="py-20">
      <div className="container max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            {t('landing.showcase.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('landing.showcase.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((blog, index) => (
            <div
              key={blog.name}
              className={`group bg-card rounded-2xl border overflow-hidden hover:shadow-xl transition-all duration-500 cursor-pointer ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={blog.image}
                  alt={blog.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <Badge 
                    variant="secondary" 
                    className="bg-white/20 text-white backdrop-blur-sm border-0"
                  >
                    {blog.category}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-white text-sm">
                    <Eye className="h-4 w-4" />
                    {(blog.views / 1000).toFixed(0)}k {t('landing.showcase.viewsMonth')}
                  </div>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: blog.color }}
                    >
                      {blog.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-foreground">{blog.name}</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
