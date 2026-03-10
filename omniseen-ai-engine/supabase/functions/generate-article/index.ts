// ============================================================
// Edge Function: generate-article
// POST { tenant_id, radar_item_id?, manual_topic?, business, publish_mode }
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runArticlePipeline } from "../../agents/orchestrator.ts";
import type { BusinessInputs } from "../../types/agents.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb    = createClient(sbUrl, sbKey);

    const body = await req.json();
    const {
      tenant_id,
      radar_item_id,
      manual_topic,
      business,
      publish_mode = "draft",
      web_research_enabled = false,
    } = body as {
      tenant_id:            string;
      radar_item_id?:       string;
      manual_topic?:        string;
      business:             BusinessInputs;
      publish_mode:         "draft" | "schedule" | "publish";
      web_research_enabled: boolean;
    };

    if (!tenant_id || !business) {
      return new Response(
        JSON.stringify({ error: "tenant_id and business are required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Resolve topic from radar_item if provided
    let primary_keyword    = manual_topic ?? `${business.servico} ${business.cidade}`;
    let secondary_keywords: string[] = [];
    let intent: "informational" | "commercial" | "local" | "transactional" = "local";

    if (radar_item_id) {
      const { data: item } = await sb
        .from("article_opportunities")
        .select("suggested_title, relevance_score")
        .eq("id", radar_item_id)
        .single();

      if (item) {
        primary_keyword    = item.suggested_title;
        secondary_keywords = [business.servico, business.cidade];
        intent             = "commercial";
        // Mark as converting
        await sb.from("article_opportunities")
          .update({ status: "converting" })
          .eq("id", radar_item_id);
      }
    }

    // Create pipeline run record
    const pipeline_run_id = crypto.randomUUID();
    await sb.from("pipeline_runs").insert({
      id:           pipeline_run_id,
      tenant_id,
      pipeline_key: "generate_article",
      status:       "running",
      context_json: { primary_keyword, business, publish_mode },
      created_at:   new Date().toISOString(),
    });

    // Get tenant portal URL + active blog_id
    const { data: tenant } = await sb.from("tenants").select("slug").eq("id", tenant_id).single();
    const portal_base_url  = `https://${tenant?.slug}.app.omniseen.app`;

    // Resolve active blog for this tenant (needed for content score)
    const { data: blogRow } = await sb
      .from("blogs")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    const blog_id = blogRow?.id ?? null;

    // Run pipeline
    const result = await runArticlePipeline({
      tenant_id,
      primary_keyword,
      secondary_keywords,
      business,
      intent,
      web_research_enabled,
      publish_mode,
      portal_base_url,
      pipeline_run_id,
    });

    if (!result.approved) {
      await sb.from("pipeline_runs").update({
        status: "failed", error_message: result.warnings.join("; "), completed_at: new Date().toISOString(),
      }).eq("id", pipeline_run_id);

      return new Response(JSON.stringify({
        error:    "Quality gate failed",
        score:    result.quality_score,
        warnings: result.warnings,
      }), { status: 422, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Save article
    const now = new Date().toISOString();
    const { data: article, error: articleError } = await sb.from("articles").insert({
      tenant_id,
      blog_id,                                              // D2: blog_id do tenant ativo
      title:            result.blueprint.h1,
      slug:             result.seo.slug,
      excerpt:          result.blueprint.meta_description,
      content:          result.content_html,
      meta_title:       result.seo.meta_title,
      meta_description: result.seo.meta_description,
      schema_json:      result.seo.schema_jsonld,
      focus_keyword:    primary_keyword,                    // D1: essencial para useContentScore
      status:           publish_mode === "publish" ? "published" : "draft",
      published_at:     publish_mode === "publish" ? now : null,
      source_opportunity_id: radar_item_id ?? null,
      created_at:       now,
      updated_at:       now,
    }).select("id").single();

    if (articleError) throw new Error(`Failed to save article: ${articleError.message}`);

    // ── Salvar Content Score ──────────────────────────────────────────
    // D3: Calcular métricas reais do HTML em vez de zeros hardcoded.
    // O frontend lê article_content_scores via useContentScore.
    if (article?.id) {
      const html = result.content_html;

      // Contadores reais extraídos do HTML
      const h2_count        = (html.match(/<h2[^>]*>/gi) ?? []).length;
      const h3_count        = (html.match(/<h3[^>]*>/gi) ?? []).length;
      const paragraph_count = (html.match(/<p[^>]*>/gi) ?? []).length;
      const image_count     = (html.match(/<img[^>]*>/gi) ?? []).length;
      const list_count      = (html.match(/<ul[^>]*>|<ol[^>]*>/gi) ?? []).length;

      // Word count real (sem tags HTML)
      const plain_text      = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const real_word_count = plain_text.split(" ").filter(Boolean).length;

      // SEO breakdown estruturado
      const breakdown = {
        word_count:       { value: real_word_count, weight: 25, score: Math.min(real_word_count / 15, 100) },
        h2_count:         { value: h2_count,        weight: 15, score: h2_count >= 3 ? 100 : (h2_count / 3) * 100 },
        h3_count:         { value: h3_count,        weight: 10, score: h3_count >= 2 ? 100 : (h3_count / 2) * 100 },
        paragraph_count:  { value: paragraph_count, weight: 10, score: paragraph_count >= 5 ? 100 : (paragraph_count / 5) * 100 },
        list_count:       { value: list_count,       weight: 10, score: list_count >= 2 ? 100 : (list_count / 2) * 100 },
        image_count:      { value: image_count,      weight: 5,  score: image_count >= 1 ? 100 : 0 },
      };

      const { error: scoreError } = await sb.from("article_content_scores").upsert({
        article_id:             article.id,
        total_score:            result.quality_score,
        word_count:             real_word_count,
        h2_count,
        h3_count,
        paragraph_count,
        image_count,
        list_count,
        semantic_coverage:      Math.round(result.quality_score * 0.8), // proxy até análise SERP
        meets_market_standards: result.quality_score >= 70,
        breakdown,
        comparison:             {},
        recommendations:        result.warnings ?? [],
        calculated_at:          now,
      }, { onConflict: "article_id" });

      if (scoreError) {
        console.warn("[generate-article] Failed to save content score:", scoreError.message);
      } else {
        console.log(
          `[generate-article] Score saved: ${result.quality_score}/100 | ` +
          `${real_word_count} words | H2:${h2_count} H3:${h3_count} P:${paragraph_count} | article ${article.id}`
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // Mark radar item as converted
    if (radar_item_id) {
      await sb.from("article_opportunities")
        .update({ status: "converted" })
        .eq("id", radar_item_id);
    }

    // Update pipeline run
    await sb.from("pipeline_runs").update({
      status: "done", completed_at: now,
      context_json: { ...result, article_id: article?.id },
    }).eq("id", pipeline_run_id);

    return new Response(JSON.stringify({
      success:        true,
      article_id:     article?.id,
      slug:           result.seo.slug,
      quality_score:  result.quality_score,
      word_count:     result.word_count,
      pipeline_run_id,
    }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("generate-article error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
