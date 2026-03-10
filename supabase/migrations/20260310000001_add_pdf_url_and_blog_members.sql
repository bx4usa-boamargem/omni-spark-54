-- ============================================================
-- Migração: Adiciona pdf_url em articles + tabela blog_members
-- para suporte a subcontas com acesso aos artigos
-- ============================================================

-- 1. Adicionar coluna pdf_url em articles (referência ao HTML/PDF gerado)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS pdf_url text;

COMMENT ON COLUMN public.articles.pdf_url IS 'URL do eBook HTML gerado pela edge function generate-article-pdf';

-- 2. Criar tabela blog_members para subcontas
CREATE TABLE IF NOT EXISTS public.blog_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id    uuid        NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by uuid        REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (blog_id, user_id)
);

COMMENT ON TABLE public.blog_members IS 'Membros/subcontas com acesso a um blog específico';

CREATE INDEX IF NOT EXISTS idx_blog_members_blog_id ON public.blog_members(blog_id);
CREATE INDEX IF NOT EXISTS idx_blog_members_user_id ON public.blog_members(user_id);

-- 3. RLS em blog_members
ALTER TABLE public.blog_members ENABLE ROW LEVEL SECURITY;

-- Dono do blog gerencia membros
DO $$ BEGIN
  CREATE POLICY "blog_members_owner_manage" ON public.blog_members
    FOR ALL
    USING (
      blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Membro vê sua própria entrada
DO $$ BEGIN
  CREATE POLICY "blog_members_self_read" ON public.blog_members
    FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Atualizar policy de articles para incluir subcontas (blog_members)
--    Remove a policy antiga e recria incluindo membros
DROP POLICY IF EXISTS "articles_owner" ON public.articles;

DO $$ BEGIN
  CREATE POLICY "articles_owner_or_member" ON public.articles
    FOR ALL
    USING (
      blog_id IN (
        -- Dono direto do blog
        SELECT id FROM public.blogs WHERE user_id = auth.uid()
        UNION
        -- Subconta com acesso ao blog
        SELECT blog_id FROM public.blog_members WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Atualizar policy de ebook_views para incluir subcontas
DROP POLICY IF EXISTS "ebook_views_owner" ON public.ebook_views;

DO $$ BEGIN
  CREATE POLICY "ebook_views_owner_or_member" ON public.ebook_views
    FOR ALL
    USING (
      blog_id IN (
        SELECT id FROM public.blogs WHERE user_id = auth.uid()
        UNION
        SELECT blog_id FROM public.blog_members WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Subcontas admin podem atualizar o blog
DO $$ BEGIN
  CREATE POLICY "blogs_member_admin_write" ON public.blogs
    FOR UPDATE
    USING (
      id IN (
        SELECT blog_id FROM public.blog_members
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
