import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  blog_id: string;
  niche?: string;
  city?: string;
  company_name?: string;
  services?: string[];
  phone?: string;
  whatsapp?: string;
  address?: string;
  email?: string;
  territories?: string[];
  differentiator?: string;
  target_audience?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: GenerateRequest = await req.json();
    const { blog_id } = body;

    if (!blog_id) {
      return new Response(
        JSON.stringify({ error: "blog_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch business profile context
    const { data: profile } = await supabase
      .from("business_profile")
      .select("*")
      .eq("blog_id", blog_id)
      .single();

    // Fetch territories
    const { data: territories } = await supabase
      .from("territories")
      .select("city, neighborhood, scope, state")
      .eq("blog_id", blog_id)
      .eq("is_active", true);

    // Build context from profile and request
    const niche = body.niche || profile?.services?.split(",")[0]?.trim() || "serviços profissionais";
    const city = body.city || profile?.city || "sua cidade";
    const companyName = body.company_name || profile?.company_name || "Nossa Empresa";
    const services = body.services || profile?.services?.split(",").map((s: string) => s.trim()) || [];
    const phone = body.phone || profile?.phone || "";
    const whatsapp = body.whatsapp || profile?.whatsapp || phone;
    const address = body.address || profile?.address || "";
    const email = body.email || "";
    const differentiator = body.differentiator || profile?.differentiator || "";
    const targetAudience = body.target_audience || profile?.target_audience || "";

    // Build neighborhoods list from territories
    const neighborhoods = territories?.map(t => t.neighborhood).filter(Boolean) || [];

    // Create the system prompt for landing page generation
    const systemPrompt = `Você é um especialista em criação de landing pages de alta conversão para negócios locais.
Sua tarefa é gerar uma estrutura JSON completa para uma landing page profissional.

REGRAS CRÍTICAS:
1. Todo o conteúdo DEVE ser em português brasileiro
2. O conteúdo deve ser ESPECÍFICO para o nicho e cidade informados
3. Use dados reais e convincentes (não genéricos)
4. Inclua CTAs claros e persuasivos
5. Mencione bairros/regiões atendidas quando disponíveis
6. Gere depoimentos realistas (com nomes brasileiros e bairros locais)
7. FAQs devem responder dúvidas reais do nicho

ESTRUTURA JSON ESPERADA:
{
  "hero": {
    "title": "Título impactante com palavra-chave principal",
    "subtitle": "Subtítulo persuasivo que destaca o benefício",
    "cta_text": "Texto do botão de ação",
    "cta_phone": "telefone formatado"
  },
  "services": [
    {
      "id": "uuid",
      "icon": "nome-do-icone",
      "title": "Nome do Serviço",
      "description": "Descrição breve e persuasiva",
      "cta_text": "Texto do botão"
    }
  ],
  "service_details": [
    {
      "id": "uuid",
      "title": "Título do Serviço Detalhado",
      "content": "Descrição completa do serviço",
      "bullets": ["Benefício 1", "Benefício 2", "Benefício 3"],
      "side": "left" ou "right"
    }
  ],
  "emergency_banner": {
    "title": "Atendimento de Emergência",
    "subtitle": "Disponível 24 horas por dia",
    "phone": "telefone",
    "is_24h": true
  },
  "process_steps": [
    {
      "step": 1,
      "title": "Título do Passo",
      "description": "Descrição do que acontece neste passo"
    }
  ],
  "why_choose_us": [
    {
      "id": "uuid",
      "icon": "nome-do-icone",
      "title": "Diferencial",
      "description": "Por que este diferencial importa"
    }
  ],
  "testimonials": [
    {
      "id": "uuid",
      "name": "Nome do Cliente",
      "location": "Bairro, Cidade",
      "quote": "Depoimento realista e convincente",
      "rating": 5
    }
  ],
  "areas_served": {
    "title": "Atendemos em ${city} e Região",
    "regions": [
      {
        "name": "Nome da Região",
        "neighborhoods": ["Bairro 1", "Bairro 2"]
      }
    ]
  },
  "faq": [
    {
      "id": "uuid",
      "question": "Pergunta frequente do nicho",
      "answer": "Resposta detalhada e profissional"
    }
  ],
  "contact": {
    "address": "endereço completo",
    "phone": "telefone formatado",
    "whatsapp": "whatsapp",
    "email": "email",
    "hours": "Horário de funcionamento"
  },
  "cta_banner": {
    "title": "Chamada para ação final",
    "subtitle": "Texto persuasivo para conversão",
    "cta_text": "Texto do botão",
    "phone": "telefone"
  }
}

ÍCONES DISPONÍVEIS: wrench, shield, clock, star, home, settings, zap, heart, check, phone, award, users, thumbsup, target, banknote`;

    const userPrompt = `Gere uma landing page completa para:

EMPRESA: ${companyName}
NICHO: ${niche}
CIDADE: ${city}
SERVIÇOS: ${services.join(", ") || "Não especificados"}
TELEFONE: ${phone}
WHATSAPP: ${whatsapp}
ENDEREÇO: ${address || "Não especificado"}
DIFERENCIAL: ${differentiator || "Qualidade e profissionalismo"}
PÚBLICO-ALVO: ${targetAudience || "Clientes locais"}
BAIRROS ATENDIDOS: ${neighborhoods.join(", ") || "Toda a cidade"}

Gere o JSON completo seguindo EXATAMENTE a estrutura especificada.
Os IDs devem ser strings únicas (pode usar números ou texto simples).
Gere pelo menos 3 serviços, 3 depoimentos, 5 FAQs, e 4 diferenciais.`;

    console.log("[generate-landing-page] Calling Lovable AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-landing-page] AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from AI");
    }

    console.log("[generate-landing-page] Raw AI response length:", content.length);

    // Parse JSON from AI response
    let pageData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        pageData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[generate-landing-page] JSON parse error:", parseError);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Log usage
    await supabase.from("ai_usage_logs").insert({
      blog_id,
      provider: "lovable_ai",
      endpoint: "generate-landing-page",
      cost_usd: 0.01,
      metadata: {
        model: "google/gemini-3-flash-preview",
        niche,
        city,
        services_count: services.length
      }
    });

    console.log("[generate-landing-page] Success! Generated page data.");

    return new Response(
      JSON.stringify({
        success: true,
        page_data: pageData,
        context: {
          company_name: companyName,
          niche,
          city,
          services
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-landing-page] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
