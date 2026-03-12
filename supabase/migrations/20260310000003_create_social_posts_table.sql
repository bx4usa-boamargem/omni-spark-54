-- Content Multiplier Engine: tabela de posts sociais gerados/publicados
-- Migration: 20260310_create_social_posts_table.sql

-- Tabela de posts sociais
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  blog_id uuid REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'facebook', 'google_business')),
  content jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'failed', 'scheduled')),
  published_at timestamptz,
  error_message text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: um draft por artigo + plataforma
ALTER TABLE public.social_posts
  DROP CONSTRAINT IF EXISTS social_posts_article_platform_unique;
ALTER TABLE public.social_posts
  ADD CONSTRAINT social_posts_article_platform_unique UNIQUE (article_id, platform);

-- Índices
CREATE INDEX IF NOT EXISTS idx_social_posts_article_id ON public.social_posts(article_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_blog_id ON public.social_posts(blog_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON public.social_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_social_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_social_posts_updated_at ON public.social_posts;
CREATE TRIGGER trigger_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_social_posts_updated_at();

-- RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_posts_owner_policy" ON public.social_posts;
CREATE POLICY "social_posts_owner_policy" ON public.social_posts
  FOR ALL
  USING (
    blog_id IN (
      SELECT id FROM public.blogs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    blog_id IN (
      SELECT id FROM public.blogs WHERE user_id = auth.uid()
    )
  );

-- Tabela de credenciais sociais por blog
CREATE TABLE IF NOT EXISTS public.social_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  instagram_access_token text,
  instagram_business_account_id text,
  facebook_access_token text,
  facebook_page_id text,
  linkedin_access_token text,
  linkedin_organization_id text,
  google_business_access_token text,
  google_business_account_id text,
  google_business_location_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.social_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_credentials_owner_policy" ON public.social_credentials;
CREATE POLICY "social_credentials_owner_policy" ON public.social_credentials
  FOR ALL
  USING (
    blog_id IN (
      SELECT id FROM public.blogs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    blog_id IN (
      SELECT id FROM public.blogs WHERE user_id = auth.uid()
    )
  );
