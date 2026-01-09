import { useMemo } from 'react';
import { getTemplateById, getSeasonalTemplateById, TemplateDefinition, SeasonalTemplate } from './templateData';
import { useAutoTheme } from './hooks/useAutoTheme';

// Import all layout components
import { ModernLayout } from './layouts/ModernLayout';
import { MagazineLayout } from './layouts/MagazineLayout';
import { MinimalLayout } from './layouts/MinimalLayout';
import { CreativeLayout } from './layouts/CreativeLayout';
import { CorporateLayout } from './layouts/CorporateLayout';
import { StartupLayout } from './layouts/StartupLayout';
import { PersonalLayout } from './layouts/PersonalLayout';
import { NewsLayout } from './layouts/NewsLayout';
import { EcommerceLayout } from './layouts/EcommerceLayout';
import { HealthLayout } from './layouts/HealthLayout';
import { EducationLayout } from './layouts/EducationLayout';
import { TechLayout } from './layouts/TechLayout';
import { AutomarticlesLayout } from './layouts/AutomarticlesLayout';

interface Blog {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  logo_negative_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  author_name?: string | null;
  author_photo_url?: string | null;
  author_bio?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  cta_type?: string | null;
  banner_title?: string | null;
  banner_description?: string | null;
  layout_template?: string | null;
  theme_mode?: string | null;
  dark_primary_color?: string | null;
  dark_secondary_color?: string | null;
  seasonal_template?: string | null;
  seasonal_template_expires_at?: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  reading_time?: number | null;
  created_at: string;
  published_at?: string | null;
  category?: string | null;
  tags?: string[] | null;
}

interface LayoutRendererProps {
  blog: Blog;
  articles: Article[];
  featuredArticle?: Article | null;
}

// Map template IDs to their layout components
const LAYOUT_COMPONENTS: Record<string, React.ComponentType<any>> = {
  automarticles: AutomarticlesLayout,
  modern: ModernLayout,
  magazine: MagazineLayout,
  minimal: MinimalLayout,
  creative: CreativeLayout,
  corporate: CorporateLayout,
  startup: StartupLayout,
  personal: PersonalLayout,
  news: NewsLayout,
  ecommerce: EcommerceLayout,
  health: HealthLayout,
  education: EducationLayout,
  tech: TechLayout,
};

export const LayoutRenderer = ({ blog, articles, featuredArticle }: LayoutRendererProps) => {
  // Determine active template (seasonal takes priority)
  const activeTemplateId = useMemo(() => {
    if (blog.seasonal_template && blog.seasonal_template_expires_at) {
      const expiresAt = new Date(blog.seasonal_template_expires_at);
      if (expiresAt > new Date()) {
        return blog.seasonal_template;
      }
    }
    return blog.layout_template || 'modern';
  }, [blog.seasonal_template, blog.seasonal_template_expires_at, blog.layout_template]);
  
  // Get template definition
  const template = useMemo(() => {
    return getTemplateById(activeTemplateId) || getTemplateById('modern')!;
  }, [activeTemplateId]);
  
  // Get seasonal template if active
  const seasonalTemplate = useMemo(() => {
    if (blog.seasonal_template && blog.seasonal_template_expires_at) {
      const expiresAt = new Date(blog.seasonal_template_expires_at);
      if (expiresAt > new Date()) {
        return getSeasonalTemplateById(blog.seasonal_template);
      }
    }
    return null;
  }, [blog.seasonal_template, blog.seasonal_template_expires_at]);
  
  // Auto theme handling
  const { activeTheme, primaryColor, secondaryColor, isDark } = useAutoTheme(
    {
      themeMode: (blog.theme_mode as 'light' | 'dark' | 'auto') || 'auto',
      darkPrimaryColor: blog.dark_primary_color,
      darkSecondaryColor: blog.dark_secondary_color,
    },
    seasonalTemplate?.colorScheme.primary || blog.primary_color || '#6366f1',
    seasonalTemplate?.colorScheme.secondary || blog.secondary_color || '#8b5cf6'
  );
  
  // Get the layout component
  const LayoutComponent = LAYOUT_COMPONENTS[activeTemplateId] || LAYOUT_COMPONENTS.modern;
  
  // Prepare props for layout
  const layoutProps = {
    blog: {
      ...blog,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    },
    articles,
    featuredArticle: featuredArticle || articles[0] || null,
    template,
    seasonalTemplate,
    isDark,
  };
  
  return (
    <div className={isDark ? 'dark' : ''}>
      <div 
        className="min-h-screen transition-colors duration-300"
        style={{
          '--template-primary': primaryColor,
          '--template-secondary': secondaryColor,
        } as React.CSSProperties}
      >
        <LayoutComponent {...layoutProps} />
      </div>
    </div>
  );
};
