-- ============================================================
-- OMNISEEN — PUBLICAR ARTIGOS DA BIONE ADVOCACIA (Staging)
-- Execute este SQL no Supabase Studio:
-- https://supabase.com/dashboard/project/oxbrvyinmpbkllicaxqk/editor
-- ============================================================

-- 1. Ver artigos atuais da Bione
SELECT id, slug, title, status, blog_id, created_at
FROM articles
WHERE blog_id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd'
ORDER BY created_at;

-- 2. Publicar todos os artigos da Bione que estiverem em draft/staged
UPDATE articles
SET 
  status = 'published',
  published_at = COALESCE(published_at, NOW())
WHERE 
  blog_id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd'
  AND status IN ('draft', 'staged');

-- 3. Confirmar publicação
SELECT id, slug, title, status, published_at
FROM articles
WHERE blog_id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd'
ORDER BY created_at;
