-- ============================================================
-- AIOS Squads — Migration SQL
-- Tabelas: aios_squads, aios_agents, aios_task_runs
-- ============================================================

-- SQUADS
CREATE TABLE IF NOT EXISTS public.aios_squads (
  id          TEXT PRIMARY KEY,                     -- ex: 'omniseen-conteudo'
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'idle'          -- idle | running | error | offline
    CHECK (status IN ('idle','running','error','offline')),
  config      JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AGENTS
CREATE TABLE IF NOT EXISTS public.aios_agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id     TEXT NOT NULL REFERENCES public.aios_squads(id) ON DELETE CASCADE,
  agent_id     TEXT NOT NULL,                       -- ex: 'content-writer'
  role         TEXT NOT NULL,                       -- ex: 'writer'
  status       TEXT NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle','running','blocked','error')),
  current_task JSONB,
  metrics      JSONB DEFAULT '{"total_runs":0,"success_rate":100,"avg_latency_ms":0}'::jsonb,
  last_active  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (squad_id, agent_id)
);

-- TASK RUNS
CREATE TABLE IF NOT EXISTS public.aios_task_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id     TEXT NOT NULL REFERENCES public.aios_squads(id),
  agent_id     TEXT,
  task_type    TEXT NOT NULL,                       -- ex: 'create-article'
  tenant_id    UUID REFERENCES public.blogs(id),    -- quem disparou (via blog_id)
  blog_id      UUID REFERENCES public.blogs(id),
  params       JSONB DEFAULT '{}'::jsonb,
  status       TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','completed','failed')),
  result       JSONB,
  error        TEXT,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_aios_task_runs_squad    ON public.aios_task_runs(squad_id);
CREATE INDEX IF NOT EXISTS idx_aios_task_runs_status   ON public.aios_task_runs(status);
CREATE INDEX IF NOT EXISTS idx_aios_task_runs_blog     ON public.aios_task_runs(blog_id);
CREATE INDEX IF NOT EXISTS idx_aios_task_runs_created  ON public.aios_task_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aios_agents_squad       ON public.aios_agents(squad_id);

-- ROW LEVEL SECURITY
ALTER TABLE public.aios_squads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_agents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aios_task_runs ENABLE ROW LEVEL SECURITY;

-- Admins (service_role) podem tudo
CREATE POLICY "aios_squads_admin_all"    ON public.aios_squads    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "aios_agents_admin_all"    ON public.aios_agents    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "aios_task_runs_admin_all" ON public.aios_task_runs FOR ALL USING (true) WITH CHECK (true);

-- Usuários autenticados podem ler
CREATE POLICY "aios_squads_auth_read"    ON public.aios_squads    FOR SELECT TO authenticated USING (true);
CREATE POLICY "aios_agents_auth_read"    ON public.aios_agents    FOR SELECT TO authenticated USING (true);
CREATE POLICY "aios_task_runs_auth_read" ON public.aios_task_runs FOR SELECT TO authenticated USING (true);

-- Seed squads estáticos
INSERT INTO public.aios_squads (id, name, description, status) VALUES
  ('omniseen-conteudo',         'Squad Conteúdo',  'Criação, SEO e publicação de artigos',     'idle'),
  ('omniseen-presenca-digital', 'Squad Presença',  'SEO local, GMB e análise de SERP',         'idle'),
  ('omniseen-comercial',        'Squad Comercial', 'SDR, funil de vendas e analytics',         'idle'),
  ('claude-code-mastery',       'Meta-AIOS',       'Orquestração de swarms e meta-agentes',    'idle')
ON CONFLICT (id) DO NOTHING;

-- Seed agentes por squad
INSERT INTO public.aios_agents (squad_id, agent_id, role, status) VALUES
  ('omniseen-conteudo',         'content-architect', 'planner',   'idle'),
  ('omniseen-conteudo',         'content-writer',    'writer',    'idle'),
  ('omniseen-conteudo',         'seo-optimizer',     'seo',       'idle'),
  ('omniseen-conteudo',         'content-qa',        'reviewer',  'idle'),
  ('omniseen-conteudo',         'image-curator',     'media',     'idle'),
  ('omniseen-conteudo',         'publisher',         'publisher', 'idle'),
  ('omniseen-presenca-digital', 'serp-analyst',      'analyst',   'idle'),
  ('omniseen-presenca-digital', 'gmb-optimizer',     'local-seo', 'idle'),
  ('omniseen-presenca-digital', 'keyword-researcher','researcher','idle'),
  ('omniseen-presenca-digital', 'competitor-watch',  'monitor',   'idle'),
  ('omniseen-comercial',        'sdr-agent',         'sdr',       'idle'),
  ('omniseen-comercial',        'funnel-analyst',    'analyst',   'idle'),
  ('omniseen-comercial',        'report-agent',      'reporter',  'idle'),
  ('omniseen-comercial',        'lead-qualifier',    'qualifier', 'idle'),
  ('claude-code-mastery',       'swarm-coordinator', 'swarm',     'idle'),
  ('claude-code-mastery',       'mcp-agent',         'mcp',       'idle'),
  ('claude-code-mastery',       'meta-auditor',      'auditor',   'idle')
ON CONFLICT (squad_id, agent_id) DO NOTHING;

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.aios_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER aios_squads_updated_at
  BEFORE UPDATE ON public.aios_squads
  FOR EACH ROW EXECUTE FUNCTION public.aios_set_updated_at();

CREATE TRIGGER aios_agents_updated_at
  BEFORE UPDATE ON public.aios_agents
  FOR EACH ROW EXECUTE FUNCTION public.aios_set_updated_at();

-- Realtime: habilitar para task_runs e agents
ALTER PUBLICATION supabase_realtime ADD TABLE public.aios_task_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aios_agents;
