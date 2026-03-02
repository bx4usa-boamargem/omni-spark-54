-- ============================================================================
-- RADAR V3 CLEAN-ROOM — Migration SQL
-- Created: 2026-03-01
-- Purpose: Criar tabelas para o Radar V3 Intelligence Discovery Engine
-- NOTA: NÃO dropa tabelas legadas (article_opportunities, market_intel_weekly)
-- ============================================================================

-- ============================================================================
-- 1. TABELA: radar_v3_runs — Registro de execuções do Radar V3
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.radar_v3_runs (
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

-- Índices para consultas multi-tenant
CREATE INDEX IF NOT EXISTS idx_radar_v3_runs_tenant_created
  ON public.radar_v3_runs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_v3_runs_blog_created
  ON public.radar_v3_runs(blog_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_v3_runs_status
  ON public.radar_v3_runs(status) WHERE status = 'running';

-- RLS
ALTER TABLE public.radar_v3_runs ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant users podem ler runs dos seus blogs
CREATE POLICY "radar_v3_runs_select_by_tenant"
  ON public.radar_v3_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blogs b
      JOIN public.sub_accounts sa ON sa.id = b.sub_account_id
      WHERE b.id = radar_v3_runs.blog_id
        AND sa.tenant_id = radar_v3_runs.tenant_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.tenant_id = radar_v3_runs.tenant_id
              AND tm.user_id = auth.uid()
              AND tm.status = 'active'
          )
        )
    )
  );

-- INSERT/UPDATE/DELETE: apenas service role (edge functions)
CREATE POLICY "radar_v3_runs_service_role_insert"
  ON public.radar_v3_runs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "radar_v3_runs_service_role_update"
  ON public.radar_v3_runs FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "radar_v3_runs_service_role_delete"
  ON public.radar_v3_runs FOR DELETE
  USING (auth.role() = 'service_role');


-- ============================================================================
-- 2. TABELA: radar_v3_opportunities — Oportunidades geradas pelo Radar V3
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.radar_v3_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.radar_v3_runs(id) ON DELETE CASCADE,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,

  -- Core fields
  title TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  relevance_score INT NOT NULL DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'generating', 'converted', 'archived', 'rejected')),

  -- Intelligence fields
  why_now TEXT,
  search_intent TEXT CHECK (search_intent IN ('informational', 'navigational', 'transactional', 'commercial')),
  content_type TEXT CHECK (content_type IN ('blog_article', 'pillar_page', 'super_page', 'landing_page', 'entity_page')),
  funnel_stage TEXT CHECK (funnel_stage IN ('tofu', 'mofu', 'bofu')),

  -- Google Intelligence signals
  serp_data JSONB DEFAULT '{}'::jsonb,         -- SERP analysis, PAA, related searches
  entity_data JSONB DEFAULT '{}'::jsonb,        -- Entity salience, topic graph
  trend_data JSONB DEFAULT '{}'::jsonb,         -- Google Trends signals, momentum
  eeat_signals JSONB DEFAULT '{}'::jsonb,       -- EEAT compliance assessment
  helpful_content JSONB DEFAULT '{}'::jsonb,    -- Helpful Content System alignment
  ai_visibility JSONB DEFAULT '{}'::jsonb,      -- AI Overviews, Gemini, ChatGPT citability

  -- Demand signals
  estimated_volume INT,
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high')),
  regional_demand JSONB DEFAULT '{}'::jsonb,    -- City/state demand signals

  -- Source & provenance
  source TEXT NOT NULL DEFAULT 'radar_v3',
  source_urls TEXT[] DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas multi-tenant e ranking
CREATE INDEX IF NOT EXISTS idx_radar_v3_opps_tenant_blog_created
  ON public.radar_v3_opportunities(tenant_id, blog_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_v3_opps_relevance
  ON public.radar_v3_opportunities(blog_id, relevance_score DESC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_radar_v3_opps_run
  ON public.radar_v3_opportunities(run_id);
CREATE INDEX IF NOT EXISTS idx_radar_v3_opps_content_type
  ON public.radar_v3_opportunities(blog_id, content_type)
  WHERE status = 'pending';

-- RLS
ALTER TABLE public.radar_v3_opportunities ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant users
CREATE POLICY "radar_v3_opps_select_by_tenant"
  ON public.radar_v3_opportunities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blogs b
      JOIN public.sub_accounts sa ON sa.id = b.sub_account_id
      WHERE b.id = radar_v3_opportunities.blog_id
        AND sa.tenant_id = radar_v3_opportunities.tenant_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.tenant_id = radar_v3_opportunities.tenant_id
              AND tm.user_id = auth.uid()
              AND tm.status = 'active'
          )
        )
    )
  );

-- INSERT/UPDATE/DELETE: service role only
CREATE POLICY "radar_v3_opps_service_role_insert"
  ON public.radar_v3_opportunities FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "radar_v3_opps_service_role_update"
  ON public.radar_v3_opportunities FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "radar_v3_opps_service_role_delete"
  ON public.radar_v3_opportunities FOR DELETE
  USING (auth.role() = 'service_role');


-- ============================================================================
-- 3. TABELA: radar_v3_logs — Logs de execução do Radar V3
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.radar_v3_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.radar_v3_runs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info'
    CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para consulta de logs por run
CREATE INDEX IF NOT EXISTS idx_radar_v3_logs_run_created
  ON public.radar_v3_logs(run_id, created_at);

-- RLS
ALTER TABLE public.radar_v3_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: tenant users (via run → blog → tenant)
CREATE POLICY "radar_v3_logs_select_by_tenant"
  ON public.radar_v3_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.radar_v3_runs r
      JOIN public.blogs b ON b.id = r.blog_id
      JOIN public.sub_accounts sa ON sa.id = b.sub_account_id
      WHERE r.id = radar_v3_logs.run_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.tenant_id = r.tenant_id
              AND tm.user_id = auth.uid()
              AND tm.status = 'active'
          )
        )
    )
  );

-- INSERT/DELETE: service role only
CREATE POLICY "radar_v3_logs_service_role_insert"
  ON public.radar_v3_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "radar_v3_logs_service_role_delete"
  ON public.radar_v3_logs FOR DELETE
  USING (auth.role() = 'service_role');


-- ============================================================================
-- 4. SCHEDULED TRIGGER (pg_cron) — Execução diária do Radar V3
-- Descomente e execute manualmente no Supabase SQL Editor se pg_cron estiver habilitado
-- ============================================================================
-- SELECT cron.schedule(
--   'radar-v3-daily-refresh',
--   '0 6 * * *',  -- Todo dia às 06:00 UTC
--   $$
--   SELECT net.http_post(
--     url := 'https://oxbrvyinmpbkllicaxqk.supabase.co/functions/v1/radar-v3-refresh',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := jsonb_build_object('mode', 'scheduled', 'all_active_blogs', true)
--   );
--   $$
-- );


-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
