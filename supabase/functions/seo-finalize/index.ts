// supabase/functions/seo-finalize/index.ts
// Atomic Edge Function — Final SEO pass: meta tags, keyword density, schema markup
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeSeoScore,
  stripHtml,
  computeWordCount,
  type SEOInput,
} from "../_shared/seoScoring.ts";
import { callWriter } from "../_shared/aiProviders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { job_id, tenant_id, payload } = await req.json();

    const articleId = payload?.article_id;
    const blogId = payload?.blog_id;

    if (!articleId) {
      return new Response(
        JSON.stringify({ error: "article_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SEO-FINALIZE] Starting for article ${articleId}`);

    // 1. Fetch article
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("*")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      throw new Error(`Article not found: ${articleError?.message}`);
    }

    const content = article.content || "";
    const cleanText = stripHtml(content);
    const keywords = article.keywords || [];

    // 2. Compute initial SEO score
    const seoInput: SEOInput = {
      title: article.title || "",
      meta_description: article.meta_description || "",
      content_text: cleanText,
      keywords,
      has_featured_image: !!article.featured_image_url,
    };

    const initialScore = computeSeoScore(seoInput);

    // 3. Auto-fix: generate missing meta description
    let updatedMeta = article.meta_description || "";
    let metaWasFixed = false;

    if (!updatedMeta || updatedMeta.length < 80) {
      try {
        const metaAiResult = await callWriter({
          messages: [
            {
              role: "system",
              content: `Crie uma meta description SEO-otimizada para o artigo. 
                - Entre 140-155 caracteres
                - Inclua a keyword principal: "${keywords[0] || ""}"
                - Use CTA ou pergunta para gerar cliques
                - NUNCA exceda 160 caracteres
                - Retorne APENAS a meta description, sem aspas`,
            },
            {
              role: "user",
              content: `Título: ${article.title}\nResumo: ${cleanText.slice(0, 500)}`,
            },
          ],
          temperature: 0.6,
          maxTokens: 200,
          tenantId: tenant_id,
          blogId: article.blog_id,
        });

        if (metaAiResult.success && metaAiResult.data?.content) {
          updatedMeta = metaAiResult.data.content.replace(/^["']|["']$/g, "").trim().slice(0, 160);
          metaWasFixed = true;
        }
      } catch (e) {
        console.warn("[SEO-FINALIZE] Meta generation failed:", e);
      }
    }

    // 4. Auto-fix: improve meta title if too long/short
    let updatedTitle = article.meta_title || article.title || "";
    let titleWasFixed = false;

    if (updatedTitle.length > 65 || updatedTitle.length < 30) {
      try {
        const titleAiResult = await callWriter({
          messages: [
            {
              role: "system",
              content: `Otimize o meta title para SEO.
                - Entre 50-60 caracteres
                - Inclua a keyword "${keywords[0] || ""}"
                - Mantenha legível e atrativo 
                - Retorne APENAS o title, sem aspas`,
            },
            { role: "user", content: `Title atual: ${updatedTitle}` },
          ],
          temperature: 0.5,
          maxTokens: 100,
          tenantId: tenant_id,
          blogId: article.blog_id,
        });

        if (titleAiResult.success && titleAiResult.data?.content) {
          updatedTitle = titleAiResult.data.content.replace(/^["']|["']$/g, "").trim().slice(0, 65);
          titleWasFixed = true;
        }
      } catch (e) {
        console.warn("[SEO-FINALIZE] Title optimization failed:", e);
      }
    }

    // 5. Recalculate SEO score with fixes
    const fixedInput: SEOInput = {
      ...seoInput,
      title: updatedTitle,
      meta_description: updatedMeta,
    };
    const finalScore = computeSeoScore(fixedInput);

    // 6. Build schema.org markup
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: updatedTitle,
      description: updatedMeta,
      keywords: keywords.join(", "),
      wordCount: computeWordCount(cleanText),
      datePublished: article.created_at,
      dateModified: new Date().toISOString(),
    };

    // 7. Update article with SEO improvements
    const updates: Record<string, unknown> = {
      meta_title: updatedTitle,
      meta_description: updatedMeta,
      seo_score: finalScore.score_total,
      schema_markup: schema,
      updated_at: new Date().toISOString(),
    };

    await supabase.from("articles").update(updates).eq("id", articleId);

    // 8. Upsert to article_content_scores
    await supabase.from("article_content_scores").upsert(
      {
        article_id: articleId,
        blog_id: article.blog_id,
        seo_score: finalScore.score_total,
        seo_breakdown: finalScore.breakdown,
        seo_diagnostics: finalScore.diagnostics,
        total_score: finalScore.score_total,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "article_id" }
    );

    console.log(
      `[SEO-FINALIZE] ✅ Score: ${initialScore.score_total} → ${finalScore.score_total} | Meta fixed: ${metaWasFixed} | Title fixed: ${titleWasFixed}`
    );

    // 9. Return SeoFinalizeOutput contract
    const result = {
      article_id: articleId,
      seo_score: finalScore.score_total,
      improvements: [
        ...(metaWasFixed ? ["Meta description gerada/otimizada"] : []),
        ...(titleWasFixed ? ["Meta title otimizado"] : []),
      ],
      breakdown: finalScore.breakdown,
      schema_injected: true,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[SEO-FINALIZE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
