import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callWriter, callResearch } from "../_shared/aiProviders.ts";

/**
 * build-article-outline
 *
 * Gera o outline (H1 + H2s + H3s + CTA) para um artigo local de autoridade.
 *
 * FLUXO:
 * 1. callResearch() — busca tendências/demandas locais da cidade/bairro
 *    (Perplexity Sonar → Gemini Grounding como fallback)
 * 2. callWriter() — redige o outline baseado nas demandas locais
 *    (OpenAI GPT-4o → Gemini como fallback)
 *
 * Objetivo: artigos que atendam empresas locais buscando leads locais.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OutlineRequest {
  opportunityId: string;
  blogId: string;
}

interface OutlineH2 {
  title: string;
  h3: string[];
}

interface OutlineResult {
  h1: string;
  h2: OutlineH2[];
  cta: string;
}

// Valida estrutura do outline gerado pela IA
function validateOutlineOutput(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Response is not an object' };
  }

  const obj = data as Record<string, unknown>;

  if (!obj.outline || typeof obj.outline !== 'object') {
    return { valid: false, error: 'Missing or invalid outline field' };
  }

  const outline = obj.outline as Record<string, unknown>;

  if (!outline.h1 || typeof outline.h1 !== 'string') {
    return { valid: false, error: 'Missing or invalid h1 field' };
  }

  if (!Array.isArray(outline.h2) || outline.h2.length < 3) {
    return { valid: false, error: 'h2 must be an array with at least 3 sections' };
  }

  for (let i = 0; i < outline.h2.length; i++) {
    const section = outline.h2[i] as Record<string, unknown>;
    if (!section.title || typeof section.title !== 'string') {
      return { valid: false, error: `h2[${i}] missing title` };
    }
    if (!Array.isArray(section.h3) || section.h3.length < 2) {
      return { valid: false, error: `h2[${i}] missing h3 array (min 2 items)` };
    }
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Parse e valida request
    let requestData: OutlineRequest;
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'INVALID_REQUEST', message: 'Request body must be valid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { opportunityId, blogId } = requestData;

    if (!opportunityId || !blogId) {
      return new Response(
        JSON.stringify({ error: 'MISSING_FIELDS', message: 'opportunityId and blogId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[OUTLINE] Building outline for opportunity ${opportunityId}, blog ${blogId}`);

    // Busca dados da oportunidade
    const { data: opportunity, error: oppError } = await supabase
      .from('omnicore_opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();

    if (oppError || !opportunity) {
      return new Response(
        JSON.stringify({ error: 'OPPORTUNITY_NOT_FOUND', message: `Opportunity ${opportunityId} not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Busca perfil do negócio para contexto local
    const { data: profile } = await supabase
      .from('business_profile')
      .select('*')
      .eq('blog_id', blogId)
      .maybeSingle();

    // Busca tenant_id via blog
    const { data: blog } = await supabase
      .from('blogs')
      .select('tenant_id')
      .eq('id', blogId)
      .maybeSingle();

    const tenantId = (blog as any)?.tenant_id;
    const niche = profile?.niche || opportunity.title.split(' ')[0] || 'business';
    const territory = opportunity.territory || profile?.city || 'local';
    const neighborhood = profile?.neighborhood || '';
    const companyName = profile?.company_name || '';
    const primaryKw = opportunity.primary_kw || opportunity.title;
    const secondaryKws = (opportunity.secondary_kw || []).join(', ') || 'N/A';
    const intent = opportunity.intent || 'informational';
    const angle = opportunity.angle || 'local-authority';

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 1: callResearch — tendências e demandas locais por cidade/bairro
    // Provider: Perplexity (dados reais de pesquisa) → Gemini Grounding (fallback)
    // ─────────────────────────────────────────────────────────────────────────

    const localLocation = neighborhood
      ? `${neighborhood}, ${territory}`
      : territory;

    console.log(`[OUTLINE] 🔍 Researching local demand for: ${primaryKw} in ${localLocation}`);

    const researchResult = await callResearch({
      query: `Quais são as principais dúvidas, demandas e tendências de busca de pessoas em ${localLocation} procurando por "${primaryKw}" em 2026? Liste problemas reais que enfrentam, perguntas frequentes, e o que esperam encontrar em empresas locais do segmento "${niche}".`,
      systemPrompt: `Você é um especialista em comportamento de consumidores locais no Brasil. Retorne dados reais e atuais sobre demandas locais em JSON: {"local_demands": ["..."], "frequent_questions": ["..."], "local_trends": ["..."], "pain_points": ["..."]}`,
      maxTokens: 600,
      tenantId,
      blogId,
    });

    // Extrai insights locais (com fallback seguro se pesquisa falhar)
    let localInsights = {
      local_demands: [] as string[],
      frequent_questions: [] as string[],
      local_trends: [] as string[],
      pain_points: [] as string[],
    };

    if (researchResult.success && researchResult.data?.content) {
      try {
        const clean = researchResult.data.content.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(clean);
        localInsights = { ...localInsights, ...parsed };
        console.log(`[OUTLINE] ✅ Local research complete (provider: ${researchResult.provider})`);
      } catch {
        console.warn('[OUTLINE] ⚠️ Could not parse research JSON, continuing without local data');
      }
    } else {
      console.warn(`[OUTLINE] ⚠️ Research failed: ${researchResult.fallbackReason || 'unknown'}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PASSO 2: callWriter — gera outline com base nas demandas locais reais
    // Provider: OpenAI GPT-4o → Gemini (fallback automático)
    // ─────────────────────────────────────────────────────────────────────────

    const localContext = [
      localInsights.local_demands.length > 0 && `Principais demandas locais: ${localInsights.local_demands.slice(0, 3).join('; ')}`,
      localInsights.frequent_questions.length > 0 && `Perguntas frequentes: ${localInsights.frequent_questions.slice(0, 3).join('; ')}`,
      localInsights.pain_points.length > 0 && `Dores do consumidor local: ${localInsights.pain_points.slice(0, 2).join('; ')}`,
      localInsights.local_trends.length > 0 && `Tendências locais 2026: ${localInsights.local_trends.slice(0, 2).join('; ')}`,
    ].filter(Boolean).join('\n');

    const systemPrompt = `Você é o OmniCore Architect, especialista em conteúdo de autoridade local para geração de leads B2C.

Crie outlines de artigos que:
- Atraiam consumidores locais com intenção de contratar/comprar
- Posicionem a empresa como autoridade em ${territory}
- Respondam às dúvidas reais da população local
- Incluam CTAs direcionados para captação de leads

TERRITÓRIO: ${localLocation}
NICHO: ${niche}
${companyName ? `EMPRESA: ${companyName}` : ''}

REGRAS DO OUTLINE:
- H1: inclui keyword principal + localidade + ano 2026
- H2s: 4-6 seções cobrindo dúvidas, benefícios locais, comparativos e prova social
- H3s: 2-3 subtópicos específicos por seção (baseados em demandas locais reais)
- CTA final: direcionado para contato/orçamento em ${territory}
- Suporte para artigo de 1.500-2.500 palavras

Retorne APENAS um JSON válido neste formato exato:
{
  "outline": {
    "h1": "Título com keyword + localidade + 2026",
    "h2": [
      {
        "title": "Título da seção H2",
        "h3": ["Subtópico 1", "Subtópico 2", "Subtópico 3"]
      }
    ],
    "cta": "Mensagem de CTA com referência a ${territory}"
  }
}`;

    const userPrompt = `Crie o outline para este artigo com foco em geração de leads locais:

TÍTULO DA OPORTUNIDADE: ${opportunity.title}
KEYWORD PRINCIPAL: ${primaryKw}
KEYWORDS SECUNDÁRIAS: ${secondaryKws}
INTENÇÃO DE BUSCA: ${intent}
ÂNGULO: ${angle}
LOCALIDADE: ${localLocation}

${localContext ? `DADOS LOCAIS (use para tornar o artigo hiperlocal):\n${localContext}` : ''}

Gere o outline JSON focado em atrair consumidores locais que estão buscando "${primaryKw}" em ${localLocation}.`;

    console.log(`[OUTLINE] ✍️ Calling AI writer (agnóstico)...`);

    const writerResult = await callWriter({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      maxTokens: 1500,
      tenantId,
      blogId,
    });

    if (!writerResult.success || !writerResult.data?.content) {
      console.error('[OUTLINE] Writer failed:', writerResult.fallbackReason);
      return new Response(
        JSON.stringify({ error: 'AI_FAILED', message: writerResult.fallbackReason || 'AI returned empty response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[OUTLINE] ✅ Writer complete (provider: ${writerResult.provider}, fallback: ${writerResult.usedFallback})`);

    // Parse e valida o JSON do outline
    let parsedResponse: { outline: OutlineResult };
    try {
      const cleanContent = writerResult.data.content.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[OUTLINE] Failed to parse AI response:', writerResult.data.content.substring(0, 300));
      return new Response(
        JSON.stringify({ error: 'INVALID_JSON', message: 'AI returned invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valida estrutura do outline (hard-fail)
    const validation = validateOutlineOutput(parsedResponse);
    if (!validation.valid) {
      console.error('[OUTLINE] Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: 'INVALID_OUTPUT', message: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salva em omnicore_outlines
    const { data: savedOutline, error: saveError } = await supabase
      .from('omnicore_outlines')
      .insert({
        omnicore_opportunity_id: opportunityId,
        outline: parsedResponse.outline,
        local_research: localInsights,
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('[OUTLINE] Failed to save outline:', saveError);
      throw new Error(`Failed to save outline: ${saveError.message}`);
    }

    // Atualiza status da oportunidade
    await supabase
      .from('omnicore_opportunities')
      .update({ status: 'outlined' })
      .eq('id', opportunityId);

    console.log(`[OUTLINE] ✅ Outline saved: ${savedOutline.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        outline_id: savedOutline.id,
        outline: parsedResponse.outline,
        local_research_used: researchResult.success,
        ai_provider: writerResult.provider,
        used_fallback: writerResult.usedFallback,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OUTLINE] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
