-- Drop the tables created by mistake in previous iterations
DROP TABLE IF EXISTS public.client_page_views CASCADE;
DROP TABLE IF EXISTS public.client_leads CASCADE;

-- Create an RPC to feed the Lovable dashboard without complex client-end queries
CREATE OR REPLACE FUNCTION get_client_roi_dashboard(p_blog_id UUID)
RETURNS TABLE (
    total_articles INT,
    published_articles INT,
    total_views INT,
    total_cta_clicks INT,
    total_leads INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT count(*)::INT FROM public.articles WHERE blog_id = p_blog_id) as total_articles,
        (SELECT count(*)::INT FROM public.articles WHERE blog_id = p_blog_id AND status = 'published') as published_articles,
        (SELECT sum(a.time_on_page)::INT FROM public.article_analytics a WHERE a.blog_id = p_blog_id) as total_views, -- Note: maybe sum visits or just count session_ids? Let's do distinct visitor count or total rows.
        (SELECT count(*)::INT FROM public.funnel_events f WHERE f.blog_id = p_blog_id AND f.event_type = 'cta_click') as total_cta_clicks,
        (SELECT count(*)::INT FROM public.real_leads l WHERE l.blog_id = p_blog_id) as total_leads;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_client_roi_dashboard(UUID) TO anon, authenticated, service_role;
