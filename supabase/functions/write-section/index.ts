// supabase/functions/write-section/index.ts
// Atomic Edge Function — Writes a single article section using AI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const sectionIndex = payload?.section_index;
    const outline = payload?.outline || payload?._predecessor_results?.article_plan?.outline;
    const entities = payload?.entities || payload?._predecessor_results?.article_plan?.entities || [];

    if (!articleId || sectionIndex === undefined || !outline) {
      return new Response(
        JSON.stringify({ error: "article_id, section_index, and outline are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WRITE-SECTION] Writing section ${sectionIndex} for article ${articleId}`);

    // 1. Get the H2 section to write
    const h2Sections = outline.h2 || [];
    const section = h2Sections[sectionIndex];

    if (!section) {
      return new Response(
        JSON.stringify({ error: `Section index ${sectionIndex} not found in outline` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch article for context (title, existing content)
    const { data: article } = await supabase
      .from("articles")
      .select("title, content, blog_id, keywords, generation_config")
      .eq("id", articleId)
      .single();

    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }

    // 3. Fetch business profile for CTA context
    const { data: businessProfile } = await supabase
      .from("business_profile")
      .select("company_name, whatsapp, city, niche, services")
      .eq("blog_id", article.blog_id)
      .maybeSingle();

    // 4. Build generation prompt
    const brandVoice = article.generation_config?.brand_voice;
    const layoutPrefs = article.generation_config?.layout_preferences;
    const subheadingsInstructions = section.subheadings?.length
      ? `Use estes subtítulos H3 no conteúdo:\n${section.subheadings.map((s: string) => `### ${s}`).join("\n")}`
      : "Crie subtítulos H3 relevantes se o conteúdo justificar.";

    const entityList = entities.length > 0
      ? `Inclua menções naturais a: ${entities.slice(0, 8).join(", ")}`
      : "";

    const systemPrompt = `Você é um redator SEO especialista em conteúdo de autoridade local.
Escreva UMA seção de artigo em Markdown. Siga rigorosamente estas regras:
- Use apenas ## para H2 e ### para H3. NUNCA use # (H1).
- Escreva EXATAMENTE para a quantidade de palavras alvo: ~${section.target_words} palavras.
- Conteúdo original, útil, sem fluff. Cada parágrafo deve trazer valor.
- Parágrafos curtos (máx 4 linhas). Quebre com listas, tabelas e callouts.
${brandVoice ? `- Tom: ${brandVoice.tone}. Pessoa: ${brandVoice.person}. Evitar: ${brandVoice.avoid?.join(", ")}` : "- Tom profissional e acessível. Terceira pessoa."}
${layoutPrefs?.use_tables ? "- Inclua uma tabela comparativa se relevante." : ""}
${layoutPrefs?.use_callouts ? '- Use blocos > 💡 para dicas importantes.' : ""}
${layoutPrefs?.use_lists ? "- Use listas com bullets para itens enumeráveis." : ""}
- NUNCA mencione que é IA ou que está gerando conteúdo.
- Se for a ÚLTIMA seção, inclua CTA com link wa.me/${(businessProfile?.whatsapp || "").replace(/\D/g, "")} e seção "## Próximo passo"`;

    const userPrompt = `Artigo: "${outline.title}"
Seção atual (H2): "${section.heading}"
${subheadingsInstructions}
Palavras alvo: ${section.target_words}
${entityList}
Empresa: ${businessProfile?.company_name || "a empresa"}
Cidade: ${businessProfile?.city || ""}
Nicho: ${businessProfile?.niche || "serviços"}

Escreva APENAS o conteúdo desta seção, começando com ## ${section.heading}`;

    // 5. Call AI writer
    const aiResult = await callWriter({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: Math.max(1500, section.target_words * 2),
      tenantId: tenant_id,
      blogId: article.blog_id,
    });

    if (!aiResult.success || !aiResult.data?.content) {
      throw new Error(`AI writer failed: ${aiResult.success ? 'empty content' : 'call failed'}`);
    }

    const htmlContent = aiResult.data.content;
    const wordCount = htmlContent.split(/\s+/).filter((w: string) => w.length > 0).length;

    // 6. Track entities covered in output
    const contentLower = htmlContent.toLowerCase();
    const entitiesCovered = entities.filter((e: string) =>
      e && contentLower.includes(e.toLowerCase())
    );

    // 7. Append section to article content
    const existingContent = article.content || "";
    const updatedContent = existingContent
      ? `${existingContent}\n\n${htmlContent}`
      : htmlContent;

    await supabase
      .from("articles")
      .update({
        content: updatedContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    console.log(`[WRITE-SECTION] ✅ Section ${sectionIndex} written | ${wordCount} words`);

    // 8. Return WriteSectionOutput contract
    const result = {
      article_id: articleId,
      section_index: sectionIndex,
      html_content: htmlContent,
      word_count: wordCount,
      entities_covered: entitiesCovered,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[WRITE-SECTION] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
