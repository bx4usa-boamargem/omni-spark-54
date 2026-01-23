-- ============================================================
-- NICHE LOCK SYSTEM - Database Migration
-- ============================================================

-- 1. Add niche governance fields to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS niche_locked BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS score_locked BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_score_change_reason TEXT,
ADD COLUMN IF NOT EXISTS niche_profile_id UUID REFERENCES public.niche_profiles(id);

-- 2. Create niche_guard_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.niche_guard_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'term_blocked', 'score_blocked', 'content_blocked', 'image_blocked'
  blocked_terms TEXT[] DEFAULT ARRAY[]::TEXT[],
  source_function TEXT NOT NULL, -- 'boost-content-score', 'auto-fix', 'polish-final', 'generate-image'
  original_value JSONB,
  blocked_reason TEXT,
  niche_profile_id UUID REFERENCES public.niche_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_niche_guard_logs_article_id ON public.niche_guard_logs(article_id);
CREATE INDEX IF NOT EXISTS idx_niche_guard_logs_blog_id ON public.niche_guard_logs(blog_id);
CREATE INDEX IF NOT EXISTS idx_niche_guard_logs_created_at ON public.niche_guard_logs(created_at DESC);

-- 4. Enable RLS on niche_guard_logs
ALTER TABLE public.niche_guard_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for niche_guard_logs
CREATE POLICY "Users can view niche guard logs for their blogs"
ON public.niche_guard_logs
FOR SELECT
USING (
  blog_id IN (
    SELECT id FROM public.blogs WHERE user_id = auth.uid()
    UNION
    SELECT blog_id FROM public.team_members WHERE user_id = auth.uid() AND status = 'accepted'
  )
);

-- 6. Create policy for service role to insert logs
CREATE POLICY "Service role can insert niche guard logs"
ON public.niche_guard_logs
FOR INSERT
WITH CHECK (true);

-- 7. Add comment for documentation
COMMENT ON TABLE public.niche_guard_logs IS 'Audit log for blocked semantic terms, score changes, and content modifications by the Niche Lock System';
COMMENT ON COLUMN public.articles.niche_locked IS 'When true, content is locked to the assigned niche profile - no cross-niche terms allowed';
COMMENT ON COLUMN public.articles.score_locked IS 'When true, score can only change via explicit user action, not system automation';
COMMENT ON COLUMN public.articles.last_score_change_reason IS 'Human-readable reason for the last score change (e.g., "User clicked Recalculate")';