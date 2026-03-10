-- ============================================================
-- Antigravity Job System Orchestration
-- Tables: automation_schedules, jobs, job_events, ai_run_steps
-- ============================================================

-- Enum for Job Status
CREATE TYPE public.job_status AS ENUM ('queued', 'running', 'done', 'failed', 'cancelled');

-- 1. automation_schedules
CREATE TABLE IF NOT EXISTS public.automation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL, -- references tenants(id) depending on actual schema
  enabled BOOLEAN NOT NULL DEFAULT true,
  mix_policy JSONB NOT NULL DEFAULT '{"blog": 0.7, "super_page": 0.3}'::jsonb,
  market_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  start_time TIME NOT NULL DEFAULT '08:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_schedules_tenant ON public.automation_schedules(tenant_id);

-- 2. jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  status public.job_status NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 0,
  payload JSONB DEFAULT '{}'::jsonb,
  
  locked_at TIMESTAMPTZ DEFAULT NULL,
  locked_by TEXT DEFAULT NULL,
  
  error_text TEXT DEFAULT NULL,
  try_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON public.jobs(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON public.jobs(tenant_id);


-- 3. job_events (Audit Log)
CREATE TABLE IF NOT EXISTS public.job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT,
  data_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_events_job ON public.job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_job_events_tenant ON public.job_events(tenant_id);


-- 4. ai_run_steps
CREATE TABLE IF NOT EXISTS public.ai_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  step_key TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_text TEXT,
  response_text TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_run_steps_tenant ON public.ai_run_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_run_steps_job ON public.ai_run_steps(job_id);


-- ============================================================
-- RPC: claim_next_job (Atomic lock for runners)
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_next_job(p_runner_id TEXT)
RETURNS SETOF public.jobs AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- We select the first available job ordered by priority, then creation time.
  -- FOR UPDATE SKIP LOCKED ensures multiple runners skip over rows already locked by others.
  SELECT id INTO v_job_id
  FROM public.jobs
  WHERE status = 'queued'
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job_id IS NOT NULL THEN
    -- Update the locked row and return it.
    RETURN QUERY
    UPDATE public.jobs
    SET status = 'running',
        locked_at = NOW(),
        locked_by = p_runner_id,
        try_count = try_count + 1,
        updated_at = NOW()
    WHERE id = v_job_id
    RETURNING *;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.automation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_run_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ServiceRole can manage all automation_schedules" ON public.automation_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ServiceRole can manage all jobs" ON public.jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ServiceRole can manage all job_events" ON public.job_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ServiceRole can manage all ai_run_steps" ON public.ai_run_steps FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Assuming we already have a tenant_members table for authenticated users. 
-- For Edge Functions, the service_role key is used, which bypasses RLS if we set it up that way.
