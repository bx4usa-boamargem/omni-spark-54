-- ============================================================
-- Smart Links: tabelas e RPC de estatísticas
-- Migration: 20260122_create_smart_links_tables.sql
-- ============================================================

-- 1. Tabela principal de smart links rastreados
CREATE TABLE IF NOT EXISTS public.article_smart_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  blog_id       uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  description   text,
  image_url     text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS article_smart_links_article_id_idx ON public.article_smart_links(article_id);
CREATE INDEX IF NOT EXISTS article_smart_links_blog_id_idx    ON public.article_smart_links(blog_id);
CREATE INDEX IF NOT EXISTS article_smart_links_slug_idx       ON public.article_smart_links(slug);

-- 2. Visitas aos smart links (rastreamento de tráfego)
CREATE TABLE IF NOT EXISTS public.smart_link_visits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id  uuid NOT NULL REFERENCES public.article_smart_links(id) ON DELETE CASCADE,
  referrer       text,
  user_agent     text,
  ip_address     inet,
  visited_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS smart_link_visits_link_id_idx  ON public.smart_link_visits(smart_link_id);
CREATE INDEX IF NOT EXISTS smart_link_visits_visited_idx  ON public.smart_link_visits(visited_at);

-- 3. Curtidas nos smart links (uma por sessão)
CREATE TABLE IF NOT EXISTS public.smart_link_likes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smart_link_id  uuid NOT NULL REFERENCES public.article_smart_links(id) ON DELETE CASCADE,
  session_id     text NOT NULL,
  liked_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (smart_link_id, session_id)
);

CREATE INDEX IF NOT EXISTS smart_link_likes_link_id_idx ON public.smart_link_likes(smart_link_id);

-- 4. RPC: estatísticas agregadas de um link
CREATE OR REPLACE FUNCTION public.get_link_stats(p_smart_link_id uuid)
RETURNS TABLE (total_visits bigint, total_likes bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    (SELECT COUNT(*) FROM public.smart_link_visits WHERE smart_link_id = p_smart_link_id) AS total_visits,
    (SELECT COUNT(*) FROM public.smart_link_likes  WHERE smart_link_id = p_smart_link_id) AS total_likes;
$$;

-- 5. Row Level Security
ALTER TABLE public.article_smart_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_link_visits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_link_likes    ENABLE ROW LEVEL SECURITY;

-- Links: leitura pública de links ativos
DROP POLICY IF EXISTS "public_read_active_links" ON public.article_smart_links;
CREATE POLICY "public_read_active_links" ON public.article_smart_links
  FOR SELECT USING (is_active = true);

-- Links: dono do blog pode criar/editar/deletar seus links
DROP POLICY IF EXISTS "owner_manage_links" ON public.article_smart_links;
CREATE POLICY "owner_manage_links" ON public.article_smart_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.blogs b
      WHERE b.id = article_smart_links.blog_id
        AND b.user_id = auth.uid()
    )
  );

-- Visitas: qualquer visitor pode inserir
DROP POLICY IF EXISTS "anyone_insert_visit" ON public.smart_link_visits;
CREATE POLICY "anyone_insert_visit" ON public.smart_link_visits
  FOR INSERT WITH CHECK (true);

-- Visitas: dono do blog pode ler
DROP POLICY IF EXISTS "owner_read_visits" ON public.smart_link_visits;
CREATE POLICY "owner_read_visits" ON public.smart_link_visits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.article_smart_links sl
      JOIN public.blogs b ON b.id = sl.blog_id
      WHERE sl.id = smart_link_visits.smart_link_id
        AND b.user_id = auth.uid()
    )
  );

-- Curtidas: qualquer um pode inserir
DROP POLICY IF EXISTS "anyone_insert_like" ON public.smart_link_likes;
CREATE POLICY "anyone_insert_like" ON public.smart_link_likes
  FOR INSERT WITH CHECK (true);

-- Curtidas: dono do blog pode ler
DROP POLICY IF EXISTS "owner_read_likes" ON public.smart_link_likes;
CREATE POLICY "owner_read_likes" ON public.smart_link_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.article_smart_links sl
      JOIN public.blogs b ON b.id = sl.blog_id
      WHERE sl.id = smart_link_likes.smart_link_id
        AND b.user_id = auth.uid()
    )
  );

-- 6. Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_smart_link_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS smart_link_updated_at ON public.article_smart_links;
CREATE TRIGGER smart_link_updated_at
  BEFORE UPDATE ON public.article_smart_links
  FOR EACH ROW EXECUTE FUNCTION public.set_smart_link_updated_at();
