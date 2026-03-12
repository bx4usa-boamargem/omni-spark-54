import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Edge Function: research-context
 * Usa Perplexity Sonar Pro para enriquecer contexto semântico de uma keyword+cidade.
 * Retorna: estatísticas recentes, entidades locais, tendências, fontes autoritativas.
 *
 * Entrada (POST JSON):
 *   { keyword: string; city?: string; niche?: string; language?: string }
 *
 * Saída:
 *   { success: boolean; data: ResearchContext | null; error?: string; costUsd: number }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResearchContext {
  statistics: string[];
  local_entities: string[];
  trends: string[];
  authority_sources: { title: string; url: string }[];
  summary: string;
  citations: string[];
}

/**
 * Chama Perplexity Sonar Pro com graceful fallback.
 * Retorna null se a API não estiver configurada ou falhar.
 */
async function callPerplexitySonar(
  keyword: string,
  city: string,
  niche: string,
  language: string,
  apiKey: string
): Promise<{ context: ResearchContext; citations: string[]; costUsd: number } | null> {
  const location = city ? `${keyword} em ${city}, Brasil` : `${keyword} no Brasil`;

  const systemPrompt = `Você é um especialista em SEO local e pesquisa de mercado. 
Forneça dados reais, atualizados e verificáveis. Responda SEMPRE em JSON válido.`;

  const userPrompt = `Pesquise sobre: "${location}" no nicho "${niche}".

Retorne UM objeto JSON com exatamente estas chaves:
{
  "statistics": ["3-5 estatísticas recentes com números reais sobre o mercado/nicho"],
  "local_entities": ["3-5 empresas, bairros, ou referências locais relevantes para ${city || 'o Brasil'}"],
  "trends": ["3-4 tendências atuais do setor em ${language}"],
  "authority_sources": [{"title": "...", "url": "https://..."}, ...] de 2-3 fontes confiáveis (ABNT, IBGE, ANVISA, CFO, CRM, etc.),
  "summary": "Parágrafo de até 150 palavras sintetizando o contexto de mercado"
}`;

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.2,
        return_citations: true,
        return_related_questions: false,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`[RESEARCH_CONTEXT] Perplexity HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const rawContent: string = data?.choices?.[0]?.message?.content || "";
    const citations: string[] = (data?.citations || []).map((c: any) => c?.url || c).filter(Boolean);

    // Estimativa de custo baseada em tokens (Sonar Pro ~$3/M tokens in, $15/M out)
    const tokensIn = data?.usage?.prompt_tokens || 0;
    const tokensOut = data?.usage?.completion_tokens || 0;
    const costUsd = (tokensIn * 0.000003) + (tokensOut * 0.000015);

    // Parse JSON da resposta
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[RESEARCH_CONTEXT] Resposta não contém JSON válido:", rawContent.slice(0, 300));
      return null;
    }

    let parsed: Partial<ResearchContext>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn("[RESEARCH_CONTEXT] Falha ao parsear JSON:", e);
      return null;
    }

    const context: ResearchContext = {
      statistics: parsed.statistics || [],
      local_entities: parsed.local_entities || [],
      trends: parsed.trends || [],
      authority_sources: parsed.authority_sources || [],
      summary: parsed.summary || "",
      citations,
    };

    return { context, citations, costUsd };
  } catch (e) {
    console.warn("[RESEARCH_CONTEXT] Exceção na chamada Perplexity:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const keyword: string = body.keyword || "";
    const city: string = body.city || "";
    const niche: string = body.niche || "business";
    const language: string = body.language || "pt-BR";

    if (!keyword) {
      return new Response(
        JSON.stringify({ success: false, error: "keyword is required", data: null, costUsd: 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!perplexityKey) {
      console.warn("[RESEARCH_CONTEXT] PERPLEXITY_API_KEY não configurada — retornando dados vazios.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "PERPLEXITY_API_KEY_MISSING",
          data: null,
          costUsd: 0,
          latencyMs: Date.now() - startTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await callPerplexitySonar(keyword, city, niche, language, perplexityKey);

    return new Response(
      JSON.stringify({
        success: result !== null,
        data: result?.context ?? null,
        citations: result?.citations ?? [],
        costUsd: result?.costUsd ?? 0,
        latencyMs: Date.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[RESEARCH_CONTEXT] Erro fatal:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg, data: null, costUsd: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
