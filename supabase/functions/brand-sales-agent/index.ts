import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callWriter } from "../_shared/aiProviders.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  blog_id: string;
  article_id?: string;
  article_title?: string;
  visitor_id: string;
  session_id: string;
  conversation_id?: string; // Direct lookup — avoids visitor+session scan
  message: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface LeadData {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  interest_summary?: string;
  lead_score?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { blog_id, article_id, article_title, visitor_id, session_id, conversation_id, message, utm_source, utm_medium, utm_campaign } = body;

    if (!blog_id || !visitor_id || !session_id || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: blog_id, visitor_id, session_id, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get agent configuration
    const { data: agentConfig, error: configError } = await supabase
      .from("brand_agent_config")
      .select("*")
      .eq("blog_id", blog_id)
      .maybeSingle();

    if (configError) {
      console.error("Error fetching agent config:", configError);
      throw new Error("Failed to fetch agent configuration");
    }

    if (!agentConfig || !agentConfig.is_enabled) {
      return new Response(
        JSON.stringify({ error: "Brand agent is not enabled for this blog" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription status - agent must have active subscription
    const subscriptionStatus = agentConfig.agent_subscription_status || 'inactive';
    if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trial') {
      return new Response(
        JSON.stringify({ 
          error: "Agent subscription inactive",
          message: "Este agente não está ativo. Entre em contato com o administrador para ativação."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check daily token limit (reset if needed)
    const today = new Date().toISOString().split('T')[0];
    const resetDate = agentConfig.tokens_reset_at ? new Date(agentConfig.tokens_reset_at).toISOString().split('T')[0] : null;
    
    let tokensUsedToday = agentConfig.tokens_used_today || 0;
    
    if (resetDate !== today) {
      // Reset tokens for new day
      await supabase
        .from("brand_agent_config")
        .update({ tokens_used_today: 0, tokens_reset_at: new Date().toISOString() })
        .eq("id", agentConfig.id);
      tokensUsedToday = 0;
    }

    if (tokensUsedToday >= agentConfig.max_tokens_per_day) {
      return new Response(
        JSON.stringify({ 
          error: "Limite diário de atendimento atingido. Tente novamente amanhã!",
          limit_reached: true 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get business profile and client strategy for context
    const [businessProfileResult, clientStrategyResult, blogResult, articleResult] = await Promise.all([
      supabase.from("business_profile").select("*").eq("blog_id", blog_id).maybeSingle(),
      supabase.from("client_strategy").select("*").eq("blog_id", blog_id).maybeSingle(),
      supabase.from("blogs").select("name, primary_color, cta_text, cta_url").eq("id", blog_id).single(),
      article_id
        ? supabase.from("articles").select("title, content, meta_description, focus_keyword").eq("id", article_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const businessProfile = businessProfileResult.data;
    const clientStrategy = clientStrategyResult.data;
    const blog = blogResult.data;
    const articleContent = articleResult.data;

    // 4. Get or create conversation (direct lookup by ID or by visitor+session)
    let convQuery = supabase.from("brand_agent_conversations").select("*");
    if (conversation_id) {
      convQuery = convQuery.eq("id", conversation_id).eq("blog_id", blog_id);
    } else {
      convQuery = convQuery
        .eq("blog_id", blog_id)
        .eq("visitor_id", visitor_id)
        .eq("session_id", session_id);
    }
    let { data: conversation, error: convError } = await convQuery.maybeSingle();

    if (convError && convError.code !== "PGRST116") {
      console.error("Error fetching conversation:", convError);
    }

    const existingMessages: ChatMessage[] = conversation?.messages || [];

    if (!conversation) {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from("brand_agent_conversations")
        .insert({
          blog_id,
          article_id: article_id || null,
          visitor_id,
          session_id,
          messages: [],
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating conversation:", createError);
        throw new Error("Failed to create conversation");
      }
      conversation = newConv;
    }

    // 5. Build system prompt
    const companyName = businessProfile?.company_name || clientStrategy?.empresa_nome || blog?.name || "Empresa";
    const city = businessProfile?.city || clientStrategy?.regiao_atuacao || "";
    const services = businessProfile?.services || clientStrategy?.o_que_oferece || "";
    const niche = businessProfile?.niche || clientStrategy?.tipo_negocio || "";
    const targetAudience = businessProfile?.target_audience || clientStrategy?.tipo_publico || "";
    const differentials = clientStrategy?.diferenciais?.join(", ") || businessProfile?.brand_keywords?.join(", ") || "";
    const toneOfVoice = businessProfile?.tone_of_voice || "profissional e acolhedor";
    const whatsapp = businessProfile?.whatsapp || "";
    const painPoints = clientStrategy?.dor_principal || "";
    const desires = clientStrategy?.desejo_principal || "";
    const benefits = clientStrategy?.principais_beneficios?.join(", ") || "";
    const conversionGoals = agentConfig.conversion_goals?.join(", ") || "lead";
    const agentName = agentConfig.agent_name || "Consultor";

    const systemPrompt = `Você é ${agentName}, consultor comercial da ${companyName}.
${city ? `Localização: ${city}` : ""}
${services ? `Serviços: ${services}` : ""}
${niche ? `Segmento: ${niche}` : ""}

## SUA IDENTIDADE
- Você FAZ PARTE da equipe da ${companyName}
- Sempre fale como "nós", "nossa equipe", "nosso atendimento"
- Seu nome é ${agentName}
- Tom de voz: ${toneOfVoice}

## CONHECIMENTO DO NEGÓCIO
${targetAudience ? `- Público-alvo: ${targetAudience}` : ""}
${differentials ? `- Diferenciais: ${differentials}` : ""}
${benefits ? `- Benefícios: ${benefits}` : ""}
${painPoints ? `- Dor que resolvemos: ${painPoints}` : ""}
${desires ? `- Desejo que atendemos: ${desires}` : ""}

## REGRAS ABSOLUTAS
1. NUNCA diga que é uma IA, assistente virtual ou robô
2. NUNCA mencione Omniseen, plataforma ou tecnologia
3. NUNCA invente informações sobre preços, prazos ou garantias que não foram fornecidas
4. Responda de forma natural, como um vendedor experiente
5. Faça perguntas para entender a necessidade do cliente
6. Seja empático e consultivo, não agressivo
7. RESPOSTAS ULTRA-CURTAS: cada parágrafo deve ter NO MÁXIMO 2-3 linhas. Máximo 2 parágrafos por resposta.
8. Use frases diretas e impactantes. Evite explicações longas.
9. Prefira perguntas curtas para manter o diálogo fluindo.
10. Nunca liste mais de 3 itens de uma vez.

## OBJETIVO DE CONVERSÃO
Seu objetivo é: ${conversionGoals}
${whatsapp ? `WhatsApp para contato: ${whatsapp}` : ""}

## CAPTURA DE LEADS
Quando o visitante demonstrar interesse real, peça contato de forma NATURAL:
- "Para te passar um orçamento personalizado, qual seu WhatsApp?"
- "Posso pedir para nossa equipe entrar em contato? Qual o melhor número?"
- "Deixa seu e-mail que te envio mais detalhes"

Quando capturar dados do lead, inclua no FINAL da sua resposta (em uma linha separada):
[LEAD_DATA:{"name":"Nome","phone":"telefone","email":"email","whatsapp":"whatsapp","interest_summary":"resumo do interesse","lead_score":0-100}]

## CONTEXTO DO ARTIGO
${article_title || articleContent?.title ? `O visitante está lendo: "${article_title || articleContent?.title}"` : "O visitante está no site."}
${articleContent?.meta_description ? `Descrição do artigo: ${articleContent.meta_description}` : ""}
${articleContent?.focus_keyword ? `Palavra-chave foco: ${articleContent.focus_keyword}` : ""}
${articleContent?.content ? `\nResumo do conteúdo (use para personalizar o atendimento):\n${articleContent.content.replace(/<[^>]*>/g, "").substring(0, 800)}...` : ""}

Lembre-se: você é um vendedor humano da ${companyName}, não um bot.`;

    // 6. Prepare messages for AI
    const messagesForAI = [
      { role: "system", content: systemPrompt },
      ...existingMessages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
      { role: "user", content: message },
    ];

    // 7. Call AI via callWriter
    const aiResponseResult = await callWriter({
      messages: messagesForAI,
      temperature: 0.7,
      maxTokens: 600,
    });

    if (!aiResponseResult.success || !aiResponseResult.data?.content) {
      console.error("[AI] Writer failed:", aiResponseResult.fallbackReason);
      throw new Error(`AI error: ${aiResponseResult.fallbackReason}`);
    }
    const aiData = { choices: [{ message: { content: aiResponseResult.data?.content || "" } }] };
    let assistantMessage = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem. Pode repetir?";
    
    // Estimate tokens: 1 token ≈ 4 chars (used when API doesn't return usage)
    const promptText = messagesForAI.map(m => (typeof m.content === "string" ? m.content : "")).join(" ");
    const tokensUsed = Math.ceil((promptText.length + assistantMessage.length) / 4);

    // 8. Check for lead data in response
    let capturedLead: LeadData | null = null;
    const leadMatch = assistantMessage.match(/\[LEAD_DATA:({.*?})\]/);
    
    if (leadMatch) {
      try {
        capturedLead = JSON.parse(leadMatch[1]);
        // Remove lead data marker from visible message
        assistantMessage = assistantMessage.replace(/\[LEAD_DATA:.*?\]/, "").trim();
      } catch (e) {
        console.error("Failed to parse lead data:", e);
      }
    }

    // 9. Update conversation with new messages
    const updatedMessages = [
      ...existingMessages,
      { role: "user" as const, content: message },
      { role: "assistant" as const, content: assistantMessage },
    ];

    await supabase
      .from("brand_agent_conversations")
      .update({
        messages: updatedMessages,
        tokens_used: (conversation.tokens_used || 0) + tokensUsed,
        last_message_at: new Date().toISOString(),
        lead_captured: capturedLead ? true : conversation.lead_captured,
      })
      .eq("id", conversation.id);

    // 10. Update daily token usage
    await supabase
      .from("brand_agent_config")
      .update({ tokens_used_today: tokensUsedToday + tokensUsed })
      .eq("id", agentConfig.id);

    // 11. If lead captured, save it and send webhook
    if (capturedLead && (capturedLead.name || capturedLead.email || capturedLead.phone || capturedLead.whatsapp)) {
      const { data: leadRecord, error: leadError } = await supabase
        .from("brand_agent_leads")
        .insert({
          blog_id,
          conversation_id: conversation.id,
          article_id: article_id || null,
          article_title: article_title || null,
          name: capturedLead.name || null,
          email: capturedLead.email || null,
          phone: capturedLead.phone || null,
          whatsapp: capturedLead.whatsapp || null,
          interest_summary: capturedLead.interest_summary || null,
          lead_score: capturedLead.lead_score || 50,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
        })
        .select()
        .single();

      if (leadError) {
        console.error("Error saving lead:", leadError);
      }

      // Send webhook if configured
      if (agentConfig.webhook_url && leadRecord) {
        try {
          const webhookPayload = {
            event: "lead_captured",
            timestamp: new Date().toISOString(),
            lead: {
              id: leadRecord.id,
              name: capturedLead.name,
              email: capturedLead.email,
              phone: capturedLead.phone,
              whatsapp: capturedLead.whatsapp,
              interest_summary: capturedLead.interest_summary,
              lead_score: capturedLead.lead_score,
            },
            source: {
              blog_id,
              blog_name: blog?.name,
              article_id: article_id || null,
              article_title: article_title || null,
            },
            conversation: {
              id: conversation.id,
              messages_count: updatedMessages.length,
            },
            utm: {
              source: utm_source,
              medium: utm_medium,
              campaign: utm_campaign,
            },
          };

          const webhookResponse = await fetch(agentConfig.webhook_url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(agentConfig.webhook_secret ? { "X-Webhook-Secret": agentConfig.webhook_secret } : {}),
            },
            body: JSON.stringify(webhookPayload),
          });

          // Update lead with webhook response
          await supabase
            .from("brand_agent_leads")
            .update({
              webhook_sent_at: new Date().toISOString(),
              webhook_response: {
                status: webhookResponse.status,
                ok: webhookResponse.ok,
              },
            })
            .eq("id", leadRecord.id);
        } catch (webhookError) {
          console.error("Webhook error:", webhookError);
        }
      }

      // Log consumption
      await supabase.from("consumption_logs").insert({
        user_id: blog_id, // Using blog_id as reference since this is anonymous
        blog_id,
        action_type: "brand_agent_lead",
        action_description: `Lead captured: ${capturedLead.name || capturedLead.email || capturedLead.phone}`,
        model_used: "google/gemini-3-flash-preview",
        input_tokens: Math.round(tokensUsed * 0.8),
        output_tokens: Math.round(tokensUsed * 0.2),
        estimated_cost_usd: tokensUsed * 0.00001, // Approximate cost
      });
    }

    // 12. Log consumption for the chat
    await supabase.from("consumption_logs").insert({
      user_id: blog_id,
      blog_id,
      action_type: "brand_agent_chat",
      action_description: `Chat message processed`,
      model_used: "google/gemini-3-flash-preview",
      input_tokens: Math.round(tokensUsed * 0.8),
      output_tokens: Math.round(tokensUsed * 0.2),
      estimated_cost_usd: tokensUsed * 0.00001,
    });

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        conversation_id: conversation.id,
        lead_captured: !!capturedLead,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Brand Sales Agent error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        message: "Desculpe, estou com dificuldades técnicas. Pode tentar novamente?"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
