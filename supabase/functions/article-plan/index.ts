// supabase/functions/article-plan/index.ts
// Atomic Edge Function — Plans outline, creates article record, returns structured outline
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  selectTemplateForBrief,
  buildOutlineStructure,
  validateBrief,
  type ArticleBrief,
} from "../_shared/pipelineStages.ts";
import { getEditorialDecision } from "../_shared/editorialOrchestrator.ts";

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

    if (!payload?.keyword || !payload?.blog_id) {
      return new Response(
        JSON.stringify({ error: "keyword and blog_id are required in payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ARTICLE-PLAN] Starting for job ${job_id} | keyword: "${payload.keyword}"`);

    // 1. Fetch business profile for editorial context
    const { data: businessProfile } = await supabase
      .from("business_profile")
      .select("niche, services, company_name, whatsapp, city, state")
      .eq("blog_id", payload.blog_id)
      .maybeSingle();

    const city = payload.city || businessProfile?.city || "";
    const niche = payload.niche || businessProfile?.niche || "default";

    // 2. Build brief
    const brief: ArticleBrief = {
      keyword: payload.keyword,
      city,
      state: payload.state || businessProfile?.state || "",
      blogId: payload.blog_id,
      niche,
      mode: payload.target_words >= 1500 ? "authority" : "entry",
      webResearch: true,
      businessName: businessProfile?.company_name || "",
      businessWhatsapp: businessProfile?.whatsapp || "",
    };

    // 3. Validate brief
    const validation = validateBrief(brief);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: `Brief validation failed: ${validation.errors.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Select template + editorial decision
    const templateResult = await selectTemplateForBrief(supabase, brief);

    let editorialDecision;
    try {
      editorialDecision = await getEditorialDecision({
        supabase,
        keyword: payload.keyword,
        city,
        niche,
        blogId: payload.blog_id,
        funnel_mode: payload.funnel_stage || "topo",
        article_goal: "educar",
      });
    } catch (e) {
      console.warn("[ARTICLE-PLAN] Editorial decision fallback:", e);
    }

    // 5. Build outline structure
    const outline = buildOutlineStructure(
      templateResult.template,
      templateResult.variant,
      brief.mode,
      payload.keyword,
      city,
      businessProfile?.company_name
    );

    // 6. Create article record
    const slug = outline.urlSlug || payload.keyword
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: article, error: insertError } = await supabase
      .from("articles")
      .insert({
        title: outline.h1,
        slug,
        blog_id: payload.blog_id,
        user_id: tenant_id,
        status: "generating",
        keywords: [payload.keyword],
        meta_title: outline.metaTitle,
        meta_description: outline.metaDescription,
        content: "",
        article_structure_type: templateResult.template,
        editorial_angle: editorialDecision?.angle || null,
        funnel_stage: payload.funnel_stage || "topo",
        generation_config: {
          target_words: payload.target_words || outline.totalTargetWords,
          image_count: payload.image_count || 4,
          brand_voice: payload.brand_voice || null,
          layout_preferences: payload.layout_preferences || null,
          section_count: outline.sections.length,
        },
      })
      .select("id")
      .single();

    if (insertError || !article) {
      throw new Error(`Failed to create article: ${insertError?.message}`);
    }

    console.log(`[ARTICLE-PLAN] ✅ Article ${article.id} created | ${outline.sections.length} sections`);

    // 7. Detect entities from keyword + niche
    const entities = [
      payload.keyword,
      ...(businessProfile?.services || []).slice(0, 5),
      city,
      niche,
    ].filter(Boolean);

    // 8. Return structured output matching ArticlePlanOutput contract
    const result = {
      article_id: article.id,
      outline: {
        title: outline.h1,
        slug,
        meta_description: outline.metaDescription,
        h2: outline.sections
          .filter((s) => s.h2)
          .map((s) => ({
            heading: s.h2!,
            subheadings: s.h3s || [],
            target_words: s.targetWords,
          })),
        estimated_word_count: outline.totalTargetWords,
      },
      entities,
      entity_coverage_target: 0.7,
      editorial_decision: editorialDecision || null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ARTICLE-PLAN] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
