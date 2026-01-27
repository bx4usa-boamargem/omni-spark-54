-- ============================================
-- FASE 1: CORREÇÃO DA VIEW COM SECURITY INVOKER
-- ============================================

-- Recriar a view cms_integrations_decrypted com security_invoker=on
DROP VIEW IF EXISTS public.cms_integrations_decrypted;

CREATE VIEW public.cms_integrations_decrypted
WITH (security_invoker=on) AS
SELECT 
  id, blog_id, platform, site_url, auth_type, wordpress_site_id,
  COALESCE(decrypt_credential(api_key_encrypted, blog_id), api_key) AS api_key,
  COALESCE(decrypt_credential(api_secret_encrypted, blog_id), api_secret) AS api_secret,
  decrypt_credential(access_token_encrypted, blog_id) AS access_token,
  decrypt_credential(refresh_token_encrypted, blog_id) AS refresh_token,
  token_expires_at, username, is_active, auto_publish,
  last_sync_at, last_sync_status, created_at, updated_at
FROM cms_integrations;

-- ============================================
-- FASE 2: CORREÇÃO DAS FUNÇÕES COM SEARCH PATH
-- ============================================

-- 1. check_article_rate_limit (SECURITY DEFINER - CRÍTICO)
CREATE OR REPLACE FUNCTION public.check_article_rate_limit(p_blog_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 2. generate_platform_subdomain
CREATE OR REPLACE FUNCTION public.generate_platform_subdomain()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.platform_subdomain IS NULL AND NEW.slug IS NOT NULL THEN
    NEW.platform_subdomain := NEW.slug || '.omniseen.app';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. update_niche_profiles_updated_at
CREATE OR REPLACE FUNCTION public.update_niche_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. update_tenant_domains_updated_at
CREATE OR REPLACE FUNCTION public.update_tenant_domains_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================
-- FASE 3: CORREÇÃO DAS POLÍTICAS RLS
-- ============================================

-- article_broken_links
DROP POLICY IF EXISTS "Service role can manage all broken links" ON article_broken_links;
CREATE POLICY "Service role can manage all broken links" 
ON article_broken_links FOR ALL 
TO service_role
USING (true) WITH CHECK (true);

-- article_content_scores
DROP POLICY IF EXISTS "Service role can manage content scores" ON article_content_scores;
CREATE POLICY "Service role can manage content scores" 
ON article_content_scores FOR ALL 
TO service_role
USING (true) WITH CHECK (true);

-- blog_feature_flags
DROP POLICY IF EXISTS "Service role full access to blog_feature_flags" ON blog_feature_flags;
CREATE POLICY "Service role full access to blog_feature_flags" 
ON blog_feature_flags FOR ALL 
TO service_role
USING (true) WITH CHECK (true);

-- generation_rate_limits
DROP POLICY IF EXISTS "Service role can manage rate limits" ON generation_rate_limits;
CREATE POLICY "Service role can manage rate limits" 
ON generation_rate_limits FOR ALL 
TO service_role
USING (true) WITH CHECK (true);

-- score_change_log (remove duplicates first)
DROP POLICY IF EXISTS "Service role full access to score_change_log" ON score_change_log;
DROP POLICY IF EXISTS "Service role can insert score changes" ON score_change_log;
CREATE POLICY "Service role can manage score changes" 
ON score_change_log FOR ALL 
TO service_role
USING (true) WITH CHECK (true);

-- seo_weekly_reports
DROP POLICY IF EXISTS "Service role can manage SEO reports" ON seo_weekly_reports;
CREATE POLICY "Service role can manage SEO reports" 
ON seo_weekly_reports FOR ALL 
TO service_role
USING (true) WITH CHECK (true);

-- serp_analysis_cache
DROP POLICY IF EXISTS "Service role can manage SERP analysis" ON serp_analysis_cache;
CREATE POLICY "Service role can manage SERP analysis" 
ON serp_analysis_cache FOR ALL 
TO service_role
USING (true) WITH CHECK (true);

-- automation_notifications
DROP POLICY IF EXISTS "System can insert notifications" ON automation_notifications;
CREATE POLICY "Service role can insert notifications" 
ON automation_notifications FOR INSERT 
TO service_role
WITH CHECK (true);

-- cms_credential_access_log
DROP POLICY IF EXISTS "Service role can insert audit logs" ON cms_credential_access_log;
CREATE POLICY "Service role can insert audit logs" 
ON cms_credential_access_log FOR INSERT 
TO service_role
WITH CHECK (true);

-- consumption_logs
DROP POLICY IF EXISTS "System can insert consumption" ON consumption_logs;
CREATE POLICY "Service role can insert consumption" 
ON consumption_logs FOR INSERT 
TO service_role
WITH CHECK (true);

-- email_logs
DROP POLICY IF EXISTS "Service role can insert email logs" ON email_logs;
CREATE POLICY "Service role can insert email logs" 
ON email_logs FOR INSERT 
TO service_role
WITH CHECK (true);

-- niche_guard_logs
DROP POLICY IF EXISTS "Service role can insert niche guard logs" ON niche_guard_logs;
CREATE POLICY "Service role can insert niche guard logs" 
ON niche_guard_logs FOR INSERT 
TO service_role
WITH CHECK (true);

-- user_achievements
DROP POLICY IF EXISTS "Service role can insert achievements" ON user_achievements;
CREATE POLICY "Service role can insert achievements" 
ON user_achievements FOR INSERT 
TO service_role
WITH CHECK (true);

-- brand_agent_conversations (UPDATE policy)
DROP POLICY IF EXISTS "Service role can update conversations" ON brand_agent_conversations;
CREATE POLICY "Service role can update conversations" 
ON brand_agent_conversations FOR UPDATE 
TO service_role
USING (true) WITH CHECK (true);