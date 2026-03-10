// supabase/functions/index-article/index.ts
// Atomic Edge Function — Triggers Google Indexing API for the published article
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
    const blogId = payload?.blog_id;

    if (!articleId || !blogId) {
      return new Response(
        JSON.stringify({ error: "article_id and blog_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[INDEX-ARTICLE] Starting for article ${articleId}`);

    // 1. Fetch article
    const { data: article } = await supabase
      .from("articles")
      .select("id, slug, status, published_at")
      .eq("id", articleId)
      .single();

    if (!article || article.status !== "published") {
      return new Response(
        JSON.stringify({
          article_id: articleId,
          indexed: false,
          reason: `Article not published. Status: ${article?.status || "not found"}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch blog domain
    const { data: blog } = await supabase
      .from("blogs")
      .select("custom_domain, subdomain")
      .eq("id", blogId)
      .maybeSingle();

    const domain = blog?.custom_domain || `${blog?.subdomain || "blog"}.omniseen.com`;
    const fullUrl = `https://${domain}/${article.slug}`;

    // 3. Check if GSC is connected
    const { data: gscConnection } = await supabase
      .from("gsc_connections")
      .select("access_token, refresh_token, site_url")
      .eq("blog_id", blogId)
      .maybeSingle();

    let indexingResult = {
      submitted: false,
      method: "none" as string,
      url: fullUrl,
      error: null as string | null,
    };

    if (gscConnection?.access_token) {
      // 4a. Use Google Indexing API
      try {
        const indexResponse = await fetch(
          "https://indexing.googleapis.com/v3/urlNotifications:publish",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${gscConnection.access_token}`,
            },
            body: JSON.stringify({
              url: fullUrl,
              type: "URL_UPDATED",
            }),
          }
        );

        if (indexResponse.ok) {
          indexingResult.submitted = true;
          indexingResult.method = "google_indexing_api";
        } else {
          const errorBody = await indexResponse.text();
          indexingResult.error = `Google Indexing API: ${indexResponse.status} - ${errorBody}`;
          console.warn(`[INDEX-ARTICLE] Indexing API error:`, errorBody);

          // If token expired, try sitemap ping as fallback
          if (indexResponse.status === 401 || indexResponse.status === 403) {
            indexingResult.method = "sitemap_ping_fallback";
          }
        }
      } catch (e) {
        indexingResult.error = `Indexing API fetch error: ${e}`;
      }
    }

    // 4b. Fallback: Sitemap ping to Google
    if (!indexingResult.submitted) {
      try {
        const sitemapUrl = `https://${domain}/sitemap.xml`;
        const pingResponse = await fetch(
          `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
        );

        indexingResult.submitted = true;
        indexingResult.method = "sitemap_ping";
        console.log(`[INDEX-ARTICLE] Sitemap ping sent: ${pingResponse.status}`);
      } catch (e) {
        console.warn("[INDEX-ARTICLE] Sitemap ping failed:", e);
      }
    }

    // 5. Log indexing attempt
    await supabase
      .from("indexing_requests")
      .insert({
        article_id: articleId,
        blog_id: blogId,
        url: fullUrl,
        method: indexingResult.method,
        status: indexingResult.submitted ? "submitted" : "failed",
        error: indexingResult.error,
        created_at: new Date().toISOString(),
      })
      .catch((e: Error) =>
        console.warn("[INDEX-ARTICLE] Failed to log indexing request:", e)
      );

    // 6. Update article indexing status
    await supabase
      .from("articles")
      .update({
        indexing_status: indexingResult.submitted ? "submitted" : "pending",
        indexing_submitted_at: indexingResult.submitted
          ? new Date().toISOString()
          : null,
      })
      .eq("id", articleId);

    console.log(
      `[INDEX-ARTICLE] ✅ Article ${articleId} | Method: ${indexingResult.method} | Submitted: ${indexingResult.submitted}`
    );

    // 7. Return IndexOutput contract
    const result = {
      article_id: articleId,
      indexed: indexingResult.submitted,
      method: indexingResult.method,
      url: fullUrl,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[INDEX-ARTICLE] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
