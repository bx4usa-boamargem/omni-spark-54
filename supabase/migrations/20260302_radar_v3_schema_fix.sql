-- ============================================================================
-- RADAR V3 — SCHEMA FIX
-- Dropa e recria tabelas com schema minimal correto
-- Necessário porque a migration anterior pode ter deployado schema pesado
-- ============================================================================

-- Drop na ordem correta (dependências)
DROP TABLE IF EXISTS public.radar_v3_logs CASCADE;
DROP TABLE IF EXISTS public.radar_v3_opportunities CASCADE;
DROP TABLE IF EXISTS public.radar_v3_runs CASCADE;


-- ============================================================================
-- 1. radar_v3_runs
-- ============================================================================
CREATE TABLE public.radar_v3_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  opportunities_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rv3_runs_tenant ON public.radar_v3_runs(tenant_id, created_at DESC);
CREATE INDEX idx_rv3_runs_blog ON public.radar_v3_runs(blog_id, created_at DESC);

ALTER TABLE public.radar_v3_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rv3_runs_select" ON public.radar_v3_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blogs b
      WHERE b.id = radar_v3_runs.blog_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "rv3_runs_service_insert" ON public.radar_v3_runs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "rv3_runs_service_update" ON public.radar_v3_runs FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "rv3_runs_service_delete" ON public.radar_v3_runs FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. radar_v3_opportunities (SCHEMA MINIMAL)
-- ============================================================================
CREATE TABLE public.radar_v3_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.radar_v3_runs(id) ON DELETE CASCADE,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  title TEXT NOT NULL,
  confidence_score INT NOT NULL DEFAULT 0
    CHECK (confidence_score >= 0 AND confidence_score <= 100),
  why_now TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'generating', 'converted', 'archived', 'rejected')),
  source TEXT NOT NULL DEFAULT 'radar_v3_minimal',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rv3_opps_tenant_blog ON public.radar_v3_opportunities(tenant_id, blog_id, created_at DESC);
CREATE INDEX idx_rv3_opps_score ON public.radar_v3_opportunities(blog_id, confidence_score DESC) WHERE status = 'pending';
CREATE INDEX idx_rv3_opps_run ON public.radar_v3_opportunities(run_id);

ALTER TABLE public.radar_v3_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rv3_opps_select" ON public.radar_v3_opportunities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blogs b
      WHERE b.id = radar_v3_opportunities.blog_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "rv3_opps_service_insert" ON public.radar_v3_opportunities FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "rv3_opps_service_update" ON public.radar_v3_opportunities FOR UPDATE
  USING (auth.role() = 'service_role');
CREATE POLICY "rv3_opps_update_from_ui" ON public.radar_v3_opportunities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.blogs b
      WHERE b.id = radar_v3_opportunities.blog_id
        AND b.user_id = auth.uid()
    )
  );
CREATE POLICY "rv3_opps_service_delete" ON public.radar_v3_opportunities FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. radar_v3_logs
-- ============================================================================
CREATE TABLE public.radar_v3_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.radar_v3_runs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rv3_logs_run ON public.radar_v3_logs(run_id, created_at);

ALTER TABLE public.radar_v3_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rv3_logs_select" ON public.radar_v3_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.radar_v3_runs r
      JOIN public.blogs b ON b.id = r.blog_id
      WHERE r.id = radar_v3_logs.run_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "rv3_logs_service_insert" ON public.radar_v3_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "rv3_logs_service_delete" ON public.radar_v3_logs FOR DELETE
  USING (auth.role() = 'service_role');
