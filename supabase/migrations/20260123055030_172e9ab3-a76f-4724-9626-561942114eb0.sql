-- Create landing_pages table for storing generated landing pages
CREATE TABLE public.landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  page_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  featured_image_url TEXT,
  template_type TEXT DEFAULT 'service_page',
  generation_source TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE(blog_id, slug)
);

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_landing_pages_blog_id ON public.landing_pages(blog_id);
CREATE INDEX idx_landing_pages_slug ON public.landing_pages(slug);
CREATE INDEX idx_landing_pages_status ON public.landing_pages(status);

-- RLS Policies

-- Allow blog owners to view their landing pages
CREATE POLICY "Blog owners can view their landing pages"
ON public.landing_pages
FOR SELECT
USING (
  blog_id IN (
    SELECT id FROM public.blogs WHERE user_id = auth.uid()
  )
  OR
  blog_id IN (
    SELECT blog_id FROM public.tenant_members WHERE user_id = auth.uid()
  )
);

-- Allow blog owners to create landing pages
CREATE POLICY "Blog owners can create landing pages"
ON public.landing_pages
FOR INSERT
WITH CHECK (
  blog_id IN (
    SELECT id FROM public.blogs WHERE user_id = auth.uid()
  )
  OR
  blog_id IN (
    SELECT blog_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
  )
);

-- Allow blog owners to update their landing pages
CREATE POLICY "Blog owners can update their landing pages"
ON public.landing_pages
FOR UPDATE
USING (
  blog_id IN (
    SELECT id FROM public.blogs WHERE user_id = auth.uid()
  )
  OR
  blog_id IN (
    SELECT blog_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
  )
);

-- Allow blog owners to delete their landing pages
CREATE POLICY "Blog owners can delete their landing pages"
ON public.landing_pages
FOR DELETE
USING (
  blog_id IN (
    SELECT id FROM public.blogs WHERE user_id = auth.uid()
  )
  OR
  blog_id IN (
    SELECT blog_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Allow public access to published landing pages (for public rendering)
CREATE POLICY "Anyone can view published landing pages"
ON public.landing_pages
FOR SELECT
USING (status = 'published');

-- Create trigger for updated_at
CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();