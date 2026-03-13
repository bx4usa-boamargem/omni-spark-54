import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    console.log(`[${now}] Checking for scheduled articles to publish...`);

    // Find articles that are scheduled and due for publication
    const { data: scheduledArticles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, scheduled_at')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now);

    if (fetchError) {
      console.error('Error fetching scheduled articles:', fetchError);
      throw fetchError;
    }

    if (!scheduledArticles || scheduledArticles.length === 0) {
      console.log('No articles scheduled for publishing at this time');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No articles to publish',
          published: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${scheduledArticles.length} article(s) to publish`);

    // Update each article to published status
    const articleIds = scheduledArticles.map(a => a.id);
    
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        status: 'published',
        published_at: now,
        updated_at: now,
      })
      .in('id', articleIds);

    if (updateError) {
      console.error('Error updating articles:', updateError);
      throw updateError;
    }

    console.log(`Successfully published ${scheduledArticles.length} article(s):`);
    scheduledArticles.forEach(a => {
      console.log(`  - "${a.title}" (scheduled for ${a.scheduled_at})`);
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Published ${scheduledArticles.length} article(s)`,
        published: scheduledArticles.length,
        articles: scheduledArticles.map(a => ({ id: a.id, title: a.title }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in publish-scheduled-articles:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
