CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'self_registered',
    'internal_team',
    'client_free',
    'client_paid'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'platform_admin',
    'staff_finance',
    'staff_content',
    'staff_support'
);


--
-- Name: subscription_plan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_plan AS ENUM (
    'free',
    'essential',
    'plus',
    'scale',
    'internal'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'trialing',
    'canceled',
    'past_due',
    'incomplete'
);


--
-- Name: auto_create_subscription_on_blog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_create_subscription_on_blog() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Só cria se não existir subscription para este user_id
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at, current_period_start, current_period_end)
  SELECT 
    NEW.user_id,
    'essential'::subscription_plan,
    'trialing'::subscription_status,
    now() + interval '7 days',
    now(),
    now() + interval '7 days'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE user_id = NEW.user_id
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: calculate_payment_due_date(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_payment_due_date(start_date timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  business_days INTEGER := 0;
  current_date_check TIMESTAMP WITH TIME ZONE := start_date;
BEGIN
  WHILE business_days < 15 LOOP
    current_date_check := current_date_check + INTERVAL '1 day';
    IF EXTRACT(DOW FROM current_date_check) NOT IN (0, 6) THEN
      business_days := business_days + 1;
    END IF;
  END LOOP;
  RETURN current_date_check;
END;
$$;


--
-- Name: generate_platform_subdomain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_platform_subdomain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.platform_subdomain IS NULL AND NEW.slug IS NOT NULL THEN
    NEW.platform_subdomain := NEW.slug || '.omniseen.app';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS character varying
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code VARCHAR(6) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_share_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_share_count(article_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.articles 
  SET share_count = COALESCE(share_count, 0) + 1 
  WHERE id = article_id;
END;
$$;


--
-- Name: increment_view_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_view_count(article_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.articles 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = article_id;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_alert_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_alert_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid,
    triggered_at timestamp with time zone DEFAULT now(),
    actual_cost numeric(10,6) NOT NULL,
    threshold_cost numeric(10,2) NOT NULL,
    message text
);


--
-- Name: admin_cost_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_cost_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    threshold_usd numeric(10,2) NOT NULL,
    notification_email text,
    is_active boolean DEFAULT true,
    last_triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admin_cost_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'per_user'::text])))
);


--
-- Name: admin_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_type text NOT NULL,
    target_value numeric NOT NULL,
    period_type text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: ai_content_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_content_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_type text NOT NULL,
    content_hash text NOT NULL,
    prompt_text text,
    response_data jsonb NOT NULL,
    model_used text,
    tokens_saved integer DEFAULT 0,
    cost_saved_usd numeric(10,6) DEFAULT 0,
    hits integer DEFAULT 0,
    blog_id uuid,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


--
-- Name: article_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    blog_id uuid NOT NULL,
    session_id text NOT NULL,
    visitor_id text,
    read_percentage integer DEFAULT 0,
    time_on_page integer DEFAULT 0,
    scroll_depth integer DEFAULT 0,
    source text DEFAULT 'direct'::text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    country text,
    device text,
    browser text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    scroll_positions jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT article_analytics_read_percentage_check CHECK (((read_percentage >= 0) AND (read_percentage <= 100))),
    CONSTRAINT article_analytics_scroll_depth_check CHECK (((scroll_depth >= 0) AND (scroll_depth <= 100)))
);


--
-- Name: article_internal_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_internal_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_article_id uuid NOT NULL,
    target_article_id uuid NOT NULL,
    anchor_text text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now()
);


--
-- Name: article_opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_opportunities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    suggested_title text NOT NULL,
    suggested_keywords text[] DEFAULT '{}'::text[],
    suggested_outline jsonb,
    status text DEFAULT 'pending'::text,
    source text DEFAULT 'ai'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    relevance_score integer DEFAULT 0,
    relevance_factors jsonb DEFAULT '{}'::jsonb,
    trend_source text,
    converted_article_id uuid,
    converted_at timestamp with time zone
);


--
-- Name: article_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    suggested_theme text NOT NULL,
    keywords text[],
    status text DEFAULT 'pending'::text,
    scheduled_for timestamp with time zone,
    article_id uuid,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    generation_source text,
    persona_id uuid,
    funnel_stage text,
    chunk_content text
);


--
-- Name: article_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    language_code text NOT NULL,
    title text NOT NULL,
    excerpt text,
    content text,
    meta_description text,
    faq jsonb,
    translated_at timestamp with time zone DEFAULT now(),
    translated_by text DEFAULT 'ai'::text,
    is_reviewed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: article_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    version_number integer DEFAULT 1 NOT NULL,
    title text NOT NULL,
    content text,
    excerpt text,
    meta_description text,
    keywords text[],
    faq jsonb,
    change_type text NOT NULL,
    change_description text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text,
    excerpt text,
    featured_image_url text,
    category text,
    keywords text[],
    meta_description text,
    faq jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'draft'::text,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    content_images jsonb DEFAULT '[]'::jsonb,
    highlights jsonb DEFAULT '[]'::jsonb,
    mini_case jsonb,
    reading_time integer,
    view_count integer DEFAULT 0,
    share_count integer DEFAULT 0,
    scheduled_at timestamp with time zone,
    featured_image_alt text,
    tags text[],
    approved_at timestamp with time zone,
    approved_by uuid,
    social_share_count jsonb DEFAULT '{}'::jsonb,
    generation_source text DEFAULT 'manual'::text,
    funnel_stage text,
    target_persona_id uuid,
    external_post_id text,
    external_post_url text,
    CONSTRAINT articles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: blog_automation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_automation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    is_active boolean DEFAULT false,
    frequency text DEFAULT 'weekly'::text,
    articles_per_period integer DEFAULT 1,
    preferred_days text[] DEFAULT '{monday}'::text[],
    preferred_time time without time zone DEFAULT '09:00:00'::time without time zone,
    auto_publish boolean DEFAULT true,
    niche_keywords text[],
    tone text DEFAULT 'friendly'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    generate_images boolean DEFAULT true
);


--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: blog_traffic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_traffic (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    date date NOT NULL,
    direct_visits integer DEFAULT 0,
    organic_visits integer DEFAULT 0,
    social_visits integer DEFAULT 0,
    email_visits integer DEFAULT 0,
    referral_visits integer DEFAULT 0,
    total_visits integer DEFAULT 0,
    unique_visitors integer DEFAULT 0,
    avg_time_on_site integer DEFAULT 0,
    bounce_rate numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blogs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blogs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    logo_url text,
    primary_color text DEFAULT '#6366f1'::text,
    secondary_color text DEFAULT '#8b5cf6'::text,
    cta_type text DEFAULT 'link'::text,
    cta_url text,
    cta_text text DEFAULT 'Saiba mais'::text,
    banner_title text,
    banner_description text,
    author_name text,
    author_photo_url text,
    author_bio text,
    author_linkedin text,
    onboarding_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_domain text,
    domain_verified boolean DEFAULT false,
    domain_verification_token text,
    favicon_url text,
    logo_negative_url text,
    layout_template text DEFAULT 'modern'::text,
    seasonal_template text,
    seasonal_template_expires_at timestamp with time zone,
    theme_mode text DEFAULT 'auto'::text,
    dark_primary_color text,
    dark_secondary_color text,
    color_palette jsonb DEFAULT '{}'::jsonb,
    banner_image_url text,
    banner_mobile_image_url text,
    banner_link_url text,
    banner_enabled boolean DEFAULT true,
    script_head text,
    script_body text,
    script_footer text,
    tracking_config jsonb DEFAULT '{}'::jsonb,
    brand_description text,
    footer_text text,
    show_powered_by boolean DEFAULT true,
    integration_type text DEFAULT 'subdomain'::text,
    platform_subdomain text,
    tenant_id uuid,
    CONSTRAINT blogs_cta_type_check CHECK ((cta_type = ANY (ARRAY['link'::text, 'whatsapp'::text])))
);


--
-- Name: business_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    niche text,
    target_audience text,
    tone_of_voice text DEFAULT 'friendly'::text,
    pain_points text[],
    desires text[],
    brand_keywords text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_name text,
    default_template_id uuid,
    project_name text,
    language text DEFAULT 'pt-BR'::text,
    country text DEFAULT 'Brasil'::text,
    long_description text,
    concepts text[] DEFAULT '{}'::text[],
    is_library_enabled boolean DEFAULT false
);


--
-- Name: chat_article_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_article_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    user_id uuid NOT NULL,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    current_input text DEFAULT ''::text,
    is_ready_to_generate boolean DEFAULT false,
    generated_article jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    blog_id uuid NOT NULL,
    share_token text NOT NULL,
    client_name text,
    client_email text,
    status text DEFAULT 'pending'::text,
    comments jsonb DEFAULT '[]'::jsonb,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


--
-- Name: cluster_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cluster_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cluster_id uuid NOT NULL,
    article_id uuid,
    suggested_title text,
    suggested_keywords text[],
    is_pillar boolean DEFAULT false,
    internal_links jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'planned'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cms_integrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_integrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    platform text NOT NULL,
    site_url text NOT NULL,
    api_key text,
    api_secret text,
    username text,
    is_active boolean DEFAULT true,
    auto_publish boolean DEFAULT false,
    last_sync_at timestamp with time zone,
    last_sync_status text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cms_integrations_platform_check CHECK ((platform = ANY (ARRAY['wordpress'::text, 'wix'::text, 'webflow'::text, 'custom'::text])))
);


--
-- Name: cms_publish_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_publish_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    action text NOT NULL,
    external_id text,
    external_url text,
    status text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT cms_publish_logs_action_check CHECK ((action = ANY (ARRAY['create'::text, 'update'::text, 'delete'::text]))),
    CONSTRAINT cms_publish_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'error'::text])))
);


--
-- Name: competitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    favicon_url text,
    top_articles integer DEFAULT 0,
    keywords_ranked integer DEFAULT 0,
    monthly_clicks integer DEFAULT 0,
    traffic_value_brl numeric(12,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: consumption_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumption_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    blog_id uuid,
    action_type text NOT NULL,
    action_description text,
    model_used text,
    input_tokens integer DEFAULT 0,
    output_tokens integer DEFAULT 0,
    images_generated integer DEFAULT 0,
    estimated_cost_usd numeric(10,6) DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: content_clusters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_clusters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    name text NOT NULL,
    pillar_keyword text NOT NULL,
    description text,
    status text DEFAULT 'planning'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    use_ai_images boolean DEFAULT true,
    use_stock_images boolean DEFAULT false,
    use_own_images boolean DEFAULT false,
    default_word_count integer DEFAULT 1000,
    image_style text DEFAULT 'photorealistic'::text,
    writing_style text DEFAULT 'informative'::text,
    competitor_citation text DEFAULT 'never'::text,
    default_instructions text,
    grammatical_person text DEFAULT 'first'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    mention_project boolean DEFAULT false,
    use_external_data boolean DEFAULT false,
    include_faq boolean DEFAULT true,
    auto_approve boolean DEFAULT false,
    post_interval_hours integer DEFAULT 24,
    anticipate_scheduling boolean DEFAULT false,
    primary_color text DEFAULT '#7c3aed'::text,
    primary_color_light text DEFAULT '#a78bfa'::text,
    cta_text text DEFAULT 'Leia o post inteiro através do link na bio'::text,
    ai_model_text text DEFAULT 'google/gemini-2.5-flash'::text,
    ai_model_image text DEFAULT 'google/gemini-2.5-flash-image-preview'::text
);


--
-- Name: custom_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ebook_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ebook_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ebook_id uuid NOT NULL,
    blog_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    whatsapp text,
    source text DEFAULT 'landing_page'::text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    ip_address text,
    user_agent text,
    downloaded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ebooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ebooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    source_article_id uuid,
    title text NOT NULL,
    status text DEFAULT 'draft'::text,
    word_count_target integer DEFAULT 1200,
    content text,
    cover_image_url text,
    content_images jsonb DEFAULT '[]'::jsonb,
    author text,
    logo_url text,
    light_color text DEFAULT '#f8fafc'::text,
    accent_color text DEFAULT '#6366f1'::text,
    cta_title text,
    cta_body text,
    cta_button_text text,
    cta_button_link text,
    pdf_url text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    slug text,
    is_public boolean DEFAULT false,
    access_type text DEFAULT 'private'::text,
    view_count integer DEFAULT 0,
    download_count integer DEFAULT 0,
    landing_page_description text,
    require_email boolean DEFAULT true,
    require_whatsapp boolean DEFAULT false,
    show_author boolean DEFAULT true,
    custom_thank_you_message text,
    CONSTRAINT ebooks_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'generating'::text, 'ready'::text, 'error'::text])))
);


--
-- Name: editorial_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.editorial_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    name text NOT NULL,
    is_default boolean DEFAULT false,
    target_niche text,
    content_focus text,
    mandatory_structure jsonb DEFAULT '[]'::jsonb,
    title_guidelines text,
    tone_rules text,
    seo_settings jsonb DEFAULT '{}'::jsonb,
    cta_template text,
    image_guidelines jsonb DEFAULT '{}'::jsonb,
    category_default text,
    company_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    to_email text NOT NULL,
    to_name text,
    template text NOT NULL,
    subject text,
    language text DEFAULT 'pt-BR'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    brevo_message_id text,
    error_message text,
    variables jsonb,
    blog_id uuid,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: funnel_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funnel_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid,
    article_id uuid,
    session_id text NOT NULL,
    visitor_id text,
    event_type text NOT NULL,
    event_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: funnel_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funnel_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    stage text NOT NULL,
    target_value integer NOT NULL,
    alert_threshold integer DEFAULT 10,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: gsc_alert_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_alert_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_id uuid,
    blog_id uuid NOT NULL,
    triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    metric_type text NOT NULL,
    query_or_page text,
    previous_value numeric(10,2),
    current_value numeric(10,2),
    change_percent numeric(5,2),
    message text
);


--
-- Name: gsc_analytics_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_analytics_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    date date NOT NULL,
    clicks integer DEFAULT 0,
    impressions integer DEFAULT 0,
    ctr numeric(5,2) DEFAULT 0,
    "position" numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gsc_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    site_url text NOT NULL,
    access_token text,
    refresh_token text,
    token_expires_at timestamp with time zone,
    connected_at timestamp with time zone DEFAULT now(),
    last_sync_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gsc_pages_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_pages_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    page_url text NOT NULL,
    date date NOT NULL,
    clicks integer DEFAULT 0,
    impressions integer DEFAULT 0,
    ctr numeric(5,2) DEFAULT 0,
    "position" numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gsc_queries_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_queries_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    query text NOT NULL,
    date date NOT NULL,
    clicks integer DEFAULT 0,
    impressions integer DEFAULT 0,
    ctr numeric(5,2) DEFAULT 0,
    "position" numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gsc_ranking_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_ranking_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    alert_type text NOT NULL,
    threshold_percent numeric(5,2) DEFAULT 20 NOT NULL,
    is_active boolean DEFAULT true,
    notification_email text,
    last_triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: help_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    content text NOT NULL,
    icon text NOT NULL,
    order_index integer DEFAULT 0,
    is_published boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    header_gif_url text,
    language text DEFAULT 'pt-BR'::text
);


--
-- Name: keyword_analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_analyses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    keyword text NOT NULL,
    search_volume integer,
    difficulty integer,
    suggestions jsonb DEFAULT '[]'::jsonb,
    analyzed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'manual'::text,
    CONSTRAINT keyword_analyses_difficulty_check CHECK (((difficulty >= 0) AND (difficulty <= 100)))
);


--
-- Name: landing_page_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.landing_page_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    visitor_id text,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    page_section text,
    source text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    device text,
    browser text,
    country text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: linking_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linking_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    auto_linking_enabled boolean DEFAULT true,
    sitemap_urls text[] DEFAULT '{}'::text[],
    manual_urls text[] DEFAULT '{}'::text[],
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: model_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_pricing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_name text NOT NULL,
    model_provider text NOT NULL,
    cost_per_1k_input_tokens numeric(10,6) DEFAULT 0 NOT NULL,
    cost_per_1k_output_tokens numeric(10,6) DEFAULT 0 NOT NULL,
    cost_per_image numeric(10,4) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: opportunity_notification_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_notification_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    blog_id uuid NOT NULL,
    user_id uuid NOT NULL,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text,
    sent_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    CONSTRAINT opportunity_notification_history_notification_type_check CHECK ((notification_type = ANY (ARRAY['in_app'::text, 'email'::text])))
);


--
-- Name: opportunity_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    user_id uuid NOT NULL,
    min_relevance_score integer DEFAULT 80,
    notify_in_app boolean DEFAULT true,
    notify_email boolean DEFAULT false,
    email_address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    name text NOT NULL,
    age_range text,
    profession text,
    goals text[],
    challenges text[],
    preferred_channels text[],
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    problems text[] DEFAULT '{}'::text[],
    solutions text[] DEFAULT '{}'::text[],
    objections text[] DEFAULT '{}'::text[]
);


--
-- Name: plan_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan public.subscription_plan NOT NULL,
    blogs_limit integer DEFAULT 1 NOT NULL,
    articles_per_month integer DEFAULT 3 NOT NULL,
    keywords_limit integer DEFAULT 10 NOT NULL,
    team_members integer DEFAULT 1 NOT NULL,
    monthly_price_brl numeric(10,2) DEFAULT 0 NOT NULL,
    yearly_price_brl numeric(10,2) DEFAULT 0 NOT NULL,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_domain_enabled boolean DEFAULT false
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    onboarding_progress jsonb DEFAULT '{"articles": false, "keywords": false, "strategy": false, "analytics": false, "dashboard": false}'::jsonb,
    phone text,
    referral_source text,
    user_type text,
    blog_objective text,
    preferred_language text DEFAULT 'pt-BR'::text
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reading_goal_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reading_goal_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid,
    user_id uuid NOT NULL,
    current_value integer NOT NULL,
    article_id uuid,
    message text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: reading_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reading_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid,
    user_id uuid NOT NULL,
    metric_type text NOT NULL,
    target_value integer NOT NULL,
    alert_threshold integer NOT NULL,
    notify_in_app boolean DEFAULT true,
    notify_email boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reading_goals_metric_type_check CHECK ((metric_type = ANY (ARRAY['scroll_depth'::text, 'read_rate'::text, 'time_on_page'::text, 'cta_rate'::text])))
);


--
-- Name: referral_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_id uuid NOT NULL,
    referred_user_id uuid NOT NULL,
    subscription_id character varying(255),
    subscription_plan character varying(100),
    subscription_amount_cents integer NOT NULL,
    commission_amount_cents integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    converted_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_due_date timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referral_conversions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'paid'::character varying])::text[])))
);


--
-- Name: referral_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    commission_percentage integer DEFAULT 40 NOT NULL,
    payment_deadline_days integer DEFAULT 15 NOT NULL,
    is_program_active boolean DEFAULT true NOT NULL,
    minimum_payout_cents integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT referral_settings_commission_percentage_check CHECK (((commission_percentage >= 1) AND (commission_percentage <= 100))),
    CONSTRAINT referral_settings_minimum_payout_cents_check CHECK ((minimum_payout_cents >= 0)),
    CONSTRAINT referral_settings_payment_deadline_days_check CHECK (((payment_deadline_days >= 1) AND (payment_deadline_days <= 60)))
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_user_id uuid NOT NULL,
    referral_code character varying(10) NOT NULL,
    click_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: section_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    article_id uuid,
    session_id text NOT NULL,
    section_id text NOT NULL,
    section_title text NOT NULL,
    section_index integer NOT NULL,
    time_in_view integer DEFAULT 0,
    entered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan public.subscription_plan DEFAULT 'free'::public.subscription_plan NOT NULL,
    status public.subscription_status DEFAULT 'trialing'::public.subscription_status NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    trial_ends_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    canceled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_internal_account boolean DEFAULT false,
    created_by_admin uuid,
    internal_notes text,
    account_type public.account_type DEFAULT 'self_registered'::public.account_type,
    billing_required boolean DEFAULT true,
    tenant_id uuid
);


--
-- Name: team_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource_type text,
    resource_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'viewer'::text NOT NULL,
    invited_by uuid,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_invites_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'editor'::text, 'viewer'::text])))
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    user_id uuid NOT NULL,
    invited_by uuid,
    role text DEFAULT 'viewer'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'viewer'::text]))),
    CONSTRAINT team_members_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'revoked'::text])))
);


--
-- Name: template_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    template_id text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    views integer DEFAULT 0,
    clicks integer DEFAULT 0,
    cta_clicks integer DEFAULT 0,
    avg_time_on_page numeric DEFAULT 0,
    bounce_rate numeric DEFAULT 0,
    conversions integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenant_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    invited_by uuid,
    invited_at timestamp with time zone,
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tenant_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text, 'viewer'::text])))
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    owner_user_id uuid,
    plan public.subscription_plan DEFAULT 'essential'::public.subscription_plan,
    status text DEFAULT 'active'::text,
    account_type text DEFAULT 'self_registered'::text,
    billing_required boolean DEFAULT true,
    billing_email text,
    stripe_customer_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    settings jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT tenants_account_type_check CHECK ((account_type = ANY (ARRAY['self_registered'::text, 'internal_team'::text, 'client_free'::text, 'client_paid'::text]))),
    CONSTRAINT tenants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'cancelled'::text])))
);


--
-- Name: usage_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    month date NOT NULL,
    articles_generated integer DEFAULT 0,
    articles_limit integer DEFAULT 30,
    images_generated integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    keywords_used integer DEFAULT 0,
    keywords_limit integer DEFAULT 50,
    ebooks_generated integer DEFAULT 0,
    ebooks_limit integer DEFAULT 0,
    blogs_count integer DEFAULT 0,
    blogs_limit integer DEFAULT 1,
    team_members_count integer DEFAULT 0,
    team_members_limit integer DEFAULT 1
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    blog_id uuid,
    achievement_id text NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now(),
    notified boolean DEFAULT false
);


--
-- Name: user_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid NOT NULL,
    type text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_library_type_check CHECK ((type = ANY (ARRAY['image'::text, 'document'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: weekly_report_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_report_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blog_id uuid,
    user_id uuid NOT NULL,
    is_enabled boolean DEFAULT true,
    email_address text NOT NULL,
    send_day integer DEFAULT 1,
    send_hour integer DEFAULT 9,
    include_performance boolean DEFAULT true,
    include_opportunities boolean DEFAULT true,
    include_recommendations boolean DEFAULT true,
    last_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT weekly_report_settings_send_day_check CHECK (((send_day >= 0) AND (send_day <= 6))),
    CONSTRAINT weekly_report_settings_send_hour_check CHECK (((send_hour >= 0) AND (send_hour <= 23)))
);


--
-- Name: admin_alert_history admin_alert_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_alert_history
    ADD CONSTRAINT admin_alert_history_pkey PRIMARY KEY (id);


--
-- Name: admin_cost_alerts admin_cost_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_cost_alerts
    ADD CONSTRAINT admin_cost_alerts_pkey PRIMARY KEY (id);


--
-- Name: admin_goals admin_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_goals
    ADD CONSTRAINT admin_goals_pkey PRIMARY KEY (id);


--
-- Name: ai_content_cache ai_content_cache_cache_type_content_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_cache
    ADD CONSTRAINT ai_content_cache_cache_type_content_hash_key UNIQUE (cache_type, content_hash);


--
-- Name: ai_content_cache ai_content_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_cache
    ADD CONSTRAINT ai_content_cache_pkey PRIMARY KEY (id);


--
-- Name: article_analytics article_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_analytics
    ADD CONSTRAINT article_analytics_pkey PRIMARY KEY (id);


--
-- Name: article_internal_links article_internal_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_internal_links
    ADD CONSTRAINT article_internal_links_pkey PRIMARY KEY (id);


--
-- Name: article_internal_links article_internal_links_source_article_id_target_article_id__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_internal_links
    ADD CONSTRAINT article_internal_links_source_article_id_target_article_id__key UNIQUE (source_article_id, target_article_id, anchor_text);


--
-- Name: article_opportunities article_opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_opportunities
    ADD CONSTRAINT article_opportunities_pkey PRIMARY KEY (id);


--
-- Name: article_queue article_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_queue
    ADD CONSTRAINT article_queue_pkey PRIMARY KEY (id);


--
-- Name: article_translations article_translations_article_id_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_translations
    ADD CONSTRAINT article_translations_article_id_language_code_key UNIQUE (article_id, language_code);


--
-- Name: article_translations article_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_translations
    ADD CONSTRAINT article_translations_pkey PRIMARY KEY (id);


--
-- Name: article_versions article_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_versions
    ADD CONSTRAINT article_versions_pkey PRIMARY KEY (id);


--
-- Name: articles articles_blog_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_blog_id_slug_key UNIQUE (blog_id, slug);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: blog_automation blog_automation_blog_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_automation
    ADD CONSTRAINT blog_automation_blog_id_key UNIQUE (blog_id);


--
-- Name: blog_automation blog_automation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_automation
    ADD CONSTRAINT blog_automation_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_blog_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_blog_id_slug_key UNIQUE (blog_id, slug);


--
-- Name: blog_categories blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_pkey PRIMARY KEY (id);


--
-- Name: blog_traffic blog_traffic_blog_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_traffic
    ADD CONSTRAINT blog_traffic_blog_id_date_key UNIQUE (blog_id, date);


--
-- Name: blog_traffic blog_traffic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_traffic
    ADD CONSTRAINT blog_traffic_pkey PRIMARY KEY (id);


--
-- Name: blogs blogs_custom_domain_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_custom_domain_unique UNIQUE (custom_domain);


--
-- Name: blogs blogs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_pkey PRIMARY KEY (id);


--
-- Name: blogs blogs_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_slug_key UNIQUE (slug);


--
-- Name: blogs blogs_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_user_id_key UNIQUE (user_id);


--
-- Name: business_profile business_profile_blog_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profile
    ADD CONSTRAINT business_profile_blog_id_key UNIQUE (blog_id);


--
-- Name: business_profile business_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profile
    ADD CONSTRAINT business_profile_pkey PRIMARY KEY (id);


--
-- Name: chat_article_drafts chat_article_drafts_blog_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_article_drafts
    ADD CONSTRAINT chat_article_drafts_blog_id_user_id_key UNIQUE (blog_id, user_id);


--
-- Name: chat_article_drafts chat_article_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_article_drafts
    ADD CONSTRAINT chat_article_drafts_pkey PRIMARY KEY (id);


--
-- Name: client_reviews client_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_reviews
    ADD CONSTRAINT client_reviews_pkey PRIMARY KEY (id);


--
-- Name: client_reviews client_reviews_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_reviews
    ADD CONSTRAINT client_reviews_share_token_key UNIQUE (share_token);


--
-- Name: cluster_articles cluster_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cluster_articles
    ADD CONSTRAINT cluster_articles_pkey PRIMARY KEY (id);


--
-- Name: cms_integrations cms_integrations_blog_id_platform_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_integrations
    ADD CONSTRAINT cms_integrations_blog_id_platform_key UNIQUE (blog_id, platform);


--
-- Name: cms_integrations cms_integrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_integrations
    ADD CONSTRAINT cms_integrations_pkey PRIMARY KEY (id);


--
-- Name: cms_publish_logs cms_publish_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_publish_logs
    ADD CONSTRAINT cms_publish_logs_pkey PRIMARY KEY (id);


--
-- Name: competitors competitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitors
    ADD CONSTRAINT competitors_pkey PRIMARY KEY (id);


--
-- Name: consumption_logs consumption_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumption_logs
    ADD CONSTRAINT consumption_logs_pkey PRIMARY KEY (id);


--
-- Name: content_clusters content_clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_clusters
    ADD CONSTRAINT content_clusters_pkey PRIMARY KEY (id);


--
-- Name: content_preferences content_preferences_blog_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_preferences
    ADD CONSTRAINT content_preferences_blog_id_key UNIQUE (blog_id);


--
-- Name: content_preferences content_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_preferences
    ADD CONSTRAINT content_preferences_pkey PRIMARY KEY (id);


--
-- Name: custom_templates custom_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_templates
    ADD CONSTRAINT custom_templates_pkey PRIMARY KEY (id);


--
-- Name: ebook_leads ebook_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebook_leads
    ADD CONSTRAINT ebook_leads_pkey PRIMARY KEY (id);


--
-- Name: ebooks ebooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebooks
    ADD CONSTRAINT ebooks_pkey PRIMARY KEY (id);


--
-- Name: ebooks ebooks_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebooks
    ADD CONSTRAINT ebooks_slug_key UNIQUE (slug);


--
-- Name: editorial_templates editorial_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.editorial_templates
    ADD CONSTRAINT editorial_templates_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: funnel_events funnel_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funnel_events
    ADD CONSTRAINT funnel_events_pkey PRIMARY KEY (id);


--
-- Name: funnel_goals funnel_goals_blog_id_stage_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funnel_goals
    ADD CONSTRAINT funnel_goals_blog_id_stage_key UNIQUE (blog_id, stage);


--
-- Name: funnel_goals funnel_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funnel_goals
    ADD CONSTRAINT funnel_goals_pkey PRIMARY KEY (id);


--
-- Name: gsc_alert_history gsc_alert_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_alert_history
    ADD CONSTRAINT gsc_alert_history_pkey PRIMARY KEY (id);


--
-- Name: gsc_analytics_history gsc_analytics_history_blog_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_analytics_history
    ADD CONSTRAINT gsc_analytics_history_blog_id_date_key UNIQUE (blog_id, date);


--
-- Name: gsc_analytics_history gsc_analytics_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_analytics_history
    ADD CONSTRAINT gsc_analytics_history_pkey PRIMARY KEY (id);


--
-- Name: gsc_connections gsc_connections_blog_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_connections
    ADD CONSTRAINT gsc_connections_blog_id_key UNIQUE (blog_id);


--
-- Name: gsc_connections gsc_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_connections
    ADD CONSTRAINT gsc_connections_pkey PRIMARY KEY (id);


--
-- Name: gsc_pages_history gsc_pages_history_blog_id_page_url_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_pages_history
    ADD CONSTRAINT gsc_pages_history_blog_id_page_url_date_key UNIQUE (blog_id, page_url, date);


--
-- Name: gsc_pages_history gsc_pages_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_pages_history
    ADD CONSTRAINT gsc_pages_history_pkey PRIMARY KEY (id);


--
-- Name: gsc_queries_history gsc_queries_history_blog_id_query_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_queries_history
    ADD CONSTRAINT gsc_queries_history_blog_id_query_date_key UNIQUE (blog_id, query, date);


--
-- Name: gsc_queries_history gsc_queries_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_queries_history
    ADD CONSTRAINT gsc_queries_history_pkey PRIMARY KEY (id);


--
-- Name: gsc_ranking_alerts gsc_ranking_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_ranking_alerts
    ADD CONSTRAINT gsc_ranking_alerts_pkey PRIMARY KEY (id);


--
-- Name: help_articles help_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_pkey PRIMARY KEY (id);


--
-- Name: help_articles help_articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_slug_key UNIQUE (slug);


--
-- Name: keyword_analyses keyword_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_analyses
    ADD CONSTRAINT keyword_analyses_pkey PRIMARY KEY (id);


--
-- Name: landing_page_events landing_page_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_page_events
    ADD CONSTRAINT landing_page_events_pkey PRIMARY KEY (id);


--
-- Name: linking_settings linking_settings_blog_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linking_settings
    ADD CONSTRAINT linking_settings_blog_id_key UNIQUE (blog_id);


--
-- Name: linking_settings linking_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linking_settings
    ADD CONSTRAINT linking_settings_pkey PRIMARY KEY (id);


--
-- Name: model_pricing model_pricing_model_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_pricing
    ADD CONSTRAINT model_pricing_model_name_key UNIQUE (model_name);


--
-- Name: model_pricing model_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_pricing
    ADD CONSTRAINT model_pricing_pkey PRIMARY KEY (id);


--
-- Name: opportunity_notification_history opportunity_notification_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_notification_history
    ADD CONSTRAINT opportunity_notification_history_pkey PRIMARY KEY (id);


--
-- Name: opportunity_notifications opportunity_notifications_blog_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_notifications
    ADD CONSTRAINT opportunity_notifications_blog_id_user_id_key UNIQUE (blog_id, user_id);


--
-- Name: opportunity_notifications opportunity_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_notifications
    ADD CONSTRAINT opportunity_notifications_pkey PRIMARY KEY (id);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id);


--
-- Name: plan_limits plan_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_pkey PRIMARY KEY (id);


--
-- Name: plan_limits plan_limits_plan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_plan_key UNIQUE (plan);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: reading_goal_alerts reading_goal_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_goal_alerts
    ADD CONSTRAINT reading_goal_alerts_pkey PRIMARY KEY (id);


--
-- Name: reading_goals reading_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_goals
    ADD CONSTRAINT reading_goals_pkey PRIMARY KEY (id);


--
-- Name: referral_conversions referral_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_pkey PRIMARY KEY (id);


--
-- Name: referral_settings referral_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_settings
    ADD CONSTRAINT referral_settings_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referral_code_key UNIQUE (referral_code);


--
-- Name: section_analytics section_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_analytics
    ADD CONSTRAINT section_analytics_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: team_activity_log team_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_activity_log
    ADD CONSTRAINT team_activity_log_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_blog_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_blog_id_email_key UNIQUE (blog_id, email);


--
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_pkey PRIMARY KEY (id);


--
-- Name: team_invites team_invites_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_token_key UNIQUE (token);


--
-- Name: team_members team_members_blog_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_blog_id_user_id_key UNIQUE (blog_id, user_id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: template_analytics template_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_analytics
    ADD CONSTRAINT template_analytics_pkey PRIMARY KEY (id);


--
-- Name: tenant_members tenant_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_members
    ADD CONSTRAINT tenant_members_pkey PRIMARY KEY (id);


--
-- Name: tenant_members tenant_members_tenant_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_members
    ADD CONSTRAINT tenant_members_tenant_id_user_id_key UNIQUE (tenant_id, user_id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: usage_tracking usage_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracking
    ADD CONSTRAINT usage_tracking_pkey PRIMARY KEY (id);


--
-- Name: usage_tracking usage_tracking_user_id_month_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracking
    ADD CONSTRAINT usage_tracking_user_id_month_key UNIQUE (user_id, month);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_blog_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_blog_id_achievement_id_key UNIQUE (user_id, blog_id, achievement_id);


--
-- Name: user_library user_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_library
    ADD CONSTRAINT user_library_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: weekly_report_settings weekly_report_settings_blog_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_report_settings
    ADD CONSTRAINT weekly_report_settings_blog_id_user_id_key UNIQUE (blog_id, user_id);


--
-- Name: weekly_report_settings weekly_report_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_report_settings
    ADD CONSTRAINT weekly_report_settings_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_alert_history_alert; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_alert_history_alert ON public.admin_alert_history USING btree (alert_id);


--
-- Name: idx_admin_alert_history_triggered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_alert_history_triggered ON public.admin_alert_history USING btree (triggered_at DESC);


--
-- Name: idx_admin_cost_alerts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_cost_alerts_active ON public.admin_cost_alerts USING btree (is_active);


--
-- Name: idx_admin_cost_alerts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_cost_alerts_type ON public.admin_cost_alerts USING btree (alert_type);


--
-- Name: idx_article_analytics_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_analytics_article_id ON public.article_analytics USING btree (article_id);


--
-- Name: idx_article_analytics_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_analytics_blog_id ON public.article_analytics USING btree (blog_id);


--
-- Name: idx_article_analytics_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_analytics_created_at ON public.article_analytics USING btree (created_at);


--
-- Name: idx_article_opportunities_converted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_opportunities_converted ON public.article_opportunities USING btree (converted_article_id) WHERE (converted_article_id IS NOT NULL);


--
-- Name: idx_article_opportunities_relevance_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_opportunities_relevance_score ON public.article_opportunities USING btree (relevance_score DESC);


--
-- Name: idx_article_queue_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_queue_source ON public.article_queue USING btree (generation_source);


--
-- Name: idx_article_translations_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_translations_article_id ON public.article_translations USING btree (article_id);


--
-- Name: idx_article_translations_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_translations_language ON public.article_translations USING btree (language_code);


--
-- Name: idx_article_versions_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_versions_article_id ON public.article_versions USING btree (article_id);


--
-- Name: idx_article_versions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_versions_created_at ON public.article_versions USING btree (created_at DESC);


--
-- Name: idx_articles_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_scheduled_at ON public.articles USING btree (scheduled_at) WHERE ((scheduled_at IS NOT NULL) AND (status = 'scheduled'::text));


--
-- Name: idx_articles_target_persona; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_articles_target_persona ON public.articles USING btree (target_persona_id);


--
-- Name: idx_blog_traffic_blog_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_traffic_blog_date ON public.blog_traffic USING btree (blog_id, date);


--
-- Name: idx_blogs_custom_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blogs_custom_domain ON public.blogs USING btree (custom_domain) WHERE (custom_domain IS NOT NULL);


--
-- Name: idx_blogs_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blogs_tenant ON public.blogs USING btree (tenant_id);


--
-- Name: idx_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_expires ON public.ai_content_cache USING btree (expires_at);


--
-- Name: idx_cache_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_hash ON public.ai_content_cache USING btree (content_hash);


--
-- Name: idx_cache_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_type ON public.ai_content_cache USING btree (cache_type);


--
-- Name: idx_consumption_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_action ON public.consumption_logs USING btree (action_type);


--
-- Name: idx_consumption_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_date ON public.consumption_logs USING btree (created_at);


--
-- Name: idx_consumption_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_user ON public.consumption_logs USING btree (user_id);


--
-- Name: idx_content_clusters_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_clusters_blog_id ON public.content_clusters USING btree (blog_id);


--
-- Name: idx_conversions_referral_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversions_referral_id ON public.referral_conversions USING btree (referral_id);


--
-- Name: idx_conversions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversions_status ON public.referral_conversions USING btree (status);


--
-- Name: idx_ebook_leads_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ebook_leads_date ON public.ebook_leads USING btree (created_at);


--
-- Name: idx_ebook_leads_ebook; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ebook_leads_ebook ON public.ebook_leads USING btree (ebook_id);


--
-- Name: idx_ebook_leads_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ebook_leads_email ON public.ebook_leads USING btree (email);


--
-- Name: idx_ebooks_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ebooks_slug ON public.ebooks USING btree (slug);


--
-- Name: idx_email_logs_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_blog_id ON public.email_logs USING btree (blog_id);


--
-- Name: idx_email_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_created_at ON public.email_logs USING btree (created_at DESC);


--
-- Name: idx_email_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_status ON public.email_logs USING btree (status);


--
-- Name: idx_email_logs_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_template ON public.email_logs USING btree (template);


--
-- Name: idx_email_logs_to_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_to_email ON public.email_logs USING btree (to_email);


--
-- Name: idx_funnel_events_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funnel_events_article ON public.funnel_events USING btree (article_id);


--
-- Name: idx_funnel_events_blog; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funnel_events_blog ON public.funnel_events USING btree (blog_id);


--
-- Name: idx_funnel_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funnel_events_created ON public.funnel_events USING btree (created_at);


--
-- Name: idx_funnel_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_funnel_events_type ON public.funnel_events USING btree (event_type);


--
-- Name: idx_gsc_alert_history_blog; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_alert_history_blog ON public.gsc_alert_history USING btree (blog_id, triggered_at DESC);


--
-- Name: idx_gsc_alerts_blog; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_alerts_blog ON public.gsc_ranking_alerts USING btree (blog_id);


--
-- Name: idx_gsc_analytics_blog_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_analytics_blog_date ON public.gsc_analytics_history USING btree (blog_id, date DESC);


--
-- Name: idx_gsc_pages_blog_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_pages_blog_date ON public.gsc_pages_history USING btree (blog_id, date DESC);


--
-- Name: idx_gsc_queries_blog_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_queries_blog_date ON public.gsc_queries_history USING btree (blog_id, date DESC);


--
-- Name: idx_gsc_queries_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_queries_query ON public.gsc_queries_history USING btree (blog_id, query);


--
-- Name: idx_keyword_analyses_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_analyses_blog_id ON public.keyword_analyses USING btree (blog_id);


--
-- Name: idx_landing_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_landing_events_created ON public.landing_page_events USING btree (created_at);


--
-- Name: idx_landing_events_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_landing_events_section ON public.landing_page_events USING btree (page_section);


--
-- Name: idx_landing_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_landing_events_session ON public.landing_page_events USING btree (session_id);


--
-- Name: idx_landing_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_landing_events_type ON public.landing_page_events USING btree (event_type);


--
-- Name: idx_notification_history_blog; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_history_blog ON public.opportunity_notification_history USING btree (blog_id);


--
-- Name: idx_notification_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_history_user ON public.opportunity_notification_history USING btree (user_id, read_at);


--
-- Name: idx_reading_goal_alerts_read_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reading_goal_alerts_read_at ON public.reading_goal_alerts USING btree (read_at) WHERE (read_at IS NULL);


--
-- Name: idx_reading_goal_alerts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reading_goal_alerts_user_id ON public.reading_goal_alerts USING btree (user_id);


--
-- Name: idx_reading_goals_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reading_goals_blog_id ON public.reading_goals USING btree (blog_id);


--
-- Name: idx_reading_goals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reading_goals_user_id ON public.reading_goals USING btree (user_id);


--
-- Name: idx_referrals_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_code ON public.referrals USING btree (referral_code);


--
-- Name: idx_referrals_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_user_id ON public.referrals USING btree (referrer_user_id);


--
-- Name: idx_section_analytics_article; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_analytics_article ON public.section_analytics USING btree (article_id);


--
-- Name: idx_section_analytics_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_section_analytics_session ON public.section_analytics USING btree (session_id);


--
-- Name: idx_subscriptions_internal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_internal ON public.subscriptions USING btree (is_internal_account) WHERE (is_internal_account = true);


--
-- Name: idx_subscriptions_stripe_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions USING btree (stripe_customer_id);


--
-- Name: idx_subscriptions_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_tenant ON public.subscriptions USING btree (tenant_id);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_team_activity_log_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_activity_log_blog_id ON public.team_activity_log USING btree (blog_id);


--
-- Name: idx_team_activity_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_activity_log_created_at ON public.team_activity_log USING btree (created_at DESC);


--
-- Name: idx_team_invites_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_invites_blog_id ON public.team_invites USING btree (blog_id);


--
-- Name: idx_team_invites_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_invites_token ON public.team_invites USING btree (token);


--
-- Name: idx_team_members_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_blog_id ON public.team_members USING btree (blog_id);


--
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);


--
-- Name: idx_template_analytics_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_analytics_blog_id ON public.template_analytics USING btree (blog_id);


--
-- Name: idx_template_analytics_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_template_analytics_unique ON public.template_analytics USING btree (blog_id, template_id, date);


--
-- Name: idx_tenant_members_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_members_tenant ON public.tenant_members USING btree (tenant_id);


--
-- Name: idx_tenant_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_members_user ON public.tenant_members USING btree (user_id);


--
-- Name: idx_tenants_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_owner ON public.tenants USING btree (owner_user_id);


--
-- Name: idx_tenants_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_slug ON public.tenants USING btree (slug);


--
-- Name: idx_user_achievements_achievement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_achievement ON public.user_achievements USING btree (achievement_id);


--
-- Name: idx_user_achievements_user_blog; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_achievements_user_blog ON public.user_achievements USING btree (user_id, blog_id);


--
-- Name: idx_weekly_report_settings_blog_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_weekly_report_settings_blog_id ON public.weekly_report_settings USING btree (blog_id);


--
-- Name: blogs set_platform_subdomain; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_platform_subdomain BEFORE INSERT ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.generate_platform_subdomain();


--
-- Name: blogs trigger_auto_create_subscription; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_create_subscription AFTER INSERT ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.auto_create_subscription_on_blog();


--
-- Name: admin_cost_alerts update_admin_cost_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_cost_alerts_updated_at BEFORE UPDATE ON public.admin_cost_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_goals update_admin_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_goals_updated_at BEFORE UPDATE ON public.admin_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: article_opportunities update_article_opportunities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_article_opportunities_updated_at BEFORE UPDATE ON public.article_opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: article_queue update_article_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_article_queue_updated_at BEFORE UPDATE ON public.article_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: article_translations update_article_translations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_article_translations_updated_at BEFORE UPDATE ON public.article_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: articles update_articles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: blog_automation update_blog_automation_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_automation_updated_at BEFORE UPDATE ON public.blog_automation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: blog_traffic update_blog_traffic_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_traffic_updated_at BEFORE UPDATE ON public.blog_traffic FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: blogs update_blogs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: business_profile update_business_profile_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_profile_updated_at BEFORE UPDATE ON public.business_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: chat_article_drafts update_chat_article_drafts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_article_drafts_updated_at BEFORE UPDATE ON public.chat_article_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cms_integrations update_cms_integrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cms_integrations_updated_at BEFORE UPDATE ON public.cms_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_clusters update_content_clusters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_content_clusters_updated_at BEFORE UPDATE ON public.content_clusters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: content_preferences update_content_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_content_preferences_updated_at BEFORE UPDATE ON public.content_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: ebooks update_ebooks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ebooks_updated_at BEFORE UPDATE ON public.ebooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: editorial_templates update_editorial_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_editorial_templates_updated_at BEFORE UPDATE ON public.editorial_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: funnel_goals update_funnel_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_funnel_goals_updated_at BEFORE UPDATE ON public.funnel_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gsc_connections update_gsc_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gsc_connections_updated_at BEFORE UPDATE ON public.gsc_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: gsc_ranking_alerts update_gsc_ranking_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gsc_ranking_alerts_updated_at BEFORE UPDATE ON public.gsc_ranking_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: opportunity_notifications update_opportunity_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_opportunity_notifications_updated_at BEFORE UPDATE ON public.opportunity_notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: personas update_personas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON public.personas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: push_subscriptions update_push_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: referral_settings update_referral_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_referral_settings_updated_at BEFORE UPDATE ON public.referral_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: team_members update_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: usage_tracking update_usage_tracking_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON public.usage_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: admin_alert_history admin_alert_history_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_alert_history
    ADD CONSTRAINT admin_alert_history_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.admin_cost_alerts(id) ON DELETE CASCADE;


--
-- Name: admin_goals admin_goals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_goals
    ADD CONSTRAINT admin_goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ai_content_cache ai_content_cache_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content_cache
    ADD CONSTRAINT ai_content_cache_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: article_analytics article_analytics_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_analytics
    ADD CONSTRAINT article_analytics_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_analytics article_analytics_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_analytics
    ADD CONSTRAINT article_analytics_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: article_internal_links article_internal_links_source_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_internal_links
    ADD CONSTRAINT article_internal_links_source_article_id_fkey FOREIGN KEY (source_article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_internal_links article_internal_links_target_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_internal_links
    ADD CONSTRAINT article_internal_links_target_article_id_fkey FOREIGN KEY (target_article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_opportunities article_opportunities_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_opportunities
    ADD CONSTRAINT article_opportunities_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: article_opportunities article_opportunities_converted_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_opportunities
    ADD CONSTRAINT article_opportunities_converted_article_id_fkey FOREIGN KEY (converted_article_id) REFERENCES public.articles(id) ON DELETE SET NULL;


--
-- Name: article_queue article_queue_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_queue
    ADD CONSTRAINT article_queue_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE SET NULL;


--
-- Name: article_queue article_queue_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_queue
    ADD CONSTRAINT article_queue_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: article_queue article_queue_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_queue
    ADD CONSTRAINT article_queue_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.personas(id);


--
-- Name: article_translations article_translations_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_translations
    ADD CONSTRAINT article_translations_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: article_versions article_versions_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_versions
    ADD CONSTRAINT article_versions_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: articles articles_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: articles articles_target_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_target_persona_id_fkey FOREIGN KEY (target_persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;


--
-- Name: blog_automation blog_automation_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_automation
    ADD CONSTRAINT blog_automation_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: blog_categories blog_categories_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: blog_traffic blog_traffic_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_traffic
    ADD CONSTRAINT blog_traffic_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: blogs blogs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: blogs blogs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blogs
    ADD CONSTRAINT blogs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: business_profile business_profile_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profile
    ADD CONSTRAINT business_profile_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: business_profile business_profile_default_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_profile
    ADD CONSTRAINT business_profile_default_template_id_fkey FOREIGN KEY (default_template_id) REFERENCES public.editorial_templates(id) ON DELETE SET NULL;


--
-- Name: chat_article_drafts chat_article_drafts_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_article_drafts
    ADD CONSTRAINT chat_article_drafts_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: client_reviews client_reviews_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_reviews
    ADD CONSTRAINT client_reviews_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: client_reviews client_reviews_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_reviews
    ADD CONSTRAINT client_reviews_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: cluster_articles cluster_articles_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cluster_articles
    ADD CONSTRAINT cluster_articles_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE SET NULL;


--
-- Name: cluster_articles cluster_articles_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cluster_articles
    ADD CONSTRAINT cluster_articles_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.content_clusters(id) ON DELETE CASCADE;


--
-- Name: cms_integrations cms_integrations_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_integrations
    ADD CONSTRAINT cms_integrations_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: cms_publish_logs cms_publish_logs_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_publish_logs
    ADD CONSTRAINT cms_publish_logs_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: cms_publish_logs cms_publish_logs_integration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_publish_logs
    ADD CONSTRAINT cms_publish_logs_integration_id_fkey FOREIGN KEY (integration_id) REFERENCES public.cms_integrations(id) ON DELETE CASCADE;


--
-- Name: competitors competitors_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitors
    ADD CONSTRAINT competitors_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: consumption_logs consumption_logs_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumption_logs
    ADD CONSTRAINT consumption_logs_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE SET NULL;


--
-- Name: content_clusters content_clusters_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_clusters
    ADD CONSTRAINT content_clusters_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: content_preferences content_preferences_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_preferences
    ADD CONSTRAINT content_preferences_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: custom_templates custom_templates_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_templates
    ADD CONSTRAINT custom_templates_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: ebook_leads ebook_leads_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebook_leads
    ADD CONSTRAINT ebook_leads_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: ebook_leads ebook_leads_ebook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebook_leads
    ADD CONSTRAINT ebook_leads_ebook_id_fkey FOREIGN KEY (ebook_id) REFERENCES public.ebooks(id) ON DELETE CASCADE;


--
-- Name: ebooks ebooks_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebooks
    ADD CONSTRAINT ebooks_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: ebooks ebooks_source_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ebooks
    ADD CONSTRAINT ebooks_source_article_id_fkey FOREIGN KEY (source_article_id) REFERENCES public.articles(id) ON DELETE SET NULL;


--
-- Name: editorial_templates editorial_templates_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.editorial_templates
    ADD CONSTRAINT editorial_templates_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: email_logs email_logs_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id);


--
-- Name: funnel_events funnel_events_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funnel_events
    ADD CONSTRAINT funnel_events_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: funnel_events funnel_events_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funnel_events
    ADD CONSTRAINT funnel_events_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: funnel_goals funnel_goals_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funnel_goals
    ADD CONSTRAINT funnel_goals_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: gsc_alert_history gsc_alert_history_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_alert_history
    ADD CONSTRAINT gsc_alert_history_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.gsc_ranking_alerts(id) ON DELETE SET NULL;


--
-- Name: gsc_alert_history gsc_alert_history_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_alert_history
    ADD CONSTRAINT gsc_alert_history_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: gsc_analytics_history gsc_analytics_history_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_analytics_history
    ADD CONSTRAINT gsc_analytics_history_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: gsc_connections gsc_connections_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_connections
    ADD CONSTRAINT gsc_connections_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: gsc_pages_history gsc_pages_history_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_pages_history
    ADD CONSTRAINT gsc_pages_history_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: gsc_queries_history gsc_queries_history_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_queries_history
    ADD CONSTRAINT gsc_queries_history_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: gsc_ranking_alerts gsc_ranking_alerts_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_ranking_alerts
    ADD CONSTRAINT gsc_ranking_alerts_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: keyword_analyses keyword_analyses_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_analyses
    ADD CONSTRAINT keyword_analyses_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: linking_settings linking_settings_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linking_settings
    ADD CONSTRAINT linking_settings_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: opportunity_notification_history opportunity_notification_history_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_notification_history
    ADD CONSTRAINT opportunity_notification_history_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: opportunity_notification_history opportunity_notification_history_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_notification_history
    ADD CONSTRAINT opportunity_notification_history_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.article_opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_notifications opportunity_notifications_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_notifications
    ADD CONSTRAINT opportunity_notifications_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: personas personas_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;


--
-- Name: reading_goal_alerts reading_goal_alerts_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_goal_alerts
    ADD CONSTRAINT reading_goal_alerts_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE SET NULL;


--
-- Name: reading_goal_alerts reading_goal_alerts_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_goal_alerts
    ADD CONSTRAINT reading_goal_alerts_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.reading_goals(id) ON DELETE CASCADE;


--
-- Name: reading_goals reading_goals_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reading_goals
    ADD CONSTRAINT reading_goals_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: referral_conversions referral_conversions_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON DELETE CASCADE;


--
-- Name: referral_settings referral_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_settings
    ADD CONSTRAINT referral_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(user_id);


--
-- Name: section_analytics section_analytics_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_analytics
    ADD CONSTRAINT section_analytics_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_created_by_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_created_by_admin_fkey FOREIGN KEY (created_by_admin) REFERENCES auth.users(id);


--
-- Name: subscriptions subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: team_activity_log team_activity_log_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_activity_log
    ADD CONSTRAINT team_activity_log_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: team_invites team_invites_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: template_analytics template_analytics_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_analytics
    ADD CONSTRAINT template_analytics_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: tenant_members tenant_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_members
    ADD CONSTRAINT tenant_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);


--
-- Name: tenant_members tenant_members_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_members
    ADD CONSTRAINT tenant_members_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_members tenant_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_members
    ADD CONSTRAINT tenant_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tenants tenants_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: tenants tenants_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_achievements user_achievements_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: user_library user_library_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_library
    ADD CONSTRAINT user_library_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: weekly_report_settings weekly_report_settings_blog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_report_settings
    ADD CONSTRAINT weekly_report_settings_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE CASCADE;


--
-- Name: referral_conversions Admins can insert conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert conversions" ON public.referral_conversions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: referral_settings Admins can insert referral settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert referral settings" ON public.referral_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_cost_alerts Admins can manage cost alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage cost alerts" ON public.admin_cost_alerts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: model_pricing Admins can manage pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pricing" ON public.model_pricing USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: landing_page_events Admins can read landing events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read landing events" ON public.landing_page_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'platform_admin'::public.app_role]))))));


--
-- Name: referral_settings Admins can read referral settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read referral settings" ON public.referral_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referrals Admins can update all referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all referrals" ON public.referrals FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: referral_conversions Admins can update conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update conversions" ON public.referral_conversions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: referral_settings Admins can update referral settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update referral settings" ON public.referral_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_alert_history Admins can view alert history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view alert history" ON public.admin_alert_history USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_content_cache Admins can view all cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all cache" ON public.ai_content_cache FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: consumption_logs Admins can view all consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all consumption" ON public.consumption_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referral_conversions Admins can view all conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all conversions" ON public.referral_conversions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: ebook_leads Admins can view all leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all leads" ON public.ebook_leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: referrals Admins can view all referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all referrals" ON public.referrals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: team_activity_log Anyone can insert activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert activity" ON public.team_activity_log FOR INSERT WITH CHECK (true);


--
-- Name: article_analytics Anyone can insert analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert analytics" ON public.article_analytics FOR INSERT WITH CHECK (true);


--
-- Name: funnel_events Anyone can insert funnel events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert funnel events" ON public.funnel_events FOR INSERT WITH CHECK (true);


--
-- Name: landing_page_events Anyone can insert landing events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert landing events" ON public.landing_page_events FOR INSERT WITH CHECK (true);


--
-- Name: section_analytics Anyone can insert section analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert section analytics" ON public.section_analytics FOR INSERT WITH CHECK (true);


--
-- Name: blog_traffic Anyone can insert traffic; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert traffic" ON public.blog_traffic FOR INSERT WITH CHECK (true);


--
-- Name: article_translations Anyone can read translations of published articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read translations of published articles" ON public.article_translations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.articles a
  WHERE ((a.id = article_translations.article_id) AND (a.status = 'published'::text)))));


--
-- Name: ebook_leads Anyone can submit lead; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit lead" ON public.ebook_leads FOR INSERT WITH CHECK (true);


--
-- Name: blog_traffic Anyone can update traffic; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update traffic" ON public.blog_traffic FOR UPDATE USING (true);


--
-- Name: team_invites Anyone can view invite by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view invite by token" ON public.team_invites FOR SELECT USING ((token IS NOT NULL));


--
-- Name: plan_limits Anyone can view plan limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view plan limits" ON public.plan_limits FOR SELECT USING (true);


--
-- Name: model_pricing Anyone can view pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view pricing" ON public.model_pricing FOR SELECT USING (true);


--
-- Name: ebooks Anyone can view public ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view public ebooks" ON public.ebooks FOR SELECT USING ((is_public = true));


--
-- Name: articles Anyone can view published articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published articles" ON public.articles FOR SELECT TO anon USING ((status = 'published'::text));


--
-- Name: blogs Anyone can view published blogs by slug; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published blogs by slug" ON public.blogs FOR SELECT TO anon USING ((onboarding_completed = true));


--
-- Name: client_reviews Anyone can view reviews by share token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reviews by share token" ON public.client_reviews FOR SELECT USING ((share_token IS NOT NULL));


--
-- Name: section_analytics Article owners can view section analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Article owners can view section analytics" ON public.section_analytics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = section_analytics.article_id) AND (b.user_id = auth.uid())))));


--
-- Name: help_articles Authenticated users can read help articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read help articles" ON public.help_articles FOR SELECT TO authenticated USING ((is_published = true));


--
-- Name: article_translations Blog owners can delete translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can delete translations" ON public.article_translations FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = article_translations.article_id) AND (b.user_id = auth.uid())))));


--
-- Name: article_translations Blog owners can insert translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can insert translations" ON public.article_translations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = article_translations.article_id) AND (b.user_id = auth.uid())))));


--
-- Name: team_invites Blog owners can manage invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can manage invites" ON public.team_invites USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = team_invites.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: team_members Blog owners can manage team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can manage team members" ON public.team_members USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = team_members.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: article_translations Blog owners can update translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can update translations" ON public.article_translations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = article_translations.article_id) AND (b.user_id = auth.uid())))));


--
-- Name: team_activity_log Blog owners can view activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can view activity" ON public.team_activity_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = team_activity_log.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: funnel_events Blog owners can view funnel events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can view funnel events" ON public.funnel_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs b
  WHERE ((b.id = funnel_events.blog_id) AND (b.user_id = auth.uid())))));


--
-- Name: article_analytics Blog owners can view their analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can view their analytics" ON public.article_analytics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = article_analytics.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: ebook_leads Blog owners can view their leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can view their leads" ON public.ebook_leads FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = ebook_leads.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blog_traffic Blog owners can view their traffic; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Blog owners can view their traffic" ON public.blog_traffic FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = blog_traffic.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blog_categories Owners can delete categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete categories" ON public.blog_categories FOR DELETE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: blog_categories Owners can insert categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can insert categories" ON public.blog_categories FOR INSERT WITH CHECK ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: blog_categories Owners can update categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update categories" ON public.blog_categories FOR UPDATE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: tenant_members Platform admin can manage all tenant members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admin can manage all tenant members" ON public.tenant_members USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role));


--
-- Name: tenants Platform admin can manage tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admin can manage tenants" ON public.tenants USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role));


--
-- Name: tenants Platform admin can view all tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admin can view all tenants" ON public.tenants FOR SELECT USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role));


--
-- Name: admin_goals Platform admins can delete goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can delete goals" ON public.admin_goals FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'platform_admin'::public.app_role]))))));


--
-- Name: admin_goals Platform admins can insert goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can insert goals" ON public.admin_goals FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'platform_admin'::public.app_role]))))));


--
-- Name: admin_goals Platform admins can read goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can read goals" ON public.admin_goals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'platform_admin'::public.app_role]))))));


--
-- Name: admin_goals Platform admins can update goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can update goals" ON public.admin_goals FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'platform_admin'::public.app_role]))))));


--
-- Name: email_logs Platform admins can view all email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can view all email logs" ON public.email_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'platform_admin'::public.app_role)))));


--
-- Name: blog_categories Public can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view categories" ON public.blog_categories FOR SELECT USING (true);


--
-- Name: ai_content_cache Service can manage cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage cache" ON public.ai_content_cache TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_achievements Service role can insert achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);


--
-- Name: email_logs Service role can insert email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert email logs" ON public.email_logs FOR INSERT WITH CHECK (true);


--
-- Name: push_subscriptions Service role can read all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read all subscriptions" ON public.push_subscriptions FOR SELECT TO service_role USING (true);


--
-- Name: consumption_logs System can insert consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert consumption" ON public.consumption_logs FOR INSERT WITH CHECK (true);


--
-- Name: team_invites Team admins can manage invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team admins can manage invites" ON public.team_invites USING ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.blog_id = team_invites.blog_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (tm.status = 'active'::text)))));


--
-- Name: team_members Team admins can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team admins can manage members" ON public.team_members USING (((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.blog_id = team_members.blog_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'admin'::text])) AND (tm.status = 'active'::text)))) AND (role <> 'owner'::text)));


--
-- Name: blog_categories Team members can delete categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can delete categories" ON public.blog_categories FOR DELETE USING ((blog_id IN ( SELECT team_members.blog_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['admin'::text, 'editor'::text]))))));


--
-- Name: blog_categories Team members can insert categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can insert categories" ON public.blog_categories FOR INSERT WITH CHECK ((blog_id IN ( SELECT team_members.blog_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['admin'::text, 'editor'::text]))))));


--
-- Name: blog_categories Team members can update categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can update categories" ON public.blog_categories FOR UPDATE USING ((blog_id IN ( SELECT team_members.blog_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['admin'::text, 'editor'::text]))))));


--
-- Name: team_activity_log Team members can view activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view activity" ON public.team_activity_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.blog_id = team_activity_log.blog_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text)))));


--
-- Name: team_members Team members can view their team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their team" ON public.team_members FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members tm
  WHERE ((tm.blog_id = team_members.blog_id) AND (tm.user_id = auth.uid()) AND (tm.status = 'active'::text)))));


--
-- Name: tenant_members Tenant admins can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant admins can manage members" ON public.tenant_members USING ((EXISTS ( SELECT 1
   FROM public.tenant_members tm
  WHERE ((tm.tenant_id = tenant_members.tenant_id) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));


--
-- Name: tenant_members Tenant members can view fellow members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can view fellow members" ON public.tenant_members FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tenant_members my_membership
  WHERE ((my_membership.tenant_id = tenant_members.tenant_id) AND (my_membership.user_id = auth.uid())))));


--
-- Name: tenants Tenant members can view their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant members can view their tenant" ON public.tenants FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tenant_members tm
  WHERE ((tm.tenant_id = tenants.id) AND (tm.user_id = auth.uid())))));


--
-- Name: tenants Tenant owners can update their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant owners can update their tenant" ON public.tenants FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.tenant_members tm
  WHERE ((tm.tenant_id = tenants.id) AND (tm.user_id = auth.uid()) AND (tm.role = 'owner'::text)))));


--
-- Name: user_library Users can add to their own library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add to their own library" ON public.user_library FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = user_library.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: gsc_connections Users can create GSC connections for their blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create GSC connections for their blog" ON public.gsc_connections FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = gsc_connections.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: articles Users can create articles for their blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create articles for their blog" ON public.articles FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = articles.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blog_automation Users can create automation for their blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create automation for their blog" ON public.blog_automation FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = blog_automation.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: client_reviews Users can create client reviews for their articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create client reviews for their articles" ON public.client_reviews FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = client_reviews.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: cluster_articles Users can create cluster articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create cluster articles" ON public.cluster_articles FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.content_clusters cc
     JOIN public.blogs b ON ((b.id = cc.blog_id)))
  WHERE ((cc.id = cluster_articles.cluster_id) AND (b.user_id = auth.uid())))));


--
-- Name: content_clusters Users can create clusters for their blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create clusters for their blog" ON public.content_clusters FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = content_clusters.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: competitors Users can create competitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create competitors" ON public.competitors FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = competitors.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: content_preferences Users can create content preferences for their blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create content preferences for their blog" ON public.content_preferences FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = content_preferences.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: funnel_goals Users can create funnel goals for their blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create funnel goals for their blogs" ON public.funnel_goals FOR INSERT WITH CHECK ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: keyword_analyses Users can create keyword analyses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create keyword analyses" ON public.keyword_analyses FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = keyword_analyses.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: linking_settings Users can create linking settings for their blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create linking settings for their blog" ON public.linking_settings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = linking_settings.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: article_internal_links Users can create links for their articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create links for their articles" ON public.article_internal_links FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = article_internal_links.source_article_id) AND (b.user_id = auth.uid())))));


--
-- Name: article_opportunities Users can create opportunities for their blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create opportunities for their blog" ON public.article_opportunities FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = article_opportunities.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: referrals Users can create own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own referrals" ON public.referrals FOR INSERT WITH CHECK ((auth.uid() = referrer_user_id));


--
-- Name: article_queue Users can create queue items for their blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create queue items for their blog" ON public.article_queue FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = article_queue.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blogs Users can create their own blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own blog" ON public.blogs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: business_profile Users can create their own business profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own business profile" ON public.business_profile FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = business_profile.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: chat_article_drafts Users can create their own chat drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own chat drafts" ON public.chat_article_drafts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: custom_templates Users can create their own custom templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own custom templates" ON public.custom_templates FOR INSERT WITH CHECK ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: ebooks Users can create their own ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own ebooks" ON public.ebooks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = ebooks.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: personas Users can create their own personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own personas" ON public.personas FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = personas.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: editorial_templates Users can create their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own templates" ON public.editorial_templates FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = editorial_templates.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: article_versions Users can create versions of their articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create versions of their articles" ON public.article_versions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = article_versions.article_id) AND (b.user_id = auth.uid())))));


--
-- Name: user_library Users can delete from their own library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete from their own library" ON public.user_library FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = user_library.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: push_subscriptions Users can delete own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: cms_integrations Users can delete their blog integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their blog integrations" ON public.cms_integrations FOR DELETE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: cluster_articles Users can delete their cluster articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their cluster articles" ON public.cluster_articles FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.content_clusters cc
     JOIN public.blogs b ON ((b.id = cc.blog_id)))
  WHERE ((cc.id = cluster_articles.cluster_id) AND (b.user_id = auth.uid())))));


--
-- Name: content_clusters Users can delete their clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their clusters" ON public.content_clusters FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = content_clusters.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: competitors Users can delete their competitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their competitors" ON public.competitors FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = competitors.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: keyword_analyses Users can delete their keyword analyses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their keyword analyses" ON public.keyword_analyses FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = keyword_analyses.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: gsc_connections Users can delete their own GSC connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own GSC connections" ON public.gsc_connections FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = gsc_connections.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: article_internal_links Users can delete their own article links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own article links" ON public.article_internal_links FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = article_internal_links.source_article_id) AND (b.user_id = auth.uid())))));


--
-- Name: articles Users can delete their own articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own articles" ON public.articles FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = articles.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blog_automation Users can delete their own automation settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own automation settings" ON public.blog_automation FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = blog_automation.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blogs Users can delete their own blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own blog" ON public.blogs FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: business_profile Users can delete their own business profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own business profile" ON public.business_profile FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = business_profile.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: chat_article_drafts Users can delete their own chat drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own chat drafts" ON public.chat_article_drafts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: client_reviews Users can delete their own client reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own client reviews" ON public.client_reviews FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = client_reviews.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: content_preferences Users can delete their own content preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own content preferences" ON public.content_preferences FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = content_preferences.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: custom_templates Users can delete their own custom templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own custom templates" ON public.custom_templates FOR DELETE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: ebooks Users can delete their own ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own ebooks" ON public.ebooks FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = ebooks.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: funnel_goals Users can delete their own funnel goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own funnel goals" ON public.funnel_goals FOR DELETE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: linking_settings Users can delete their own linking settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own linking settings" ON public.linking_settings FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = linking_settings.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: opportunity_notifications Users can delete their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notification settings" ON public.opportunity_notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: article_opportunities Users can delete their own opportunities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own opportunities" ON public.article_opportunities FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = article_opportunities.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: personas Users can delete their own personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own personas" ON public.personas FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = personas.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: article_queue Users can delete their own queue items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own queue items" ON public.article_queue FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = article_queue.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: editorial_templates Users can delete their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own templates" ON public.editorial_templates FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = editorial_templates.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: article_versions Users can delete versions of their articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete versions of their articles" ON public.article_versions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = article_versions.article_id) AND (b.user_id = auth.uid())))));


--
-- Name: gsc_analytics_history Users can insert GSC analytics for their blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert GSC analytics for their blogs" ON public.gsc_analytics_history FOR INSERT WITH CHECK ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: gsc_pages_history Users can insert GSC pages for their blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert GSC pages for their blogs" ON public.gsc_pages_history FOR INSERT WITH CHECK ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: gsc_queries_history Users can insert GSC queries for their blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert GSC queries for their blogs" ON public.gsc_queries_history FOR INSERT WITH CHECK ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: gsc_alert_history Users can insert alert history for their blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert alert history for their blogs" ON public.gsc_alert_history FOR INSERT WITH CHECK ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: push_subscriptions Users can insert own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: cms_publish_logs Users can insert publish logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert publish logs" ON public.cms_publish_logs FOR INSERT WITH CHECK ((article_id IN ( SELECT articles.id
   FROM public.articles
  WHERE (articles.blog_id IN ( SELECT blogs.id
           FROM public.blogs
          WHERE (blogs.user_id = auth.uid()))))));


--
-- Name: cms_integrations Users can insert their blog integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their blog integrations" ON public.cms_integrations FOR INSERT WITH CHECK ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: opportunity_notifications Users can insert their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notification settings" ON public.opportunity_notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscriptions Users can insert their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own subscription" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: template_analytics Users can insert their own template analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own template analytics" ON public.template_analytics FOR INSERT WITH CHECK ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: usage_tracking Users can insert their own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own usage" ON public.usage_tracking FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: gsc_ranking_alerts Users can manage alerts for their blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage alerts for their blogs" ON public.gsc_ranking_alerts USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: reading_goals Users can manage their own reading goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own reading goals" ON public.reading_goals USING ((auth.uid() = user_id));


--
-- Name: weekly_report_settings Users can manage their own report settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own report settings" ON public.weekly_report_settings USING ((auth.uid() = user_id));


--
-- Name: gsc_analytics_history Users can update GSC analytics for their blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update GSC analytics for their blogs" ON public.gsc_analytics_history FOR UPDATE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: gsc_pages_history Users can update GSC pages for their blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update GSC pages for their blogs" ON public.gsc_pages_history FOR UPDATE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: gsc_queries_history Users can update GSC queries for their blogs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update GSC queries for their blogs" ON public.gsc_queries_history FOR UPDATE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: team_members Users can update own membership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own membership" ON public.team_members FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: referrals Users can update own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own referrals" ON public.referrals FOR UPDATE USING ((auth.uid() = referrer_user_id));


--
-- Name: cms_integrations Users can update their blog integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their blog integrations" ON public.cms_integrations FOR UPDATE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: cluster_articles Users can update their cluster articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their cluster articles" ON public.cluster_articles FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.content_clusters cc
     JOIN public.blogs b ON ((b.id = cc.blog_id)))
  WHERE ((cc.id = cluster_articles.cluster_id) AND (b.user_id = auth.uid())))));


--
-- Name: content_clusters Users can update their clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their clusters" ON public.content_clusters FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = content_clusters.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: competitors Users can update their competitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their competitors" ON public.competitors FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = competitors.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: gsc_connections Users can update their own GSC connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own GSC connections" ON public.gsc_connections FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = gsc_connections.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: user_achievements Users can update their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own achievements" ON public.user_achievements FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: reading_goal_alerts Users can update their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own alerts" ON public.reading_goal_alerts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: articles Users can update their own articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own articles" ON public.articles FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = articles.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blog_automation Users can update their own automation settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own automation settings" ON public.blog_automation FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = blog_automation.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blogs Users can update their own blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own blog" ON public.blogs FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: business_profile Users can update their own business profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own business profile" ON public.business_profile FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = business_profile.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: chat_article_drafts Users can update their own chat drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own chat drafts" ON public.chat_article_drafts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: client_reviews Users can update their own client reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own client reviews" ON public.client_reviews FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = client_reviews.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: content_preferences Users can update their own content preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own content preferences" ON public.content_preferences FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = content_preferences.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: custom_templates Users can update their own custom templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own custom templates" ON public.custom_templates FOR UPDATE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: ebooks Users can update their own ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own ebooks" ON public.ebooks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = ebooks.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: funnel_goals Users can update their own funnel goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own funnel goals" ON public.funnel_goals FOR UPDATE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: user_library Users can update their own library items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own library items" ON public.user_library FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = user_library.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: linking_settings Users can update their own linking settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own linking settings" ON public.linking_settings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = linking_settings.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: opportunity_notifications Users can update their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notification settings" ON public.opportunity_notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: opportunity_notification_history Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.opportunity_notification_history FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: article_opportunities Users can update their own opportunities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own opportunities" ON public.article_opportunities FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = article_opportunities.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: personas Users can update their own personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own personas" ON public.personas FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = personas.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: article_queue Users can update their own queue items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own queue items" ON public.article_queue FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = article_queue.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: subscriptions Users can update their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own subscription" ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: template_analytics Users can update their own template analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own template analytics" ON public.template_analytics FOR UPDATE USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: editorial_templates Users can update their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own templates" ON public.editorial_templates FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = editorial_templates.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: usage_tracking Users can update their own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own usage" ON public.usage_tracking FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: consumption_logs Users can view own consumption; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own consumption" ON public.consumption_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referral_conversions Users can view own conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own conversions" ON public.referral_conversions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.referrals
  WHERE ((referrals.id = referral_conversions.referral_id) AND (referrals.referrer_user_id = auth.uid())))));


--
-- Name: team_members Users can view own membership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own membership" ON public.team_members FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: referrals Users can view own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING ((auth.uid() = referrer_user_id));


--
-- Name: push_subscriptions Users can view own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cms_integrations Users can view their blog integrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their blog integrations" ON public.cms_integrations FOR SELECT USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: gsc_analytics_history Users can view their blog's GSC analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their blog's GSC analytics" ON public.gsc_analytics_history FOR SELECT USING (((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))) OR (blog_id IN ( SELECT team_members.blog_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.status = 'active'::text))))));


--
-- Name: gsc_pages_history Users can view their blog's GSC pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their blog's GSC pages" ON public.gsc_pages_history FOR SELECT USING (((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))) OR (blog_id IN ( SELECT team_members.blog_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.status = 'active'::text))))));


--
-- Name: gsc_queries_history Users can view their blog's GSC queries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their blog's GSC queries" ON public.gsc_queries_history FOR SELECT USING (((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))) OR (blog_id IN ( SELECT team_members.blog_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.status = 'active'::text))))));


--
-- Name: gsc_alert_history Users can view their blog's alert history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their blog's alert history" ON public.gsc_alert_history FOR SELECT USING (((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))) OR (blog_id IN ( SELECT team_members.blog_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.status = 'active'::text))))));


--
-- Name: gsc_ranking_alerts Users can view their blog's alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their blog's alerts" ON public.gsc_ranking_alerts FOR SELECT USING (((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))) OR (blog_id IN ( SELECT team_members.blog_id
   FROM public.team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.status = 'active'::text))))));


--
-- Name: cluster_articles Users can view their cluster articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their cluster articles" ON public.cluster_articles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.content_clusters cc
     JOIN public.blogs b ON ((b.id = cc.blog_id)))
  WHERE ((cc.id = cluster_articles.cluster_id) AND (b.user_id = auth.uid())))));


--
-- Name: content_clusters Users can view their clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their clusters" ON public.content_clusters FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = content_clusters.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: competitors Users can view their competitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their competitors" ON public.competitors FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = competitors.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: keyword_analyses Users can view their keyword analyses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their keyword analyses" ON public.keyword_analyses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = keyword_analyses.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: gsc_connections Users can view their own GSC connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own GSC connections" ON public.gsc_connections FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = gsc_connections.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: user_achievements Users can view their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reading_goal_alerts Users can view their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own alerts" ON public.reading_goal_alerts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: article_internal_links Users can view their own article links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own article links" ON public.article_internal_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = article_internal_links.source_article_id) AND (b.user_id = auth.uid())))));


--
-- Name: articles Users can view their own articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own articles" ON public.articles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = articles.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blog_automation Users can view their own automation settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own automation settings" ON public.blog_automation FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = blog_automation.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: blogs Users can view their own blog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own blog" ON public.blogs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: business_profile Users can view their own business profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own business profile" ON public.business_profile FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = business_profile.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: chat_article_drafts Users can view their own chat drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own chat drafts" ON public.chat_article_drafts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: client_reviews Users can view their own client reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own client reviews" ON public.client_reviews FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = client_reviews.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: content_preferences Users can view their own content preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own content preferences" ON public.content_preferences FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = content_preferences.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: custom_templates Users can view their own custom templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own custom templates" ON public.custom_templates FOR SELECT USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: ebooks Users can view their own ebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own ebooks" ON public.ebooks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = ebooks.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: funnel_goals Users can view their own funnel goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own funnel goals" ON public.funnel_goals FOR SELECT USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: user_library Users can view their own library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own library" ON public.user_library FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = user_library.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: linking_settings Users can view their own linking settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own linking settings" ON public.linking_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = linking_settings.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: opportunity_notifications Users can view their own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification settings" ON public.opportunity_notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: opportunity_notification_history Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.opportunity_notification_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: article_opportunities Users can view their own opportunities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own opportunities" ON public.article_opportunities FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = article_opportunities.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: personas Users can view their own personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own personas" ON public.personas FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = personas.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: article_queue Users can view their own queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own queue" ON public.article_queue FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = article_queue.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can view their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: template_analytics Users can view their own template analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own template analytics" ON public.template_analytics FOR SELECT USING ((blog_id IN ( SELECT blogs.id
   FROM public.blogs
  WHERE (blogs.user_id = auth.uid()))));


--
-- Name: editorial_templates Users can view their own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own templates" ON public.editorial_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.blogs
  WHERE ((blogs.id = editorial_templates.blog_id) AND (blogs.user_id = auth.uid())))));


--
-- Name: usage_tracking Users can view their own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own usage" ON public.usage_tracking FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cms_publish_logs Users can view their publish logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their publish logs" ON public.cms_publish_logs FOR SELECT USING ((article_id IN ( SELECT articles.id
   FROM public.articles
  WHERE (articles.blog_id IN ( SELECT blogs.id
           FROM public.blogs
          WHERE (blogs.user_id = auth.uid()))))));


--
-- Name: article_versions Users can view versions of their articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view versions of their articles" ON public.article_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.articles a
     JOIN public.blogs b ON ((a.blog_id = b.id)))
  WHERE ((a.id = article_versions.article_id) AND (b.user_id = auth.uid())))));


--
-- Name: admin_alert_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_alert_history ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_cost_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_cost_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_content_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_content_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: article_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: article_internal_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_internal_links ENABLE ROW LEVEL SECURITY;

--
-- Name: article_opportunities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_opportunities ENABLE ROW LEVEL SECURITY;

--
-- Name: article_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: article_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: article_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.article_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_automation; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_automation ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_traffic; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_traffic ENABLE ROW LEVEL SECURITY;

--
-- Name: blogs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

--
-- Name: business_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_article_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_article_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: client_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: cluster_articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cluster_articles ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_integrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_integrations ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_publish_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_publish_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: competitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

--
-- Name: consumption_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consumption_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: content_clusters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_clusters ENABLE ROW LEVEL SECURITY;

--
-- Name: content_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: ebook_leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ebook_leads ENABLE ROW LEVEL SECURITY;

--
-- Name: ebooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

--
-- Name: editorial_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.editorial_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: funnel_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

--
-- Name: funnel_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.funnel_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: gsc_alert_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gsc_alert_history ENABLE ROW LEVEL SECURITY;

--
-- Name: gsc_analytics_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gsc_analytics_history ENABLE ROW LEVEL SECURITY;

--
-- Name: gsc_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gsc_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: gsc_pages_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gsc_pages_history ENABLE ROW LEVEL SECURITY;

--
-- Name: gsc_queries_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gsc_queries_history ENABLE ROW LEVEL SECURITY;

--
-- Name: gsc_ranking_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gsc_ranking_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: help_articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

--
-- Name: keyword_analyses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.keyword_analyses ENABLE ROW LEVEL SECURITY;

--
-- Name: landing_page_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.landing_page_events ENABLE ROW LEVEL SECURITY;

--
-- Name: linking_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.linking_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: model_pricing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunity_notification_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_notification_history ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunity_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: personas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: reading_goal_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reading_goal_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: reading_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_conversions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: section_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: team_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: team_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: template_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: weekly_report_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_report_settings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;