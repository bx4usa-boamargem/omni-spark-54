import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// ROI calculation config (in USD)
const ROI_CONFIG = {
  valuePerView: 0.50,
  valuePerShare: 2.00,
  valuePerArticle: 200.00,
  valuePerHighScoreOpportunity: 50.00,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret for scheduled calls
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret && cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split('T')[0];
    const specificBlogId = body.blogId;

    console.log(`Aggregating consultant metrics for date: ${targetDate}`);

    // Get all active blogs (or specific blog)
    let blogsQuery = supabase.from('blogs').select('id');
    if (specificBlogId) {
      blogsQuery = blogsQuery.eq('id', specificBlogId);
    }

    const { data: blogs, error: blogsError } = await blogsQuery;

    if (blogsError) {
      console.error('Error fetching blogs:', blogsError);
      throw blogsError;
    }

    if (!blogs || blogs.length === 0) {
      console.log('No blogs to process');
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    for (const blog of blogs) {
      try {
        // Count opportunities by score tier
        const { data: opportunities } = await supabase
          .from('article_opportunities')
          .select('id, relevance_score, status, converted_article_id')
          .eq('blog_id', blog.id)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);

        const totalOpportunities = opportunities?.length || 0;
        const highScore = opportunities?.filter(o => (o.relevance_score || 0) >= 80).length || 0;
        const mediumScore = opportunities?.filter(o => {
          const score = o.relevance_score || 0;
          return score >= 50 && score < 80;
        }).length || 0;
        const lowScore = opportunities?.filter(o => (o.relevance_score || 0) < 50).length || 0;
        const converted = opportunities?.filter(o => o.converted_article_id !== null).length || 0;

        // Count published articles
        const { count: publishedArticles } = await supabase
          .from('articles')
          .select('*', { count: 'exact', head: true })
          .eq('blog_id', blog.id)
          .eq('status', 'published')
          .gte('published_at', startOfDay)
          .lte('published_at', endOfDay);

        // Get engagement metrics (views and shares)
        const { data: articles } = await supabase
          .from('articles')
          .select('view_count, share_count')
          .eq('blog_id', blog.id)
          .eq('status', 'published');

        const totalViews = articles?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;
        const totalShares = articles?.reduce((sum, a) => sum + (a.share_count || 0), 0) || 0;

        // Calculate estimated ROI value
        const estimatedValue = 
          (totalViews * ROI_CONFIG.valuePerView) +
          (totalShares * ROI_CONFIG.valuePerShare) +
          ((publishedArticles || 0) * ROI_CONFIG.valuePerArticle) +
          (highScore * ROI_CONFIG.valuePerHighScoreOpportunity);

        // Upsert metrics for the day
        const { error: upsertError } = await supabase
          .from('consultant_metrics_daily')
          .upsert({
            blog_id: blog.id,
            date: targetDate,
            total_opportunities: totalOpportunities,
            high_score_opportunities: highScore,
            medium_score_opportunities: mediumScore,
            low_score_opportunities: lowScore,
            converted_to_articles: converted,
            published_articles: publishedArticles || 0,
            total_views: totalViews,
            total_shares: totalShares,
            estimated_value_usd: Math.round(estimatedValue * 100) / 100,
          }, {
            onConflict: 'blog_id,date',
          });

        if (upsertError) {
          console.error(`Error upserting metrics for blog ${blog.id}:`, upsertError);
          continue;
        }

        processedCount++;
        console.log(`Metrics aggregated for blog ${blog.id}: ${totalOpportunities} opportunities, ${highScore} high-score`);

      } catch (blogError) {
        console.error(`Error processing blog ${blog.id}:`, blogError);
      }
    }

    console.log(`Metrics aggregation complete. Processed: ${processedCount} blogs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        date: targetDate 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in aggregate-consultant-metrics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
