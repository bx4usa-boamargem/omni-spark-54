-- ============================================================
-- Migration: Permanent removal of Internal Link Engine
-- Date: 2026-03-01
-- Purpose: Drop article_internal_links table and internal_links column from articles
-- ============================================================

-- Drop policies first
DROP POLICY IF EXISTS "Users can create links for their articles" ON public.article_internal_links;
DROP POLICY IF EXISTS "Users can delete their own article links" ON public.article_internal_links;
DROP POLICY IF EXISTS "Users can view their own article links" ON public.article_internal_links;

-- Drop the table
DROP TABLE IF EXISTS public.article_internal_links CASCADE;

-- Drop the column from articles
ALTER TABLE public.articles DROP COLUMN IF EXISTS internal_links;

-- Safety: Drop any other internal link related tables that might exist
DROP TABLE IF EXISTS public.internal_links CASCADE;
DROP TABLE IF EXISTS public.link_suggestions CASCADE;
DROP TABLE IF EXISTS public.link_graph CASCADE;
DROP TABLE IF EXISTS public.semantic_links CASCADE;
