import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScoreRequest {
  opportunityId?: string;
  blogId?: string;
  title: string;
  keywords: string[];
}

interface RelevanceFactors {
  keyword_match: { score: number; matched: string[] };
  pain_alignment: { score: number; matched: string[] };
  desire_alignment: { score: number; matched: string[] };
  high_volume_keywords: { score: number; matched: string[] };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { opportunityId, blogId, title, keywords }: ScoreRequest = await req.json();
    console.log('Calculating score for:', { opportunityId, blogId, title, keywords });

    if (!blogId || !title) {
      return new Response(
        JSON.stringify({ error: 'blogId and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch business profile
    const { data: profile } = await supabase
      .from('business_profile')
      .select('*')
      .eq('blog_id', blogId)
      .single();

    // Fetch keyword analyses with high search volume
    const { data: keywordData } = await supabase
      .from('keyword_analyses')
      .select('keyword, search_volume')
      .eq('blog_id', blogId)
      .order('search_volume', { ascending: false })
      .limit(50);

    const relevanceFactors: RelevanceFactors = {
      keyword_match: { score: 0, matched: [] },
      pain_alignment: { score: 0, matched: [] },
      desire_alignment: { score: 0, matched: [] },
      high_volume_keywords: { score: 0, matched: [] },
    };

    const titleLower = title.toLowerCase();
    const keywordsLower = (keywords || []).map(k => k.toLowerCase());
    const allTerms = [titleLower, ...keywordsLower];

    // 1. Match with brand keywords (0-25 pts)
    const brandKeywords = profile?.brand_keywords || [];
    const matchedBrandKeywords: string[] = [];
    
    for (const bk of brandKeywords) {
      const bkLower = bk.toLowerCase();
      if (allTerms.some(term => term.includes(bkLower) || bkLower.includes(term.split(' ')[0]))) {
        matchedBrandKeywords.push(bk);
      }
    }
    
    if (brandKeywords.length > 0) {
      const matchRatio = matchedBrandKeywords.length / Math.min(brandKeywords.length, 5);
      relevanceFactors.keyword_match.score = Math.round(matchRatio * 25);
      relevanceFactors.keyword_match.matched = matchedBrandKeywords;
    }

    // 2. Alignment with pain points (0-25 pts)
    const painPoints = profile?.pain_points || [];
    const matchedPains: string[] = [];
    
    for (const pain of painPoints) {
      const painWords = pain.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      if (painWords.some((pw: string) => allTerms.some(term => term.includes(pw)))) {
        matchedPains.push(pain);
      }
    }
    
    if (painPoints.length > 0) {
      const matchRatio = matchedPains.length / Math.min(painPoints.length, 5);
      relevanceFactors.pain_alignment.score = Math.round(matchRatio * 25);
      relevanceFactors.pain_alignment.matched = matchedPains;
    }

    // 3. Alignment with desires (0-25 pts)
    const desires = profile?.desires || [];
    const matchedDesires: string[] = [];
    
    for (const desire of desires) {
      const desireWords = desire.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      if (desireWords.some((dw: string) => allTerms.some(term => term.includes(dw)))) {
        matchedDesires.push(desire);
      }
    }
    
    if (desires.length > 0) {
      const matchRatio = matchedDesires.length / Math.min(desires.length, 5);
      relevanceFactors.desire_alignment.score = Math.round(matchRatio * 25);
      relevanceFactors.desire_alignment.matched = matchedDesires;
    }

    // 4. High-volume keywords match (0-25 pts)
    const highVolumeKeywords = keywordData || [];
    const matchedHighVolume: string[] = [];
    
    for (const kw of highVolumeKeywords.slice(0, 20)) {
      const kwLower = kw.keyword.toLowerCase();
      if (allTerms.some(term => term.includes(kwLower) || kwLower.includes(term))) {
        matchedHighVolume.push(kw.keyword);
      }
    }
    
    if (highVolumeKeywords.length > 0) {
      const matchRatio = matchedHighVolume.length / Math.min(highVolumeKeywords.length, 10);
      relevanceFactors.high_volume_keywords.score = Math.round(matchRatio * 25);
      relevanceFactors.high_volume_keywords.matched = matchedHighVolume;
    }

    // Calculate total score
    const totalScore = 
      relevanceFactors.keyword_match.score +
      relevanceFactors.pain_alignment.score +
      relevanceFactors.desire_alignment.score +
      relevanceFactors.high_volume_keywords.score;

    console.log('Calculated score:', totalScore, 'factors:', relevanceFactors);

    // Update opportunity if ID provided
    if (opportunityId) {
      const { error: updateError } = await supabase
        .from('article_opportunities')
        .update({
          relevance_score: totalScore,
          relevance_factors: relevanceFactors,
        })
        .eq('id', opportunityId);

      if (updateError) {
        console.error('Error updating opportunity:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        score: totalScore,
        factors: relevanceFactors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-opportunity-score:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
