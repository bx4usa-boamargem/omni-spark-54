-- ============================================================
-- Migração: eBook Tracking
-- Adiciona share_token + contadores em articles e cria ebook_views
-- ============================================================

-- 1. Colunas na tabela articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS share_token      text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS pdf_view_count   integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdf_generated_at timestamptz;

-- Preenche share_token para artigos que já existem sem um
UPDATE public.articles
SET share_token = encode(gen_random_bytes(16), 'hex')
WHERE share_token IS NULL;

-- 2. Tabela de rastreamento de visualizações de eBook
CREATE TABLE IF NOT EXISTS public.ebook_views (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id     uuid        REFERENCES public.articles(id) ON DELETE CASCADE,
  blog_id        uuid        REFERENCES public.blogs(id)    ON DELETE CASCADE,
  share_token    text        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  view_count     integer     DEFAULT 0,
  unique_ips     jsonb       DEFAULT '[]'::jsonb,
  created_at     timestamptz DEFAULT now(),
  last_viewed_at timestamptz
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_ebook_views_article_id  ON public.ebook_views(article_id);
CREATE INDEX IF NOT EXISTS idx_ebook_views_share_token ON public.ebook_views(share_token);
CREATE INDEX IF NOT EXISTS idx_articles_share_token    ON public.articles(share_token);

-- 4. RLS
ALTER TABLE public.ebook_views ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ebook_views_owner" ON public.ebook_views
    FOR ALL
    USING (
      blog_id IN (
        SELECT id FROM public.blogs WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ebook_views_public_read" ON public.ebook_views
    FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
