import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrendsRequest {
  blogId: string;
  keywords?: string[];
  niche?: string;
  country?: string;
}

interface TrendData {
  keyword: string;
  interest: number;
  related: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERPAPI_KEY = Deno.env.get('SERPAPI_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { blogId, keywords = [], niche, country = 'BR' }: TrendsRequest = await req.json();
    console.log('Fetching trends for:', { blogId, keywords, niche, country });

    if (!blogId) {
      return new Response(
        JSON.stringify({ error: 'blogId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no SERPAPI_KEY, return simulated trends based on niche
    if (!SERPAPI_KEY) {
      console.log('SERPAPI_KEY not configured, returning simulated trends');
      
      // Fetch business profile for context
      const { data: profile } = await supabase
        .from('business_profile')
        .select('niche, brand_keywords')
        .eq('blog_id', blogId)
        .single();

      const nicheContext = profile?.niche || niche || 'negócios';
      const brandKeywords = profile?.brand_keywords || [];

      // Generate simulated trends based on niche
      const simulatedTrends: TrendData[] = [
        ...brandKeywords.slice(0, 3).map((kw: string) => ({
          keyword: kw,
          interest: Math.floor(Math.random() * 40) + 60,
          related: [`${kw} para iniciantes`, `como usar ${kw}`, `${kw} 2025`],
        })),
        {
          keyword: `tendências ${nicheContext} 2025`,
          interest: 85,
          related: [`novidades ${nicheContext}`, `futuro ${nicheContext}`],
        },
        {
          keyword: `como começar ${nicheContext}`,
          interest: 78,
          related: [`guia ${nicheContext}`, `${nicheContext} passo a passo`],
        },
      ];

      return new Response(
        JSON.stringify({
          success: true,
          trends: simulatedTrends,
          source: 'simulated',
          message: 'Configure SERPAPI_KEY para dados reais do Google Trends',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use SerpAPI for real Google Trends data
    const searchKeywords = keywords.length > 0 ? keywords : [niche || 'marketing digital'];
    const allTrends: TrendData[] = [];

    for (const keyword of searchKeywords.slice(0, 5)) {
      try {
        const url = new URL('https://serpapi.com/search.json');
        url.searchParams.set('engine', 'google_trends');
        url.searchParams.set('q', keyword);
        url.searchParams.set('geo', country);
        url.searchParams.set('data_type', 'RELATED_QUERIES');
        url.searchParams.set('api_key', SERPAPI_KEY);

        const response = await fetch(url.toString());
        
        if (response.ok) {
          const data = await response.json();
          
          const relatedQueries = data.related_queries?.rising || [];
          const relatedKeywords = relatedQueries.slice(0, 5).map((q: { query: string }) => q.query);
          
          allTrends.push({
            keyword,
            interest: data.interest_over_time?.timeline_data?.[0]?.value || 50,
            related: relatedKeywords,
          });
        }
      } catch (error) {
        console.error(`Error fetching trends for ${keyword}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        trends: allTrends,
        source: 'serpapi',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-google-trends:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
