import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/public/SEOHead";
import { BlogHeader } from "@/components/public/BlogHeader";
import { BlogFooter } from "@/components/public/BlogFooter";
import { DynamicTrackingScripts } from "@/components/public/DynamicTrackingScripts";
import { ArticleCard } from "@/components/public/ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getBlogUrl } from "@/utils/blogUrl";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Blog {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  logo_negative_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  author_name: string | null;
  author_photo_url: string | null;
  author_bio: string | null;
  custom_domain: string | null;
  domain_verified: boolean | null;
  cta_type: string | null;
  cta_text: string | null;
  cta_url: string | null;
  banner_title: string | null;
  banner_description: string | null;
  banner_enabled: boolean | null;
  brand_description: string | null;
  show_powered_by: boolean | null;
  footer_text: string | null;
  tracking_config: Record<string, unknown> | null;
  script_head: string | null;
  script_body: string | null;
}


interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  category: string | null;
  published_at: string | null;
  featured_image_url: string | null;
}

const PublicBlog = () => {
  const { t } = useTranslation();
  const { blogSlug } = useParams<{ blogSlug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogAndArticles = async () => {
      if (!blogSlug) return;

      try {
        // Fetch blog
        const { data: blogData, error: blogError } = await supabase
          .from("blogs")
          .select("*")
          .eq("slug", blogSlug)
          .eq("onboarding_completed", true)
          .single();

        if (blogError || !blogData) {
          setError(t('blog.notFound'));
          setLoading(false);
          return;
        }

        setBlog(blogData as unknown as Blog);

        // Fetch categories
        const { data: categoriesData } = await supabase
          .from("blog_categories")
          .select("id, name, slug")
          .eq("blog_id", blogData.id)
          .order("sort_order", { ascending: true });

        if (categoriesData) {
          setCategories(categoriesData);
        }

        // Fetch published articles
        const { data: articlesData, error: articlesError } = await supabase
          .from("articles")
          .select("id, title, excerpt, slug, category, published_at, featured_image_url")
          .eq("blog_id", blogData.id)
          .eq("status", "published")
          .order("published_at", { ascending: false });

        if (articlesError) {
          console.error("Error fetching articles:", articlesError);
        } else {
          setArticles(articlesData || []);
        }
      } catch (err) {
        console.error("Error:", err);
        setError(t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchBlogAndArticles();
  }, [blogSlug, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border/40 p-4">
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-12" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-4">
            {t('blog.notFound')}
          </h1>
          <p className="text-muted-foreground">
            {t('blog.notFoundDescription')}
          </p>
        </div>
      </div>
    );
  }

  const canonicalUrl = getBlogUrl(blog);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DynamicTrackingScripts
        trackingConfig={blog.tracking_config as Record<string, string> | null}
        scriptHead={blog.script_head}
        scriptBody={blog.script_body}
      />

      <SEOHead
        title={`${blog.name} | Blog`}
        description={blog.description || `Leia os artigos do blog ${blog.name}`}
        ogImage={blog.logo_url || undefined}
        canonicalUrl={canonicalUrl}
      />

      <BlogHeader
        blogId={blog.id}
        blogName={blog.name}
        blogSlug={blog.slug}
        logoUrl={blog.logo_url}
        primaryColor={blog.primary_color || undefined}
        customDomain={blog.custom_domain}
        domainVerified={blog.domain_verified}
        ctaText={blog.cta_text}
        ctaUrl={blog.cta_url}
        ctaType={blog.cta_type}
      />


      {/* Hero Section */}
      <section 
        className="py-16 md:py-24"
        style={{
          background: `linear-gradient(135deg, ${blog.primary_color || "hsl(var(--primary))"}10, ${blog.secondary_color || "hsl(var(--primary))"}05)`,
        }}
      >
        <div className="container mx-auto px-4 text-center">
          {blog.logo_url && (
            <img
              src={blog.logo_url}
              alt={blog.name}
              className="h-16 w-16 object-contain mx-auto mb-6 rounded-xl"
            />
          )}
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
            {blog.name}
          </h1>
          {blog.description && (
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              {blog.description}
            </p>
          )}
        </div>
      </section>

      {/* Articles Grid */}
      <main className="container mx-auto px-4 py-12">
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="font-heading text-2xl font-semibold text-foreground mb-2">
              {t('blog.noArticles')}
            </h2>
            <p className="text-muted-foreground">
              {t('blog.noArticlesDescription')}
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-8">
              {t('blog.recentArticles')}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  title={article.title}
                  excerpt={article.excerpt}
                  slug={article.slug}
                  blogSlug={blog.slug}
                  category={article.category}
                  publishedAt={article.published_at}
                  featuredImageUrl={article.featured_image_url}
                  primaryColor={blog.primary_color || undefined}
                  customDomain={blog.custom_domain}
                  domainVerified={blog.domain_verified}
                />
              ))}
            </div>

          </>
        )}
      </main>

      <BlogFooter
        blogName={blog.name}
        blogSlug={blog.slug}
        blogDescription={blog.description}
        brandDescription={blog.brand_description}
        logoUrl={blog.logo_url}
        logoNegativeUrl={blog.logo_negative_url}
        primaryColor={blog.primary_color || undefined}
        categories={categories}
        bannerTitle={blog.banner_title}
        bannerDescription={blog.banner_description}
        ctaText={blog.cta_text}
        ctaUrl={blog.cta_url}
        ctaType={blog.cta_type}
        showPoweredBy={blog.show_powered_by ?? true}
        footerText={blog.footer_text}
        customDomain={blog.custom_domain}
        domainVerified={blog.domain_verified}
      />
    </div>
  );
};

export default PublicBlog;
