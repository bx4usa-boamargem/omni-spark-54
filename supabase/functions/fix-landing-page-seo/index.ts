import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FixRequest {
  landing_page_id: string;
  fix_types?: ("title" | "meta" | "content" | "keywords")[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { landing_page_id, fix_types = ["title", "meta"] }: FixRequest = await req.json();

    if (!landing_page_id) {
      return new Response(
        JSON.stringify({ success: false, error: "landing_page_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[FIX-LP-SEO] Starting SEO fix for page: ${landing_page_id}`);

    // Fetch landing page
    const { data: page, error: pageError } = await supabase
      .from("landing_pages")
      .select("*")
      .eq("id", landing_page_id)
      .single();

    if (pageError || !page) {
      return new Response(
        JSON.stringify({ success: false, error: "Landing page not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch business profile for context
    const { data: profile } = await supabase
      .from("business_profile")
      .select("*")
      .eq("blog_id", page.blog_id)
      .single();

    const pageData = page.page_data || {};
    const currentTitle = page.seo_title || page.title || "";
    const currentMeta = page.seo_description || "";
    const currentKeywords = page.seo_keywords || [];

    // Build context for AI
    const context = {
      company: profile?.company_name || "Empresa",
      niche: profile?.niche || "",
      city: profile?.city || "",
      services: profile?.services || "",
      heroTitle: pageData?.hero?.title || pageData?.hero?.headline || "",
      heroSubtitle: pageData?.hero?.subtitle || pageData?.hero?.subheadline || "",
    };

    const updates: Record<string, any> = {};
    const fixes: string[] = [];

    // Use Lovable AI for improvements
    if (lovableApiKey) {
      const aiPrompt = `Você é um especialista em SEO para landing pages de serviços locais.

CONTEXTO DA PÁGINA:
- Empresa: ${context.company}
- Nicho: ${context.niche}
- Cidade: ${context.city}
- Serviços: ${context.services}
- Título atual: ${currentTitle}
- Meta atual: ${currentMeta}

TAREFA:
${fix_types.includes("title") ? "1. Crie um título SEO otimizado (50-60 caracteres) que inclua a palavra-chave principal e a cidade." : ""}
${fix_types.includes("meta") ? "2. Crie uma meta description persuasiva (140-160 caracteres) que inclua CTA e palavras-chave." : ""}
${fix_types.includes("keywords") ? "3. Sugira 5 palavras-chave relevantes para esta landing page." : ""}

RESPONDA EM JSON:
{
  ${fix_types.includes("title") ? '"seo_title": "título otimizado",' : ""}
  ${fix_types.includes("meta") ? '"seo_description": "meta description otimizada",' : ""}
  ${fix_types.includes("keywords") ? '"seo_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]' : ""}
}`;

      try {
        const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: aiPrompt }],
            response_format: { type: "json_object" },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          
          if (content) {
            const parsed = JSON.parse(content);
            
            if (parsed.seo_title && fix_types.includes("title")) {
              updates.seo_title = parsed.seo_title;
              fixes.push("title");
            }
            
            if (parsed.seo_description && fix_types.includes("meta")) {
              updates.seo_description = parsed.seo_description;
              fixes.push("meta");
            }
            
            if (parsed.seo_keywords && fix_types.includes("keywords")) {
              updates.seo_keywords = parsed.seo_keywords;
              fixes.push("keywords");
            }
          }
        }
      } catch (aiError) {
        console.error("[FIX-LP-SEO] AI call failed:", aiError);
      }
    }

    // Fallback: Simple improvements if AI failed or no API key
    if (fixes.length === 0) {
      if (fix_types.includes("title") && currentTitle.length < 50) {
        const improvedTitle = `${context.company} - ${context.niche} em ${context.city}`.slice(0, 60);
        updates.seo_title = improvedTitle;
        fixes.push("title");
      }
      
      if (fix_types.includes("meta") && currentMeta.length < 100) {
        const improvedMeta = `${context.company} oferece ${context.services} em ${context.city}. Atendimento especializado e qualidade garantida. Solicite orçamento!`.slice(0, 160);
        updates.seo_description = improvedMeta;
        fixes.push("meta");
      }
      
      if (fix_types.includes("keywords") && currentKeywords.length < 3) {
        const keywords = [
          context.niche,
          `${context.niche} ${context.city}`,
          context.services?.split(",")[0]?.trim(),
          context.company,
          `${context.services?.split(",")[0]?.trim()} ${context.city}`,
        ].filter(Boolean);
        updates.seo_keywords = keywords;
        fixes.push("keywords");
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from("landing_pages")
        .update(updates)
        .eq("id", landing_page_id);

      if (updateError) {
        console.error("[FIX-LP-SEO] Update failed:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to apply fixes" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`[FIX-LP-SEO] Applied fixes: ${fixes.join(", ")}`);

    // Trigger re-analysis
    try {
      await supabase.functions.invoke("analyze-landing-page-seo", {
        body: { landing_page_id },
      });
    } catch (e) {
      console.warn("[FIX-LP-SEO] Re-analysis trigger failed:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fixes_applied: fixes,
        updates,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[FIX-LP-SEO] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
