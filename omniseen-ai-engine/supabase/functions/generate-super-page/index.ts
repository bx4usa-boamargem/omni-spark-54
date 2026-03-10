// ============================================================
// Edge Function: generate-super-page
// POST { tenant_id, template_id, inputs, radar_item_id? }
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runBlueprintArchitect, runSectionWriter } from "../../agents/contentAgents.ts";
import { runSEOPackFinalizer, runQualityGate } from "../../agents/seoAgents.ts";
import { suggestLinks, applyLinks } from "../../skills/conversionSkills.ts";
import type { BusinessInputs, AgentContext } from "../../types/agents.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb    = createClient(sbUrl, sbKey);

    const { tenant_id, template_id, inputs, radar_item_id, publish_mode = "draft" } = await req.json() as {
      tenant_id:      string;
      template_id:    string;
      inputs:         BusinessInputs;
      radar_item_id?: string;
      publish_mode:   "draft" | "publish";
    };

    if (!tenant_id || !template_id || !inputs) {
      return new Response(
        JSON.stringify({ error: "tenant_id, template_id, and inputs are required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Load template defaults
    const { data: template } = await sb
      .from("super_page_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (!template) {
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const pipeline_run_id = crypto.randomUUID();
    const ctx: AgentContext = {
      tenant_id,
      pipeline_run_id,
      web_research_enabled: false,
      locale: "pt-BR",
      market: "BR",
      pipeline_context: { template, inputs },
    };

    // ── Blueprint (skip SERP for super pages — use template defaults)
    const primary_keyword = `${inputs.servico} ${inputs.cidade}`;
    const blueprint = await runBlueprintArchitect({
      primary_keyword,
      secondary_keywords: [inputs.empresa, inputs.estado, `${inputs.servico} ${inputs.estado}`],
      servico:   inputs.servico,
      cidade:    inputs.cidade,
      estado:    inputs.estado,
      intent:    "local",
      serp_analysis: {
        top10: [], local_pack: [], domains_top3: [],
        avg_word_count_estimate: template.default_seo_json?.word_count_target ?? 1200,
        content_formats_detected: ["guide", "faq"],
        gaps: ["Áreas atendidas", "FAQ local"],
        paa_questions: [],
      },
      entity_data: {
        entities: [],
        schema_type_recommended: "LocalBusiness",
        topicos_semanticos: [inputs.servico, inputs.cidade, inputs.estado],
        categoria_google: inputs.servico,
      },
      template_id,
      word_count_target: template.default_seo_json?.word_count_target ?? 1200,
    }, ctx);

    // ── Write sections
    const sectionOut = await runSectionWriter({
      blueprint,
      servico:              inputs.servico,
      cidade:               inputs.cidade,
      estado:               inputs.estado,
      empresa:              inputs.empresa,
      telefone:             inputs.telefone,
      web_research_enabled: false,
    }, ctx);

    // ── Internal links
    const { data: tenantContent } = await sb
      .from("articles")
      .select("id, title, slug, excerpt")
      .eq("tenant_id", tenant_id)
      .eq("status", "published")
      .limit(20);

    const pages = (tenantContent ?? []).map((p: Record<string,string>) => ({
      id: p.id, title: p.title, slug: p.slug,
      url: `/${p.slug}`, type: "blog" as const, keywords: [], excerpt: p.excerpt ?? "",
    }));
    const links   = await suggestLinks(sectionOut.full_content_html, pages, primary_keyword);
    const content = applyLinks(sectionOut.full_content_html, links);

    // ── SEO Pack (with full local schema)
    const { data: tenant } = await sb.from("tenants").select("slug").eq("id", tenant_id).single();
    const portal_base_url  = `https://${tenant?.slug}.app.omniseen.app`;

    const seoOut = await runSEOPackFinalizer({
      blueprint, content_html: content, business: inputs, portal_base_url,
    }, ctx);

    // ── Quality Gate
    const qaResult = await runQualityGate({
      content_html: content, blueprint, business: inputs,
      web_research_enabled: false,
      tenant_pages_sample: (tenantContent ?? []).map((p: Record<string,string>) => ({
        title: p.title, slug: p.slug, content_sample: p.excerpt ?? "",
      })),
    }, ctx);

    const now = new Date().toISOString();

    // ── Save to landing_pages
    const { data: page, error: pageError } = await sb.from("landing_pages").insert({
      tenant_id,
      template_id,
      title:            blueprint.h1,
      slug:             seoOut.slug,
      status:           publish_mode === "publish" ? "published" : "draft",
      inputs_json:      inputs,
      content:          content,
      meta_title:       seoOut.meta_title,
      meta_description: seoOut.meta_description,
      schema_json:      seoOut.schema_jsonld,
      internal_links_json: links,
      published_at:     publish_mode === "publish" ? now : null,
      created_at:       now,
      updated_at:       now,
    }).select("id").single();

    if (pageError) throw new Error(`Failed to save super page: ${pageError.message}`);

    // ── Version snapshot
    await sb.from("super_page_versions").insert({
      super_page_id:    page!.id,
      tenant_id,
      version_number:   1,
      content_json:     { html: content },
      meta_title:       seoOut.meta_title,
      meta_description: seoOut.meta_description,
      schema_json:      seoOut.schema_jsonld,
      created_at:       now,
    }).catch(console.error);

    return new Response(JSON.stringify({
      success:        true,
      page_id:        page?.id,
      slug:           seoOut.slug,
      quality_score:  qaResult.score,
      approved:       qaResult.approved,
      warnings:       qaResult.warnings,
    }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
