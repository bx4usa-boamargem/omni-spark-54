-- ============================================================
-- OmniSeen AI Engine — Migration: New Tables
-- Run AFTER existing tables (tenants, articles, landing_pages, etc.)
-- ============================================================

-- ----------------------------------------------------------------
-- agent_runs: log every agent execution with tokens + cost
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        TEXT NOT NULL,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  pipeline_run_id UUID,
  status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','done','failed','skipped')),
  input_json      JSONB NOT NULL DEFAULT '{}',
  output_json     JSONB NOT NULL DEFAULT '{}',
  tokens_in       INTEGER NOT NULL DEFAULT 0,
  tokens_out      INTEGER NOT NULL DEFAULT 0,
  cost_usd        NUMERIC(10,6) NOT NULL DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_agent_runs_tenant ON agent_runs(tenant_id);
CREATE INDEX idx_agent_runs_job    ON agent_runs(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_agent  ON agent_runs(agent_id);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_member_select_agent_runs"
  ON agent_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.tenant_id = agent_runs.tenant_id
      AND tenant_members.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------
-- pipeline_runs: track full pipeline execution
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_key     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running','done','failed')),
  context_json     JSONB NOT NULL DEFAULT '{}',
  steps_completed  TEXT[] NOT NULL DEFAULT '{}',
  steps_failed     TEXT[] NOT NULL DEFAULT '{}',
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX idx_pipeline_runs_tenant ON pipeline_runs(tenant_id);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_member_select_pipeline_runs"
  ON pipeline_runs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.tenant_id = pipeline_runs.tenant_id
      AND tenant_members.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------
-- ai_cost_limits: per-tenant quota enforcement
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_cost_limits (
  tenant_id           UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  daily_token_limit   INTEGER NOT NULL DEFAULT 500000,
  monthly_cost_limit  NUMERIC(8,2) NOT NULL DEFAULT 50.00,
  tokens_used_today   INTEGER NOT NULL DEFAULT 0,
  cost_used_month     NUMERIC(8,2) NOT NULL DEFAULT 0,
  kill_switch_active  BOOLEAN NOT NULL DEFAULT FALSE,
  reset_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_cost_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_member_select_cost_limits"
  ON ai_cost_limits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_members.tenant_id = ai_cost_limits.tenant_id
      AND tenant_members.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------
-- serp_cache: avoid repeat API calls (24h TTL)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS serp_cache (
  cache_key    TEXT PRIMARY KEY,
  results_json JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_serp_cache_expires ON serp_cache(expires_at);

-- ----------------------------------------------------------------
-- places_cache: avoid repeat Places API calls (30d TTL)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS places_cache (
  cache_key    TEXT PRIMARY KEY,
  results_json JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX idx_places_cache_expires ON places_cache(expires_at);

-- ----------------------------------------------------------------
-- Helper: reset daily token counters (run via pg_cron or Edge Fn cron)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_daily_token_counts()
RETURNS void AS $$
BEGIN
  UPDATE ai_cost_limits
  SET tokens_used_today = 0,
      reset_date        = CURRENT_DATE,
      updated_at        = NOW()
  WHERE reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- Helper: increment token/cost usage and enforce limits
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_tenant_id  UUID,
  p_tokens_in  INTEGER,
  p_tokens_out INTEGER,
  p_cost_usd   NUMERIC
)
RETURNS TABLE(kill_switch_active BOOLEAN, tokens_used_today INTEGER) AS $$
BEGIN
  -- reset if day changed
  UPDATE ai_cost_limits
  SET tokens_used_today = 0, reset_date = CURRENT_DATE
  WHERE tenant_id = p_tenant_id AND reset_date < CURRENT_DATE;

  -- upsert
  INSERT INTO ai_cost_limits (tenant_id) VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  UPDATE ai_cost_limits
  SET tokens_used_today = tokens_used_today + p_tokens_in + p_tokens_out,
      cost_used_month   = cost_used_month + p_cost_usd,
      kill_switch_active = (
        tokens_used_today + p_tokens_in + p_tokens_out >= daily_token_limit
        OR cost_used_month + p_cost_usd >= monthly_cost_limit
      ),
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id;

  RETURN QUERY
  SELECT acl.kill_switch_active, acl.tokens_used_today
  FROM ai_cost_limits acl WHERE acl.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
