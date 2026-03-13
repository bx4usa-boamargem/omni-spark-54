-- ============================================================
-- AIOS Step Logs + Agent Profile Extensions
-- Migration: 20260313_aios_step_logs.sql
-- ============================================================

-- Habilita pgvector (necessário para tipo vector e operadores)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;


-- ─── 1. aios_step_logs ───────────────────────────────────────
-- Granularidade de execução por STEP (criado → passo a passo → concluído)
-- Alimenta o visual workflow, console de logs em tempo real e métricas
CREATE TABLE IF NOT EXISTS public.aios_step_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       UUID REFERENCES public.aios_task_runs(id) ON DELETE CASCADE,
  squad_id     TEXT NOT NULL,
  agent_id     TEXT NOT NULL,
  step_name    TEXT NOT NULL,       -- ex: 'research', 'outline', 'write', 'seo-optimize'
  step_order   INT  NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','ok','error','skipped')),
  input_json   JSONB DEFAULT '{}'::jsonb,
  output_json  JSONB DEFAULT '{}'::jsonb,
  error        TEXT,
  tokens_in    INT  DEFAULT 0,
  tokens_out   INT  DEFAULT 0,
  cost_usd     NUMERIC(10,6) DEFAULT 0,
  duration_ms  INT  DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aios_step_logs_run    ON public.aios_step_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_aios_step_logs_squad  ON public.aios_step_logs(squad_id);
CREATE INDEX IF NOT EXISTS idx_aios_step_logs_agent  ON public.aios_step_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_aios_step_logs_status ON public.aios_step_logs(status);
CREATE INDEX IF NOT EXISTS idx_aios_step_logs_time   ON public.aios_step_logs(created_at DESC);

-- Trigger updated_at
CREATE TRIGGER aios_step_logs_updated_at
  BEFORE UPDATE ON public.aios_step_logs
  FOR EACH ROW EXECUTE FUNCTION public.aios_set_updated_at();

-- RLS
ALTER TABLE public.aios_step_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aios_step_logs_admin_all" ON public.aios_step_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "aios_step_logs_auth_read" ON public.aios_step_logs FOR SELECT TO authenticated USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.aios_step_logs;


-- ─── 2. Upgrade em aios_agents: avatares, descrição editável e memória ──
-- Adiciona colunas para suportar perfil rico dos agentes (editável pelo Master Admin)
ALTER TABLE public.aios_agents
  ADD COLUMN IF NOT EXISTS display_name    TEXT,
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS avatar_emoji    TEXT DEFAULT '🤖',
  ADD COLUMN IF NOT EXISTS avatar_color    TEXT DEFAULT '#7C3AED',
  ADD COLUMN IF NOT EXISTS skills          TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS system_prompt   TEXT,
  ADD COLUMN IF NOT EXISTS is_enabled      BOOLEAN NOT NULL DEFAULT true;


-- ─── 3. Tabela aios_agent_memory: aprendizado por cliente/nicho ──────────
-- Os agentes aprendem com o conteúdo e com os clientes (embedding pgvector)
CREATE TABLE IF NOT EXISTS public.aios_agent_memory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        TEXT NOT NULL,
  squad_id        TEXT NOT NULL,
  blog_id         UUID REFERENCES public.blogs(id) ON DELETE CASCADE,   -- aprendizado por cliente
  memory_type     TEXT NOT NULL                                          -- 'niche','tone','success','failure','client_pref'
    CHECK (memory_type IN ('niche','tone','success','failure','client_pref','content')),
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}'::jsonb,                             -- nicho, empresa, KPIs, preferências
  embedding       extensions.vector(1536),                                -- pgvector para busca semântica
  confidence      FLOAT DEFAULT 1.0,                                     -- score de confiança 0-1
  source_run_id   UUID REFERENCES public.aios_task_runs(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aios_memory_agent   ON public.aios_agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_aios_memory_squad   ON public.aios_agent_memory(squad_id);
CREATE INDEX IF NOT EXISTS idx_aios_memory_blog    ON public.aios_agent_memory(blog_id);
CREATE INDEX IF NOT EXISTS idx_aios_memory_type    ON public.aios_agent_memory(memory_type);
-- Índice vetorial para busca semântica (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_aios_memory_embed   ON public.aios_agent_memory USING ivfflat(embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Trigger updated_at
CREATE TRIGGER aios_agent_memory_updated_at
  BEFORE UPDATE ON public.aios_agent_memory
  FOR EACH ROW EXECUTE FUNCTION public.aios_set_updated_at();

-- RLS
ALTER TABLE public.aios_agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aios_memory_admin_all" ON public.aios_agent_memory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "aios_memory_auth_read" ON public.aios_agent_memory FOR SELECT TO authenticated USING (true);


-- ─── 4. Seed: display names, descrições e avatares dos agentes ─────────
-- Squad Conteúdo
UPDATE public.aios_agents SET
  display_name = 'Content Architect',
  description  = 'Planeja a estrutura, outline e estratégia do artigo com base em demanda local e objetivos do cliente',
  avatar_emoji = '🏗️',
  avatar_color = '#2563EB',
  skills       = ARRAY['planejamento','outline','estratégia de conteúdo','pesquisa de demanda']
WHERE squad_id = 'omniseen-conteudo' AND agent_id = 'content-architect';

UPDATE public.aios_agents SET
  display_name = 'Content Writer',
  description  = 'Redige artigos completos com voz autêntica, estrutura de alta conversão e SEO embutido',
  avatar_emoji = '✍️',
  avatar_color = '#7C3AED',
  skills       = ARRAY['redação','copywriting','storytelling','formatação markdown']
WHERE squad_id = 'omniseen-conteudo' AND agent_id = 'content-writer';

UPDATE public.aios_agents SET
  display_name = 'SEO Optimizer',
  description  = 'Otimiza título, meta description, densidade de keywords, links internos e schema markup',
  avatar_emoji = '🔍',
  avatar_color = '#059669',
  skills       = ARRAY['SEO on-page','schema markup','keywords','links internos']
WHERE squad_id = 'omniseen-conteudo' AND agent_id = 'seo-optimizer';

UPDATE public.aios_agents SET
  display_name = 'Content QA',
  description  = 'Revisa qualidade, coerência, score mínimo e aplica correções automáticas antes da publicação',
  avatar_emoji = '✅',
  avatar_color = '#D97706',
  skills       = ARRAY['revisão','quality gate','auto-fix','score de qualidade']
WHERE squad_id = 'omniseen-conteudo' AND agent_id = 'content-qa';

UPDATE public.aios_agents SET
  display_name = 'Image Curator',
  description  = 'Gera e seleciona imagens com IA (Flux/Imagen), otimiza alt text e compressão',
  avatar_emoji = '🎨',
  avatar_color = '#DB2777',
  skills       = ARRAY['geração de imagens','Flux AI','alt text','compressão']
WHERE squad_id = 'omniseen-conteudo' AND agent_id = 'image-curator';

UPDATE public.aios_agents SET
  display_name = 'Publisher',
  description  = 'Publica o artigo no CMS/WordPress, envia para IndexNow e notifica o cliente',
  avatar_emoji = '🚀',
  avatar_color = '#0891B2',
  skills       = ARRAY['publicação','CMS','WordPress','IndexNow','notificações']
WHERE squad_id = 'omniseen-conteudo' AND agent_id = 'publisher';

-- Squad Presença Digital
UPDATE public.aios_agents SET
  display_name = 'SERP Analyst',
  description  = 'Analisa resultados orgânicos, posições e oportunidades de ranqueamento no Google',
  avatar_emoji = '📊',
  avatar_color = '#2563EB',
  skills       = ARRAY['SERP analysis','rank tracking','GSC','featured snippets']
WHERE squad_id = 'omniseen-presenca-digital' AND agent_id = 'serp-analyst';

UPDATE public.aios_agents SET
  display_name = 'GMB Optimizer',
  description  = 'Gerencia e otimiza o Google Business Profile: posts, reviews, fotos e health score',
  avatar_emoji = '📍',
  avatar_color = '#DC2626',
  skills       = ARRAY['Google Business','GMB posts','reviews','local SEO']
WHERE squad_id = 'omniseen-presenca-digital' AND agent_id = 'gmb-optimizer';

UPDATE public.aios_agents SET
  display_name = 'Keyword Researcher',
  description  = 'Descobre oportunidades de keywords com volume, dificuldade e intenção de busca',
  avatar_emoji = '🔑',
  avatar_color = '#7C3AED',
  skills       = ARRAY['keyword research','Google Trends','intenção de busca','clusters']
WHERE squad_id = 'omniseen-presenca-digital' AND agent_id = 'keyword-researcher';

UPDATE public.aios_agents SET
  display_name = 'Competitor Watch',
  description  = 'Monitora concorrentes: conteúdo publicado, keywords conquistadas e gaps de mercado',
  avatar_emoji = '👁️',
  avatar_color = '#059669',
  skills       = ARRAY['análise de concorrentes','content gap','backlinks','market intel']
WHERE squad_id = 'omniseen-presenca-digital' AND agent_id = 'competitor-watch';

-- Squad Comercial
UPDATE public.aios_agents SET
  display_name = 'SDR Agent',
  description  = 'Prospecta leads, qualifica oportunidades e envia sequências de email personalizadas',
  avatar_emoji = '💼',
  avatar_color = '#D97706',
  skills       = ARRAY['prospecção','email sequence','qualificação','cold outreach']
WHERE squad_id = 'omniseen-comercial' AND agent_id = 'sdr-agent';

UPDATE public.aios_agents SET
  display_name = 'Funnel Analyst',
  description  = 'Analisa funil de conversão, identifica gargalos e sugere otimizações de CRO',
  avatar_emoji = '📈',
  avatar_color = '#2563EB',
  skills       = ARRAY['funil de vendas','CRO','analytics','A/B testing']
WHERE squad_id = 'omniseen-comercial' AND agent_id = 'funnel-analyst';

UPDATE public.aios_agents SET
  display_name = 'Report Agent',
  description  = 'Gera relatórios semanais e mensais de performance para cada cliente automaticamente',
  avatar_emoji = '📋',
  avatar_color = '#059669',
  skills       = ARRAY['relatórios','ROI','KPIs','automação de reports']
WHERE squad_id = 'omniseen-comercial' AND agent_id = 'report-agent';

UPDATE public.aios_agents SET
  display_name = 'Lead Qualifier',
  description  = 'Pontua e classifica leads por perfil ideal de cliente (ICP) e probabilidade de fechamento',
  avatar_emoji = '🎯',
  avatar_color = '#DC2626',
  skills       = ARRAY['lead scoring','ICP','CRM','pipeline management']
WHERE squad_id = 'omniseen-comercial' AND agent_id = 'lead-qualifier';

-- Meta-AIOS
UPDATE public.aios_agents SET
  display_name = 'Swarm Coordinator',
  description  = 'Orquestra múltiplos squads em paralelo, coordena handoffs e resolve conflitos',
  avatar_emoji = '🕸️',
  avatar_color = '#7C3AED',
  skills       = ARRAY['orquestração','multi-agent','swarm','coordenação']
WHERE squad_id = 'claude-code-mastery' AND agent_id = 'swarm-coordinator';

UPDATE public.aios_agents SET
  display_name = 'MCP Agent',
  description  = 'Gerencia contexto via Model Context Protocol, injeta memória e knowledge em outros agentes',
  avatar_emoji = '🧠',
  avatar_color = '#0891B2',
  skills       = ARRAY['MCP','context management','knowledge injection','RAG']
WHERE squad_id = 'claude-code-mastery' AND agent_id = 'mcp-agent';

UPDATE public.aios_agents SET
  display_name = 'Meta Auditor',
  description  = 'Audita a qualidade dos outros agentes, detecta alucinações e mede ROI por squad',
  avatar_emoji = '🔬',
  avatar_color = '#D97706',
  skills       = ARRAY['auditoria','hallucination detection','métricas','meta-IA']
WHERE squad_id = 'claude-code-mastery' AND agent_id = 'meta-auditor';


-- ─── 5. RPC: busca semântica na memória do agente ──────────────────────
-- Busca memórias relevantes de um agente para um cliente/nicho específico
CREATE OR REPLACE FUNCTION public.search_agent_memory(
  p_agent_id  TEXT,
  p_blog_id   UUID,
  p_query_embedding extensions.vector(1536),
  p_limit     INT DEFAULT 5
) RETURNS TABLE (
  id         UUID,
  memory_type TEXT,
  content    TEXT,
  metadata   JSONB,
  confidence FLOAT,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.memory_type,
    m.content,
    m.metadata,
    m.confidence,
    1 - (m.embedding <=> p_query_embedding) AS similarity
  FROM public.aios_agent_memory m
  WHERE m.agent_id = p_agent_id
    AND (p_blog_id IS NULL OR m.blog_id = p_blog_id OR m.blog_id IS NULL)
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;
