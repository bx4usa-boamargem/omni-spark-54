-- ============================================================
-- MIGRATION: Corrigir RLS recursiva + criar tabelas faltantes
-- Data: 2026-03-13
-- Problemas resolvidos:
--   1. infinite recursion em team_members (quebra /client/strategy)
--   2. article_queue não existe (404 no dashboard/radar)
--   3. blog_automation não existe (400 no dashboard/radar)
-- ============================================================

-- ── 1. CORRIGIR RLS TEAM_MEMBERS ──────────────────────────────
-- Remove todas as policies existentes que causam recursão
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;
DROP POLICY IF EXISTS "Users can view their team memberships" ON team_members;
DROP POLICY IF EXISTS "Users can manage team members" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON team_members;
DROP POLICY IF EXISTS "Members can view their team" ON team_members;

-- Desabilita RLS temporariamente para recriar sem recursão
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policy simples e direta SEM self-reference (evita recursão)
CREATE POLICY "team_members_own_rows"
  ON team_members
  FOR ALL
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'platform_admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'platform_admin'
    )
  );

-- ── 2. CRIAR TABELA article_queue (se não existir) ────────────
CREATE TABLE IF NOT EXISTS article_queue (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id       UUID REFERENCES blogs(id) ON DELETE CASCADE,
  keyword       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','completed','failed','cancelled')),
  priority      INTEGER DEFAULT 5,
  article_id    UUID REFERENCES articles(id) ON DELETE SET NULL,
  error         TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_article_queue_blog_id  ON article_queue(blog_id);
CREATE INDEX IF NOT EXISTS idx_article_queue_status   ON article_queue(status);
CREATE INDEX IF NOT EXISTS idx_article_queue_priority ON article_queue(priority DESC, created_at ASC);

-- RLS para article_queue
ALTER TABLE article_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "article_queue_blog_access" ON article_queue;
CREATE POLICY "article_queue_blog_access"
  ON article_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blogs b
      WHERE b.id = article_queue.blog_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'platform_admin'
          )
        )
    )
  );

-- ── 3. CRIAR TABELA blog_automation (se não existir) ──────────
CREATE TABLE IF NOT EXISTS blog_automation (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id           UUID REFERENCES blogs(id) ON DELETE CASCADE UNIQUE,
  enabled           BOOLEAN DEFAULT false,
  frequency         TEXT DEFAULT 'weekly'
                      CHECK (frequency IN ('daily','weekly','biweekly','monthly')),
  articles_per_run  INTEGER DEFAULT 3,
  auto_publish      BOOLEAN DEFAULT false,
  keywords_source   TEXT DEFAULT 'cluster'
                      CHECK (keywords_source IN ('cluster','manual','ai_suggest')),
  last_run_at       TIMESTAMPTZ,
  next_run_at       TIMESTAMPTZ,
  run_count         INTEGER DEFAULT 0,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_automation_blog_id ON blog_automation(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_automation_next_run ON blog_automation(next_run_at) WHERE enabled = true;

-- RLS para blog_automation
ALTER TABLE blog_automation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_automation_owner" ON blog_automation;
CREATE POLICY "blog_automation_owner"
  ON blog_automation FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blogs b
      WHERE b.id = blog_automation.blog_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'platform_admin'
          )
        )
    )
  );

-- ── 4. ADICIONAR AO REALTIME (para live updates no dashboard) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'article_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE article_queue;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'blog_automation'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE blog_automation;
  END IF;
END $$;

-- ── 5. GRANT permissões ───────────────────────────────────────
GRANT ALL ON article_queue   TO authenticated;
GRANT ALL ON blog_automation TO authenticated;
GRANT ALL ON article_queue   TO service_role;
GRANT ALL ON blog_automation TO service_role;
