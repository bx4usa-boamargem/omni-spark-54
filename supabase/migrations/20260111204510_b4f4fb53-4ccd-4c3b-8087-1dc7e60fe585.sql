-- ============================================================
-- LIMPEZA E PROTEÇÃO CONTRA DUPLICAÇÃO EM MASSA
-- ============================================================

-- 1. CRIAR TABELA DE RATE LIMIT PARA GERAÇÃO DE ARTIGOS
CREATE TABLE IF NOT EXISTS public.generation_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blog_id, user_id)
);

-- Enable RLS
ALTER TABLE public.generation_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Service role can manage, users can read their own
CREATE POLICY "Service role can manage rate limits"
ON public.generation_rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- 2. CRIAR FUNÇÃO DE VERIFICAÇÃO DE RATE LIMIT (5 artigos por minuto)
CREATE OR REPLACE FUNCTION public.check_article_rate_limit(p_blog_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMP;
BEGIN
  SELECT requests_count, window_start INTO v_count, v_window_start
  FROM public.generation_rate_limits
  WHERE blog_id = p_blog_id AND user_id = p_user_id;
  
  -- Reset window if more than 1 minute passed
  IF v_window_start IS NULL OR (NOW() - v_window_start) > INTERVAL '1 minute' THEN
    INSERT INTO public.generation_rate_limits (blog_id, user_id, requests_count, window_start)
    VALUES (p_blog_id, p_user_id, 1, NOW())
    ON CONFLICT (blog_id, user_id) 
    DO UPDATE SET requests_count = 1, window_start = NOW();
    RETURN TRUE;
  END IF;
  
  -- Block if exceeded 5 requests per minute
  IF v_count >= 5 THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  UPDATE public.generation_rate_limits 
  SET requests_count = requests_count + 1
  WHERE blog_id = p_blog_id AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. LIMPEZA DE ARTIGOS DUPLICADOS (blog específico com 5.173 duplicados)
-- Criar tabela temporária com artigos a MANTER (1 por título, o mais antigo)
DO $$
DECLARE
  v_blog_id UUID := '0de4b7a1-58ef-4d09-8ebf-89f47e986861';
  v_deleted_count INTEGER;
BEGIN
  -- Criar tabela temp com IDs únicos a manter
  CREATE TEMP TABLE articles_to_keep AS
  SELECT DISTINCT ON (blog_id, title) id
  FROM public.articles
  WHERE blog_id = v_blog_id
  ORDER BY blog_id, title, created_at ASC;

  -- Deletar duplicados
  DELETE FROM public.articles
  WHERE blog_id = v_blog_id
    AND id NOT IN (SELECT id FROM articles_to_keep);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate articles from blog %', v_deleted_count, v_blog_id;
  
  -- Limpar tabela temporária
  DROP TABLE articles_to_keep;
END $$;