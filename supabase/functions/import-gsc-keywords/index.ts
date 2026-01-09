import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { blogId, keywords } = await req.json();

    if (!blogId || !keywords || !Array.isArray(keywords)) {
      throw new Error('Missing required parameters: blogId or keywords array');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing keywords to avoid duplicates
    const { data: existingKeywords } = await supabase
      .from('keyword_analyses')
      .select('keyword')
      .eq('blog_id', blogId);

    const existingSet = new Set(existingKeywords?.map(k => k.keyword.toLowerCase()) || []);

    // Filter out duplicates
    const newKeywords = keywords.filter(
      (k: any) => !existingSet.has(k.keyword.toLowerCase())
    );

    if (newKeywords.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        imported: 0,
        skipped: keywords.length,
        message: 'All keywords already exist',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert new keywords
    const keywordsToInsert = newKeywords.map((k: any) => ({
      blog_id: blogId,
      keyword: k.keyword,
      difficulty: Math.round(k.difficulty),
      search_volume: k.searchVolume,
      source: 'gsc',
      suggestions: JSON.stringify({
        gsc_metrics: {
          clicks: k.clicks,
          impressions: k.impressions,
          ctr: k.ctr,
          position: k.position,
        },
        related_keywords: [],
        title_suggestions: [],
      }),
    }));

    const { error: insertError } = await supabase
      .from('keyword_analyses')
      .insert(keywordsToInsert);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to import keywords');
    }

    console.log(`Imported ${newKeywords.length} keywords from GSC`);

    return new Response(JSON.stringify({
      success: true,
      imported: newKeywords.length,
      skipped: keywords.length - newKeywords.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in import-gsc-keywords:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
