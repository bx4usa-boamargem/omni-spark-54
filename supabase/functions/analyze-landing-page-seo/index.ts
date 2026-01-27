import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { computeSeoScore, stripHtml } from "../_shared/seoScoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  landing_page_id: string;
  include_serp?: boolean;
}

/**
 * Extract all textual content from landing page data for SEO analysis
 */
function extractLandingPageContent(pageData: any): string {
  const parts: string[] = [];

  // Hero
  if (pageData?.hero) {
    parts.push(pageData.hero.title || pageData.hero.headline || "");
    parts.push(pageData.hero.subtitle || pageData.hero.subheadline || "");
  }

  // Services
  if (Array.isArray(pageData?.services)) {
    pageData.services.forEach((s: any) => {
      parts.push(s.title || "");
      parts.push(s.description || "");
    });
  }

  // Service Details
  if (Array.isArray(pageData?.service_details)) {
    pageData.service_details.forEach((d: any) => {
      parts.push(d.title || "");
      parts.push(d.content || "");
      if (Array.isArray(d.bullets)) {
        d.bullets.forEach((b: string) => parts.push(b));
      }
    });
  }

  // Why Choose Us
  if (Array.isArray(pageData?.why_choose_us)) {
    pageData.why_choose_us.forEach((w: any) => {
      parts.push(w.title || "");
      parts.push(w.description || "");
    });
  }

  // Process Steps
  if (Array.isArray(pageData?.process_steps)) {
    pageData.process_steps.forEach((p: any) => {
      parts.push(p.title || "");
      parts.push(p.description || "");
    });
  }

  // FAQ
  if (Array.isArray(pageData?.faq)) {
    pageData.faq.forEach((f: any) => {
      parts.push(f.question || "");
      parts.push(f.answer || "");
    });
  }

  // Testimonials
  if (Array.isArray(pageData?.testimonials)) {
    pageData.testimonials.forEach((t: any) => {
      parts.push(t.quote || "");
    });
  }

  // Authority Content (SEO block)
  if (pageData?.authority_content) {
    parts.push(pageData.authority_content);
  }

  // About section (institutional)
  if (pageData?.about) {
    parts.push(pageData.about.mission || "");
    parts.push(pageData.about.vision || "");
    parts.push(pageData.about.history || "");
    parts.push(pageData.about.bio || "");
  }

  // Methodology (specialist)
  if (pageData?.methodology) {
    parts.push(pageData.methodology.name || "");
    parts.push(pageData.methodology.unique_selling_point || "");
    if (Array.isArray(pageData.methodology.steps)) {
      pageData.methodology.steps.forEach((s: any) => {
        parts.push(typeof s === "string" ? s : s.title || s.description || "");
      });
    }
  }

  return parts.join(" ");
}

/**
 * Count images in page data
 */
function countImages(pageData: any): number {
  let count = 0;
  
  if (pageData?.hero?.background_image_url || pageData?.hero?.image_url) count++;
  
  if (Array.isArray(pageData?.services)) {
    count += pageData.services.filter((s: any) => s.image_url).length;
  }
  
  if (Array.isArray(pageData?.service_details)) {
    count += pageData.service_details.filter((d: any) => d.image_url).length;
  }
  
  if (Array.isArray(pageData?.testimonials)) {
    count += pageData.testimonials.filter((t: any) => t.avatar_url).length;
  }
  
  if (pageData?.specialist?.photo_prompt || pageData?.specialist?.photo_url) count++;
  
  return count;
}

/**
 * Count H2 equivalents in structured content
 */
function countH2Equivalents(pageData: any): number {
  let count = 0;
  
  // Each major section title counts as H2
  if (Array.isArray(pageData?.services)) count += pageData.services.length;
  if (Array.isArray(pageData?.service_details)) count += pageData.service_details.length;
  if (Array.isArray(pageData?.why_choose_us)) count += 1; // Section title
  if (Array.isArray(pageData?.process_steps)) count += 1;
  if (Array.isArray(pageData?.faq)) count += 1;
  if (pageData?.about) count += 1;
  if (pageData?.methodology) count += 1;
  
  return count;
}

/**
 * Generate recommendations based on SEO analysis
 */
function generateRecommendations(
  seoResult: any,
  pageData: any,
  seoTitle: string,
  seoDescription: string
): any[] {
  const recommendations: any[] = [];
  const { breakdown, diagnostics } = seoResult;

  // Title recommendations
  if (breakdown.title_points < 15) {
    if (diagnostics.title_length < 30) {
      recommendations.push({
        type: "title",
        severity: "error",
        message: "Título muito curto. Adicione mais detalhes para melhorar o SEO.",
        auto_fixable: true,
      });
    } else if (diagnostics.title_length > 70) {
      recommendations.push({
        type: "title",
        severity: "warning",
        message: "Título muito longo. Reduza para 50-60 caracteres.",
        auto_fixable: true,
      });
    } else if (breakdown.title_points < 15) {
      recommendations.push({
        type: "title",
        severity: "info",
        message: "Inclua a palavra-chave principal no título.",
        auto_fixable: true,
      });
    }
  }

  // Meta description recommendations
  if (breakdown.meta_points < 15) {
    if (diagnostics.meta_length < 100) {
      recommendations.push({
        type: "meta",
        severity: "warning",
        message: "Meta description curta. Expanda para 140-160 caracteres.",
        auto_fixable: true,
      });
    } else if (diagnostics.meta_length > 160) {
      recommendations.push({
        type: "meta",
        severity: "info",
        message: "Meta description pode ser cortada no Google. Reduza para 160 chars.",
        auto_fixable: true,
      });
    }
  }

  // Content recommendations
  if (breakdown.content_points < 18) {
    const wordCount = diagnostics.word_count;
    if (wordCount < 800) {
      recommendations.push({
        type: "content",
        severity: "warning",
        message: `Conteúdo com ${wordCount} palavras. Expanda para pelo menos 1.500 palavras.`,
        auto_fixable: true,
      });
    } else if (wordCount < 1500) {
      recommendations.push({
        type: "content",
        severity: "info",
        message: `Adicione mais ${1500 - wordCount} palavras para score máximo.`,
        auto_fixable: true,
      });
    }
  }

  // Image recommendations
  const imageCount = countImages(pageData);
  if (breakdown.image_points < 15 || imageCount < 3) {
    recommendations.push({
      type: "image",
      severity: "warning",
      message: "Adicione mais imagens para melhorar o engajamento visual.",
      auto_fixable: false,
    });
  }

  // Density recommendations
  if (breakdown.density_points < 15) {
    recommendations.push({
      type: "density",
      severity: "info",
      message: "Inclua as palavras-chave de forma natural ao longo do conteúdo.",
      auto_fixable: true,
    });
  }

  return recommendations;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { landing_page_id, include_serp = false }: AnalyzeRequest = await req.json();

    if (!landing_page_id) {
      return new Response(
        JSON.stringify({ success: false, error: "landing_page_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ANALYZE-LP-SEO] Starting analysis for page: ${landing_page_id}`);

    // Fetch landing page
    const { data: page, error: pageError } = await supabase
      .from("landing_pages")
      .select("*, blogs(niche_profile_id)")
      .eq("id", landing_page_id)
      .single();

    if (pageError || !page) {
      console.error("[ANALYZE-LP-SEO] Page not found:", pageError);
      return new Response(
        JSON.stringify({ success: false, error: "Landing page not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pageData = page.page_data || {};
    const seoTitle = page.seo_title || page.title || "";
    const seoDescription = page.seo_description || "";
    const seoKeywords = page.seo_keywords || [];

    // Extract content and compute score
    const contentText = extractLandingPageContent(pageData);
    const cleanText = stripHtml(contentText);

    console.log(`[ANALYZE-LP-SEO] Extracted ${cleanText.split(/\s+/).length} words`);

    const seoResult = computeSeoScore({
      title: seoTitle,
      meta_description: seoDescription,
      content_text: cleanText,
      keywords: seoKeywords,
      has_featured_image: !!(page.featured_image_url || pageData?.hero?.background_image_url),
    });

    // Enrich diagnostics with landing page specific metrics
    const enrichedDiagnostics = {
      ...seoResult.diagnostics,
      h2_count: countH2Equivalents(pageData),
      image_count: countImages(pageData),
    };

    // Generate recommendations
    const recommendations = generateRecommendations(
      { ...seoResult, diagnostics: enrichedDiagnostics },
      pageData,
      seoTitle,
      seoDescription
    );

    // Build metrics object
    const seoMetrics = {
      breakdown: seoResult.breakdown,
      diagnostics: enrichedDiagnostics,
      serp_benchmark: include_serp ? {
        avg_words_niche: 1500,
        competitors_analyzed: 0,
        semantic_coverage: 0,
      } : null,
    };

    // Save snapshot to database
    const { error: updateError } = await supabase
      .from("landing_pages")
      .update({
        seo_score: seoResult.score_total,
        seo_metrics: seoMetrics,
        seo_recommendations: recommendations,
        seo_analyzed_at: new Date().toISOString(),
      })
      .eq("id", landing_page_id);

    if (updateError) {
      console.error("[ANALYZE-LP-SEO] Failed to save snapshot:", updateError);
    }

    console.log(`[ANALYZE-LP-SEO] Analysis complete. Score: ${seoResult.score_total}`);

    return new Response(
      JSON.stringify({
        success: true,
        score_total: seoResult.score_total,
        breakdown: seoResult.breakdown,
        diagnostics: enrichedDiagnostics,
        recommendations,
        serp_benchmark: seoMetrics.serp_benchmark,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[ANALYZE-LP-SEO] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
