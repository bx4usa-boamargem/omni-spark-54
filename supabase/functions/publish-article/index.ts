// supabase/functions/publish-article/index.ts
// Atomic Edge Function — Publishes an approved article (sets status, timestamps, notifications)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    if (!articleId) {
      return new Response(
        JSON.stringify({ error: "article_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PUBLISH-ARTICLE] Starting for article ${articleId}`);

    // 1. Fetch article
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, slug, blog_id, status, quality_gate_status, content")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      throw new Error(`Article not found: ${articleError?.message}`);
    }

    // 2. Safety check — only publish if quality gate approved or status is ready
    if (
      article.quality_gate_status !== "approved" &&
      article.status !== "ready_for_publish"
    ) {
      console.warn(
        `[PUBLISH-ARTICLE] Article ${articleId} not approved. Status: ${article.status}, QG: ${article.quality_gate_status}`
      );
      return new Response(
        JSON.stringify({
          article_id: articleId,
          published: false,
          reason: `Article not ready. Status: ${article.status}, Quality Gate: ${article.quality_gate_status}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check for existing published article with same slug
    const { data: duplicateSlug } = await supabase
      .from("articles")
      .select("id")
      .eq("blog_id", article.blog_id)
      .eq("slug", article.slug)
      .eq("status", "published")
      .neq("id", articleId)
      .maybeSingle();

    if (duplicateSlug) {
      // Append timestamp to slug to avoid collision
      const deduplicatedSlug = `${article.slug}-${Date.now().toString(36)}`;
      await supabase
        .from("articles")
        .update({ slug: deduplicatedSlug })
        .eq("id", articleId);
      console.log(`[PUBLISH-ARTICLE] Slug collision resolved: ${article.slug} → ${deduplicatedSlug}`);
    }

    // 4. Publish — update status
    const publishedAt = new Date().toISOString();

    await supabase
      .from("articles")
      .update({
        status: "published",
        published_at: publishedAt,
        updated_at: publishedAt,
      })
      .eq("id", articleId);

    // 5. Check blog automation for auto-scheduling
    const { data: automation } = await supabase
      .from("blog_automation")
      .select("notify_on_publish, auto_index")
      .eq("blog_id", article.blog_id)
      .maybeSingle();

    // 6. Increment blog article count
    await supabase.rpc("increment_blog_article_count", {
      p_blog_id: article.blog_id,
    }).catch(() => {
      // RPC may not exist yet, silently fail
      console.warn("[PUBLISH-ARTICLE] increment_blog_article_count RPC not found");
    });

    // 7. Create notification if enabled
    if (automation?.notify_on_publish) {
      await supabase
        .from("notifications")
        .insert({
          user_id: tenant_id,
          type: "article_published",
          title: "Artigo publicado",
          message: `"${article.title}" foi publicado com sucesso.`,
          metadata: { article_id: articleId, blog_id: article.blog_id },
          read: false,
        })
        .catch((e: Error) => console.warn("[PUBLISH-ARTICLE] Notification insert failed:", e));
    }

    console.log(`[PUBLISH-ARTICLE] ✅ Article ${articleId} published at ${publishedAt}`);

    // 8. Return PublishOutput contract
    const result = {
      article_id: articleId,
      published: true,
      published_at: publishedAt,
      url: article.slug,
      should_index: automation?.auto_index !== false,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[PUBLISH-ARTICLE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
