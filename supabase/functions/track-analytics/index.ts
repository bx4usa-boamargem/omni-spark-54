import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsEvent {
  type: 'pageview' | 'scroll' | 'time' | 'complete' | 'share' | 'section_view' | 'funnel_event' | 'scroll_granular';
  articleId: string;
  blogId: string;
  sessionId: string;
  visitorId?: string;
  data?: {
    scrollDepth?: number;
    timeOnPage?: number;
    readPercentage?: number;
    source?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    device?: string;
    browser?: string;
    country?: string;
    sharePlatform?: string;
    // Section tracking
    sectionId?: string;
    sectionTitle?: string;
    sectionIndex?: number;
    timeInView?: number;
    // Funnel events
    funnelEvent?: string;
    funnelData?: Record<string, unknown>;
    // Scroll positions for heatmap
    scrollPositions?: number[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event: AnalyticsEvent = await req.json();

    if (!event.articleId || !event.blogId || !event.sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (event.type === 'pageview') {
      // Create new analytics record
      const { error } = await supabase.from('article_analytics').insert({
        article_id: event.articleId,
        blog_id: event.blogId,
        session_id: event.sessionId,
        visitor_id: event.visitorId,
        source: event.data?.source || 'direct',
        utm_source: event.data?.utmSource,
        utm_medium: event.data?.utmMedium,
        utm_campaign: event.data?.utmCampaign,
        device: event.data?.device,
        browser: event.data?.browser,
        country: event.data?.country,
        scroll_depth: 0,
        time_on_page: 0,
        read_percentage: 0,
      });

      if (error) {
        console.error('Error inserting analytics:', error);
      }

      // Increment view count on article
      const { error: viewError } = await supabase.rpc('increment_view_count', {
        article_id: event.articleId,
      });

      if (viewError) {
        console.error('Error incrementing view count:', viewError);
      }

      // Update blog traffic aggregation
      const today = new Date().toISOString().split('T')[0];
      
      // Check if traffic record exists for today
      const { data: existingTraffic } = await supabase
        .from('blog_traffic')
        .select('id, total_visits, unique_visitors, direct_visits, organic_visits, social_visits, referral_visits')
        .eq('blog_id', event.blogId)
        .eq('date', today)
        .single();

      const source = event.data?.source || 'direct';
      const sourceField = source === 'organic' ? 'organic_visits' :
                         source === 'social' ? 'social_visits' :
                         source === 'referral' ? 'referral_visits' :
                         source === 'email' ? 'email_visits' : 'direct_visits';

      if (existingTraffic) {
        await supabase
          .from('blog_traffic')
          .update({
            total_visits: existingTraffic.total_visits + 1,
            [sourceField]: (existingTraffic[sourceField as keyof typeof existingTraffic] as number || 0) + 1,
          })
          .eq('id', existingTraffic.id);
      } else {
        await supabase.from('blog_traffic').insert({
          blog_id: event.blogId,
          date: today,
          total_visits: 1,
          unique_visitors: 1,
          [sourceField]: 1,
        });
      }
    } else if (event.type === 'share') {
      // Increment share count on article
      const { error: shareError } = await supabase.rpc('increment_share_count', {
        article_id: event.articleId,
      });

      if (shareError) {
        console.error('Error incrementing share count:', shareError);
      }

      // Also track as funnel event
      await supabase.from('funnel_events').insert({
        blog_id: event.blogId,
        article_id: event.articleId,
        session_id: event.sessionId,
        visitor_id: event.visitorId,
        event_type: 'share',
        event_data: { platform: event.data?.sharePlatform },
      });

      console.log('Share tracked:', event.articleId, event.data?.sharePlatform);
    } else if (event.type === 'section_view') {
      // Track section view time
      const { error } = await supabase.from('section_analytics').insert({
        article_id: event.articleId,
        session_id: event.sessionId,
        section_id: event.data?.sectionId || '',
        section_title: event.data?.sectionTitle || '',
        section_index: event.data?.sectionIndex || 0,
        time_in_view: event.data?.timeInView || 0,
      });

      if (error) {
        console.error('Error inserting section analytics:', error);
      }
  } else if (event.type === 'funnel_event') {
      const funnelEvent = event.data?.funnelEvent || 'unknown';
      
      // Track funnel event
      const { error } = await supabase.from('funnel_events').insert({
        blog_id: event.blogId,
        article_id: event.articleId,
        session_id: event.sessionId,
        visitor_id: event.visitorId,
        event_type: funnelEvent,
        event_data: event.data?.funnelData || {},
      });

      if (error) {
        console.error('Error inserting funnel event:', error);
      }

      // Track real lead on CTA click or conversion_intent
      if (funnelEvent === 'cta_click' || funnelEvent === 'conversion_intent') {
        const { error: leadError } = await supabase.from('real_leads').insert({
          blog_id: event.blogId,
          article_id: event.articleId,
          lead_type: 'whatsapp_click',
          source_url: event.data?.funnelData?.url || null,
          visitor_id: event.visitorId,
          session_id: event.sessionId,
        });

        if (leadError) {
          console.error('Error inserting real lead:', leadError);
        } else {
          console.log('Real lead tracked:', event.blogId, event.articleId);
        }
      }
    } else if (event.type === 'scroll_granular') {
      // Update scroll positions for heatmap
      const { error } = await supabase
        .from('article_analytics')
        .update({ scroll_positions: event.data?.scrollPositions || [] })
        .eq('session_id', event.sessionId)
        .eq('article_id', event.articleId);

      if (error) {
        console.error('Error updating scroll positions:', error);
      }
    } else {
      // Update existing analytics record
      const updateData: Record<string, unknown> = {};
      
      if (event.type === 'scroll' && event.data?.scrollDepth !== undefined) {
        updateData.scroll_depth = event.data.scrollDepth;
      }
      if (event.type === 'time' && event.data?.timeOnPage !== undefined) {
        updateData.time_on_page = event.data.timeOnPage;
      }
      if (event.type === 'complete' && event.data?.readPercentage !== undefined) {
        updateData.read_percentage = event.data.readPercentage;
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('article_analytics')
          .update(updateData)
          .eq('session_id', event.sessionId)
          .eq('article_id', event.articleId);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analytics error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
