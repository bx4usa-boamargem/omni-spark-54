// supabase/functions/interlink-article/index.ts
// Atomic Edge Function — Adds internal links between articles in the same blog
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LinkCandidate {
  anchor: string;
  target_slug: string;
  target_title: string;
}

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

    console.log(`[INTERLINK] Starting for article ${articleId}`);

    // 1. Fetch current article
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, content, keywords, slug")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      throw new Error(`Article not found: ${articleError?.message}`);
    }

    // 2. Fetch other published/ready articles from same blog for linking
    const { data: siblings } = await supabase
      .from("articles")
      .select("id, title, slug, keywords, meta_description")
      .eq("blog_id", blogId)
      .neq("id", articleId)
      .in("status", ["published", "ready_for_publish", "draft"])
      .not("slug", "is", null)
      .limit(50);

    if (!siblings || siblings.length === 0) {
      console.log("[INTERLINK] No sibling articles found. Skipping.");
      return new Response(
        JSON.stringify({
          article_id: articleId,
          links_added: 0,
          links: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch blog for base URL
    const { data: blog } = await supabase
      .from("blogs")
      .select("custom_domain, subdomain")
      .eq("id", blogId)
      .maybeSingle();

    const baseUrl = blog?.custom_domain
      ? `https://${blog.custom_domain}`
      : blog?.subdomain
        ? `https://${blog.subdomain}.omniseen.com`
        : "";

    // 4. Find keyword matches between current article and siblings
    const currentKeywords = (article.keywords || []).map((k: string) => k.toLowerCase());
    const contentLower = (article.content || "").toLowerCase();
    const links: LinkCandidate[] = [];
    let content = article.content || "";

    for (const sibling of siblings) {
      if (links.length >= 5) break; // Max 5 internal links

      const siblingKeywords = (sibling.keywords || []).map((k: string) => k.toLowerCase());

      // Find overlapping keywords
      const overlap = siblingKeywords.filter((k: string) =>
        contentLower.includes(k) && !currentKeywords.includes(k)
      );

      if (overlap.length === 0) {
        // Try matching sibling title words in content
        const titleWords = sibling.title
          .toLowerCase()
          .split(/\s+/)
          .filter((w: string) => w.length > 4);
        const titleMatch = titleWords.find((w: string) => contentLower.includes(w));
        if (!titleMatch) continue;
        overlap.push(titleMatch);
      }

      const anchor = overlap[0];
      const targetSlug = sibling.slug;
      const linkUrl = baseUrl ? `${baseUrl}/${targetSlug}` : `/${targetSlug}`;

      // Avoid linking if already linked
      if (content.includes(`](${linkUrl})`) || content.includes(`href="${linkUrl}"`)) {
        continue;
      }

      // Find first occurrence of anchor text in content (case-insensitive)
      const anchorRegex = new RegExp(`(?<![\\[\\(])\\b(${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b(?![\\]\\)])`, 'i');
      const match = content.match(anchorRegex);

      if (match && match.index !== undefined) {
        const originalText = match[1];
        const linkedText = `[${originalText}](${linkUrl})`;
        content = content.slice(0, match.index) + linkedText + content.slice(match.index + originalText.length);

        links.push({
          anchor: originalText,
          target_slug: targetSlug,
          target_title: sibling.title,
        });
      }
    }

    // 5. Update article with interlinked content
    if (links.length > 0) {
      await supabase
        .from("articles")
        .update({
          content,
          internal_links_count: links.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", articleId);
    }

    console.log(`[INTERLINK] ✅ ${links.length} links added to article ${articleId}`);

    // 6. Return InterlinkOutput contract
    const result = {
      article_id: articleId,
      links_added: links.length,
      links: links.map((l) => ({ anchor: l.anchor, target_slug: l.target_slug })),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[INTERLINK] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
