
-- ============================================================
-- PHASE 1: Article Engine v1 Infrastructure
-- Tables: generation_jobs, generation_steps, generation_queue
-- ============================================================

-- Enum for job types
CREATE TYPE public.generation_job_type AS ENUM ('article', 'super_page');

-- Enum for job/step status
CREATE TYPE public.generation_job_status AS ENUM (
  'pending', 'running', 'completed', 'failed', 'cancelled'
);

-- Enum for pipeline steps
CREATE TYPE public.generation_step_name AS ENUM (
  'INPUT_VALIDATION',
  'SERP_ANALYSIS',
  'NLP_KEYWORDS',
  'TITLE_GEN',
  'OUTLINE_GEN',
  'CONTENT_GEN',
  'IMAGE_GEN',
  'SEO_SCORE',
  'META_GEN',
  'OUTPUT'
);

-- ============================================================
-- 1. generation_jobs — Main orchestration table
-- ============================================================
CREATE TABLE public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  
  -- Job config
  job_type generation_job_type NOT NULL DEFAULT 'article',
  status generation_job_status NOT NULL DEFAULT 'pending',
  current_step generation_step_name DEFAULT NULL,
  
  -- Input/Output payloads
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB DEFAULT NULL,
  
  -- Quality metrics
  seo_score NUMERIC(5,2) DEFAULT NULL,
  seo_breakdown JSONB DEFAULT NULL,
  needs_review BOOLEAN NOT NULL DEFAULT false,
  
  -- Cost tracking
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  total_api_calls INTEGER NOT NULL DEFAULT 0,
  total_tokens_in INTEGER NOT NULL DEFAULT 0,
  total_tokens_out INTEGER NOT NULL DEFAULT 0,
  
  -- Hard caps
  max_api_calls INTEGER NOT NULL DEFAULT 15,
  
  -- Error handling
  error_message TEXT DEFAULT NULL,
  error_step generation_step_name DEFAULT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  -- Locking (idempotency)
  locked_at TIMESTAMPTZ DEFAULT NULL,
  locked_by TEXT DEFAULT NULL,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user queries
CREATE INDEX idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_blog_id ON public.generation_jobs(blog_id);
CREATE INDEX idx_generation_jobs_status ON public.generation_jobs(status);

-- Auto-update updated_at
CREATE TRIGGER update_generation_jobs_updated_at
  BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.generation_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON public.generation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.generation_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access jobs"
  ON public.generation_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. generation_steps — Per-step execution log
-- ============================================================
CREATE TABLE public.generation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  
  -- Step identification
  step_name generation_step_name NOT NULL,
  status generation_job_status NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 1,
  
  -- Input/Output
  input JSONB DEFAULT NULL,
  output JSONB DEFAULT NULL,
  
  -- AI tracking
  model_used TEXT DEFAULT NULL,
  provider TEXT DEFAULT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  latency_ms INTEGER DEFAULT NULL,
  
  -- Error
  error_message TEXT DEFAULT NULL,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for job queries
CREATE INDEX idx_generation_steps_job_id ON public.generation_steps(job_id);
CREATE INDEX idx_generation_steps_step_name ON public.generation_steps(step_name, job_id);

-- Auto-update updated_at
CREATE TRIGGER update_generation_steps_updated_at
  BEFORE UPDATE ON public.generation_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.generation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view steps of own jobs"
  ON public.generation_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.generation_jobs gj
      WHERE gj.id = job_id AND gj.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access steps"
  ON public.generation_steps FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. generation_queue — Batch scheduling
-- ============================================================
CREATE TABLE public.generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  
  -- Queue config
  input JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0,
  status generation_job_status NOT NULL DEFAULT 'pending',
  job_id UUID REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  
  -- Error
  error_message TEXT DEFAULT NULL,
  
  -- Timestamps
  scheduled_for TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generation_queue_user_id ON public.generation_queue(user_id);
CREATE INDEX idx_generation_queue_status ON public.generation_queue(status);

CREATE TRIGGER update_generation_queue_updated_at
  BEFORE UPDATE ON public.generation_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue"
  ON public.generation_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own queue items"
  ON public.generation_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
  ON public.generation_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access queue"
  ON public.generation_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable realtime for job tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
