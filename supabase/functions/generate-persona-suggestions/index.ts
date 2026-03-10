import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callWriter } from "../_shared/aiProviders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Robust JSON parser that handles AI response quirks
function parseAIJson(content: string): Record<string, unknown> | null {
  // Remove markdown code blocks if present
  let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  
  // Find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  
  let jsonStr = jsonMatch[0];
  
  // Clean up common issues
  jsonStr = jsonStr
    .replace(/[\x00-\x1F\x7F]/g, (char) => {
      if (char === "\n") return "\\n";
      if (char === "\r") return "\\r";
      if (char === "\t") return "\\t";
      return "";
    })
    .replace(/,\s*([}\]])/g, "$1") // Remove trailing commas
    .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Quote unquoted keys
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("First parse attempt failed:", e);
    
    // Try more aggressive cleanup
    try {
      jsonStr = jsonStr
        .replace(/"\s*\n\s*"/g, '", "')
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ");
      return JSON.parse(jsonStr);
    } catch (e2) {
      console.error("Second parse attempt failed:", e2);
      return null;
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { personaName, personaDescription, profession, niche, field, existing, generatePersonas, blogId, improvePersona, improvementType, personaData, improveItems, items } = body;

    // Improve existing persona
    if (improvePersona && personaData) {
      const typePrompts: Record<string, string> = {
        expand_description: "Expanda e enriqueça a descrição da persona com mais detalhes comportamentais, psicográficos e contextuais.",
        add_behaviors: "Adicione informações sobre comportamento de compra, hábitos digitais e preferências de consumo de conteúdo.",
        professional_tone: "Reformule a descrição para um tom mais profissional e técnico, mantendo a essência.",
        fill_empty: "Complete campos que estão vazios ou pouco desenvolvidos com informações relevantes.",
      };

      const prompt = typePrompts[improvementType] || typePrompts.expand_description;

      const responseResult = await callWriter({
        messages: [
            { role: "system", content: `Você é a OMNISEEN AI, a assistente virtual inteligente da OMNISEEN, especialista em marketing. ${prompt}\n\nRetorne APENAS um JSON válido: {"name": "...", "age_range": "...", "profession": "...", "description": "..."}` },
            { role: "user", content: `Melhore esta persona do nicho "${niche}": ${JSON.stringify(personaData)}` },
          ],
        temperature: 0.7,
        maxTokens: 4096,
      });

      if (!response.ok) throw new Error(`AI API error: ${response.status}`);
      const data = { choices: [{ message: { content: responseResult.data?.content || "" } }] };
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = parseAIJson(content);

      return new Response(JSON.stringify({ improved: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Improve existing items
    if (improveItems && items && Array.isArray(items)) {
      const fieldLabels: Record<string, string> = {
        problems: "problemas",
        solutions: "soluções",
        objections: "objeções",
      };

      const responseResult = await callWriter({
        messages: [
            { role: "system", content: `Você é a OMNISEEN AI, a assistente virtual inteligente da OMNISEEN, especialista em marketing. Melhore os ${fieldLabels[field] || field} tornando-os mais específicos, acionáveis e mensuráveis. Mantenha o mesmo número de itens.\n\nRetorne APENAS um JSON: {"improved": ["item melhorado 1", "item melhorado 2", ...]}` },
            { role: "user", content: `Nicho: ${niche}. Persona: ${personaName}. Itens atuais: ${JSON.stringify(items)}` },
          ],
        temperature: 0.7,
        maxTokens: 4096,
      });

      if (!response.ok) throw new Error(`AI API error: ${response.status}`);
      const data = { choices: [{ message: { content: responseResult.data?.content || "" } }] };
      const content = data.choices?.[0]?.message?.content || "";
      const parsed = parseAIJson(content);

      return new Response(JSON.stringify({ improved: parsed?.improved || items }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate full personas
    if (generatePersonas) {
      const systemPrompt = `Você é a OMNISEEN AI, a assistente virtual inteligente da OMNISEEN, especialista em marketing e definição de público-alvo.
Gere 3 personas detalhadas para um negócio no nicho: "${niche}".

Cada persona deve ser REALISTA e representar um segmento importante do público-alvo.

Responda APENAS com um JSON válido no formato:
{
  "personas": [
    {
      "name": "Nome da Persona",
      "age_range": "30-45 anos",
      "profession": "Profissão",
      "description": "Descrição detalhada de quem é essa pessoa, seu dia-a-dia, interesses",
      "goals": ["Objetivo 1", "Objetivo 2"],
      "challenges": ["Desafio 1", "Desafio 2"],
      "problems": ["Problema específico 1", "Problema específico 2", "Problema específico 3"],
      "solutions": ["Solução que busca 1", "Solução que busca 2"],
      "objections": ["Objeção comum 1", "Objeção comum 2"]
    }
  ]
}`;

      const responseResult = await callWriter({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Gere 3 personas para o nicho: ${niche}` },
          ],
        temperature: 0.7,
        maxTokens: 4096,
      });

      if (!responseResult.success || !responseResult.data?.content) {
        console.error("[AI] Writer failed:", responseResult.fallbackReason);
        throw new Error(`AI error: ${responseResult.fallbackReason}`);
      }
      return new Response(JSON.stringify({ personas }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate suggestions for a specific field
    const fieldLabels: Record<string, string> = {
      problems: "problemas que essa persona enfrenta",
      solutions: "soluções que essa persona busca",
      objections: "objeções que essa persona pode ter ao comprar",
    };

    const systemPrompt = `Você é a OMNISEEN AI, a assistente virtual inteligente da OMNISEEN, especialista em marketing e análise de público-alvo.
Gere sugestões de ${fieldLabels[field] || field} para a persona descrita.

Contexto:
- Nicho do negócio: ${niche}
- Nome da persona: ${personaName}
- Profissão: ${profession || "não especificada"}
- Descrição: ${personaDescription || "não fornecida"}
- Itens já existentes: ${existing?.join(", ") || "nenhum"}

IMPORTANTE:
- Gere 5 sugestões NOVAS que NÃO estão na lista existente
- Seja específico e realista
- Considere o contexto do nicho

Responda APENAS com um JSON válido:
{
  "suggestions": ["sugestão 1", "sugestão 2", "sugestão 3", "sugestão 4", "sugestão 5"]
}`;

    const responseResult = await callWriter({
      messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere sugestões de ${fieldLabels[field] || field}` },
        ],
      temperature: 0.7,
      maxTokens: 4096,
    });

    if (!responseResult.success || !responseResult.data?.content) {
      console.error("[AI] Writer failed:", responseResult.fallbackReason);
      throw new Error(`AI error: ${responseResult.fallbackReason}`);
    }
    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-persona-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
