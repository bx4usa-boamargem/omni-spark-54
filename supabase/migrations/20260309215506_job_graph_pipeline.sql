-- Migration: Job Graph Pipeline Refactoring
-- Adding support for complex job execution graphs, delayed jobs, retries and dead letters.

-- 1. Add 'dead' to job_status enum
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'dead';

-- 2. Create job_graphs
CREATE TABLE IF NOT EXISTS public.job_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  graph_type TEXT NOT NULL,
  root_job_id UUID, -- References jobs(id), foreign key added after
  status TEXT NOT NULL DEFAULT 'running',
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_graphs_tenant ON public.job_graphs(tenant_id);

-- 3. Modify jobs table
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS graph_id UUID REFERENCES public.job_graphs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parent_job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS run_after TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- Add foreign key from job_graphs to jobs (root_job_id)
ALTER TABLE public.job_graphs
  ADD CONSTRAINT fk_job_graphs_root_job
  FOREIGN KEY (root_job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;

-- 4. Create job_dependencies table
CREATE TABLE IF NOT EXISTS public.job_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID NOT NULL REFERENCES public.job_graphs(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  depends_on_job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_dependencies_job ON public.job_dependencies(job_id);
CREATE INDEX IF NOT EXISTS idx_job_dependencies_depends_on ON public.job_dependencies(depends_on_job_id);

-- 5. Add indexes to jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status_run_after ON public.jobs(status, run_after);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON public.jobs(priority DESC);

-- 6. Create dead_jobs_view
CREATE OR REPLACE VIEW public.dead_jobs_view AS
SELECT * FROM public.jobs WHERE status = 'dead';

-- 7. Update claim_next_job RPC
CREATE OR REPLACE FUNCTION public.claim_next_job(p_runner_id TEXT)
RETURNS SETOF public.jobs AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- We select the first available job ordered by priority, then creation time.
  -- The job must be 'queued', run_after <= now(), and have NO pending dependencies.
  SELECT j.id INTO v_job_id
  FROM public.jobs j
  WHERE j.status = 'queued'
    AND j.run_after <= now()
    AND NOT EXISTS (
      -- Check if there are any dependencies for this job that are NOT 'done'
      SELECT 1 
      FROM public.job_dependencies dep
      JOIN public.jobs dep_job ON dep.depends_on_job_id = dep_job.id
      WHERE dep.job_id = j.id
        AND dep_job.status != 'done'
    )
  ORDER BY j.priority DESC, j.created_at ASC
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

-- 8. Enable RLS and setup policies
ALTER TABLE public.job_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ServiceRole can manage all job_graphs" ON public.job_graphs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ServiceRole can manage all job_dependencies" ON public.job_dependencies FOR ALL TO service_role USING (true) WITH CHECK (true);
