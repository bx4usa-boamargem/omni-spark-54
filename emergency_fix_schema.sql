-- ============================================================================
-- OMNISEEN — EMERGENCY SCHEMA FIX (CONSOLIDATED)
-- Data: 2026-03-07
-- Objetivo: Restaurar tabelas vitais no projeto Supabase ativo (opbnkyez...)
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ESCOPO: CORE MAPPING / USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'platform_admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 2. ESCOPO: BLOGS & BUSINESS
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  primary_color TEXT DEFAULT '#1e3a5f',
  secondary_color TEXT DEFAULT '#b8922a',
  cta_type TEXT DEFAULT 'whatsapp',
  cta_url TEXT,
  cta_text TEXT DEFAULT 'Falar com consultor',
  platform_subdomain TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  brand_description TEXT,
  integration_type TEXT DEFAULT 'subdomain',
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE UNIQUE,
  niche TEXT,
  target_audience TEXT,
  tone_of_voice TEXT DEFAULT 'authoritative',
  pain_points TEXT[],
  desires TEXT[],
  brand_keywords TEXT[],
  company_name TEXT,
  language TEXT DEFAULT 'pt-BR',
  country TEXT DEFAULT 'Brasil',
  long_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ESCOPO: CONTENT ENGINE (ARTICLES & CLUSTERS)
CREATE TABLE IF NOT EXISTS public.content_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pillar_keyword TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  meta_description TEXT,
  category TEXT,
  keywords TEXT[],
  tags TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  generation_source TEXT DEFAULT 'article-engine-v2',
  faq JSONB DEFAULT '[]'::jsonb,
  reading_time INT,
  view_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blog_id, slug)
);

CREATE TABLE IF NOT EXISTS public.cluster_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES public.content_clusters(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  suggested_title TEXT,
  suggested_keywords TEXT[],
  is_pillar BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'planned'
);

CREATE TABLE IF NOT EXISTS public.article_internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  target_article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  anchor_text TEXT NOT NULL,
  inserted_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ESCOPO: GENERATION INFRA (JOBS & STEPS)
CREATE TYPE public.generation_job_type AS ENUM ('article', 'super_page');
CREATE TYPE public.generation_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE public.generation_step_name AS ENUM (
  'INPUT_VALIDATION', 'SERP_ANALYSIS', 'ENTITY_EXTRACTION', 'SERP_GAP_ANALYSIS',
  'OUTLINE_GEN', 'CONTENT_GEN', 'IMAGE_GEN', 'SEO_SCORE', 'META_GEN', 'OUTPUT'
);

CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  job_type generation_job_type NOT NULL DEFAULT 'article',
  status generation_job_status NOT NULL DEFAULT 'pending',
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  total_api_calls INT DEFAULT 0,
  error_message TEXT,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  public_stage TEXT,
  public_progress INT DEFAULT 0,
  public_message TEXT,
  public_updated_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input JSONB,
  output JSONB,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ESCOPO: RADAR V3 (INTELLIGENCE)
CREATE TABLE IF NOT EXISTS public.radar_v3_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  opportunities_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.radar_v3_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.radar_v3_runs(id) ON DELETE CASCADE,
  blog_id UUID NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  title TEXT NOT NULL,
  confidence_score INT CHECK (confidence_score BETWEEN 0 AND 100),
  why_now TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'generating', 'converted', 'archived', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.radar_v3_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.radar_v3_runs(id) ON DELETE CASCADE,
  level TEXT CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_update_blogs BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER tr_update_articles BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER tr_update_jobs BEFORE UPDATE ON public.generation_jobs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- RLS (ENABLE BUT OPEN FOR CONTEXT)
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to authenticated" ON public.blogs TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON public.articles TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON public.generation_jobs TO authenticated USING (true);
CREATE POLICY "Service Role full access" ON public.generation_jobs TO service_role USING (true) WITH CHECK (true);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
