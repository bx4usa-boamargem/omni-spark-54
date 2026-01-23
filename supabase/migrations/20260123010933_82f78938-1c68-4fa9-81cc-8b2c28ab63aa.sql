-- Fix SERP cache upsert: add unique constraint that matches ON CONFLICT (blog_id, keyword, territory)
-- This unblocks analyze-serp cache persistence and prevents SERP_NOT_FOUND in boost-content-score.

ALTER TABLE public.serp_analysis_cache
ADD CONSTRAINT serp_analysis_cache_blog_keyword_territory_key
UNIQUE (blog_id, keyword, territory);

-- Helpful indexes for reads used by boost-content-score and analyze-serp
CREATE INDEX IF NOT EXISTS idx_serp_analysis_cache_lookup
ON public.serp_analysis_cache (blog_id, keyword, territory, expires_at);

CREATE INDEX IF NOT EXISTS idx_serp_analysis_cache_analyzed_at
ON public.serp_analysis_cache (analyzed_at DESC);
