-- Phase 0: content_type (article | super_page), word_count_target, schema_json on articles
-- REFACTOR-PLAN-OMNISEEN-SUPER-PAGE-ENGINE-V2 — Phase 0.1

-- content_type: article (default) or super_page
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS word_count_target INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS schema_json JSONB DEFAULT NULL;

COMMENT ON COLUMN public.articles.content_type IS 'article (1500-3000 words) or super_page (3000-6000 words)';
COMMENT ON COLUMN public.articles.word_count_target IS 'Target word count used at generation time';
COMMENT ON COLUMN public.articles.schema_json IS 'JSON-LD schema (FAQPage, Article) for SEO';

-- Ensure existing rows have content_type set
UPDATE public.articles SET content_type = 'article' WHERE content_type IS NULL;

-- Optional: constraint for valid content_type (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articles_content_type_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_content_type_check
      CHECK (content_type IN ('article', 'super_page'));
  END IF;
END $$;
