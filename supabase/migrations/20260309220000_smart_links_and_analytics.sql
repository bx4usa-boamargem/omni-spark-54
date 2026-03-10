-- ============================================================
-- Smart Links com Analytics de Visitas e Curtidas
-- Tables: article_smart_links, link_events
-- ============================================================

-- 1. article_smart_links
-- Cada artigo pode gerar um "smart link" rastreado com slug único
CREATE TABLE IF NOT EXISTS public.article_smart_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id   UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  slug         TEXT NOT NULL UNIQUE,       -- e.g. "meu-artigo-incrivel-abc12"
  title        TEXT,                       -- cópia do título para exibição pública
  description  TEXT,                       -- meta description para Open Graph
  image_url    TEXT,                       -- featured image para Open Graph
  pdf_url      TEXT,                       -- PDF gerado (se houver)
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smart_links_article    ON public.article_smart_links(article_id);
CREATE INDEX IF NOT EXISTS idx_smart_links_tenant     ON public.article_smart_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_smart_links_slug       ON public.article_smart_links(slug);

-- 2. link_events
-- Cada visita ou curtida registrada de forma anônima
CREATE TYPE IF NOT EXISTS public.link_event_type AS ENUM ('visit', 'like');

CREATE TABLE IF NOT EXISTS public.link_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id   UUID NOT NULL REFERENCES public.article_smart_links(id) ON DELETE CASCADE,
  event_type      public.link_event_type NOT NULL DEFAULT 'visit',
  visitor_hash    TEXT,     -- hash anônimo do IP/UA para deduplicação
  referrer        TEXT,     -- de onde veio (whatsapp, linkedin, etc)
  user_agent      TEXT,
  country_code    TEXT,     -- opcional, via IP geolocation
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_events_smart_link  ON public.link_events(smart_link_id);
CREATE INDEX IF NOT EXISTS idx_link_events_created_at  ON public.link_events(created_at);
CREATE INDEX IF NOT EXISTS idx_link_events_type        ON public.link_events(event_type);

-- ============================================================
-- RPC: get_link_stats — agrega visitas e curtidas por smart link
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_link_stats(p_smart_link_id UUID)
RETURNS TABLE(
  total_visits BIGINT,
  total_likes  BIGINT,
  visits_7d    BIGINT,
  visits_30d   BIGINT,
  likes_7d     BIGINT,
  likes_30d    BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'visit')                               AS total_visits,
    COUNT(*) FILTER (WHERE event_type = 'like')                                AS total_likes,
    COUNT(*) FILTER (WHERE event_type = 'visit' AND created_at > now() - INTERVAL '7 days')  AS visits_7d,
    COUNT(*) FILTER (WHERE event_type = 'visit' AND created_at > now() - INTERVAL '30 days') AS visits_30d,
    COUNT(*) FILTER (WHERE event_type = 'like'  AND created_at > now() - INTERVAL '7 days')  AS likes_7d,
    COUNT(*) FILTER (WHERE event_type = 'like'  AND created_at > now() - INTERVAL '30 days') AS likes_30d
  FROM public.link_events
  WHERE smart_link_id = p_smart_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_tenant_link_stats — agrega todos os links de um tenant
CREATE OR REPLACE FUNCTION public.get_tenant_link_stats(p_tenant_id UUID)
RETURNS TABLE(
  smart_link_id UUID,
  article_id    UUID,
  slug          TEXT,
  title         TEXT,
  pdf_url       TEXT,
  total_visits  BIGINT,
  total_likes   BIGINT,
  visits_7d     BIGINT,
  likes_7d      BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    sl.article_id,
    sl.slug,
    sl.title,
    sl.pdf_url,
    COUNT(le.id) FILTER (WHERE le.event_type = 'visit')                                AS total_visits,
    COUNT(le.id) FILTER (WHERE le.event_type = 'like')                                 AS total_likes,
    COUNT(le.id) FILTER (WHERE le.event_type = 'visit' AND le.created_at > now() - INTERVAL '7 days') AS visits_7d,
    COUNT(le.id) FILTER (WHERE le.event_type = 'like'  AND le.created_at > now() - INTERVAL '7 days') AS likes_7d
  FROM public.article_smart_links sl
  LEFT JOIN public.link_events le ON le.smart_link_id = sl.id
  WHERE sl.tenant_id = p_tenant_id
    AND sl.is_active = TRUE
  GROUP BY sl.id, sl.article_id, sl.slug, sl.title, sl.pdf_url
  ORDER BY total_visits DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.article_smart_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_events ENABLE ROW LEVEL SECURITY;

-- Tenant pode ver seus próprios smart links
CREATE POLICY "Tenant can view own smart links"
  ON public.article_smart_links FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = auth.uid()
  ));

-- Tenant pode inserir/atualizar seus own smart links
CREATE POLICY "Tenant can manage own smart links"
  ON public.article_smart_links FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members
    WHERE user_id = auth.uid()
  ));

-- link_events são públicos para inserção (visitas anônimas)
-- mas leitura só para service_role e via RPCs
CREATE POLICY "Anyone can insert link events"
  ON public.link_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "ServiceRole can manage all link events"
  ON public.link_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Smart links são legíveis publicamente pelo slug (para landing page pública)
CREATE POLICY "Public can view active smart links"
  ON public.article_smart_links FOR SELECT
  TO anon
  USING (is_active = TRUE);

-- Service role acesso total
CREATE POLICY "ServiceRole can manage all smart links"
  ON public.article_smart_links FOR ALL TO service_role
  USING (true) WITH CHECK (true);
