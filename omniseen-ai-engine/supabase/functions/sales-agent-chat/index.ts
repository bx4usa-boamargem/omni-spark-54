// ============================================================
// Edge Function: sales-agent-chat
// POST { host, session_id, page_url, message, conversation_id? }
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runSalesAgentChat } from "../../agents/orchestrator.ts";
import type { Message, PageContext, AgentContext } from "../../types/agents.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const sbUrl = Deno.env.get("SUPABASE_URL")!;
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb    = createClient(sbUrl, sbKey);

    const {
      host,
      session_id,
      page_url,
      page_type  = "blog",
      page_title = "",
      page_excerpt = "",
      message,
      conversation_id,
    } = await req.json();

    if (!host || !session_id || !message) {
      return new Response(
        JSON.stringify({ error: "host, session_id, and message are required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Resolve tenant by host
    const { data: domainRow } = await sb
      .from("tenant_domains")
      .select("tenant_id")
      .eq("domain", host)
      .eq("status", "active")
      .single();

    let tenant_id = domainRow?.tenant_id;

    if (!tenant_id) {
      // Try subdomain: {slug}.app.omniseen.app
      const subdomain = host.split(".")[0];
      const { data: tenantRow } = await sb
        .from("tenants")
        .select("id")
        .eq("slug", subdomain)
        .single();
      tenant_id = tenantRow?.id;
    }

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "Tenant not found for host" }),
        { status: 404, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Load agent config
    const { data: agentConfig } = await sb
      .from("brand_agent_config")
      .select("*")
      .eq("tenant_id", tenant_id)
      .single();

    if (!agentConfig?.is_enabled) {
      return new Response(
        JSON.stringify({ error: "Agent not enabled for this tenant" }),
        { status: 403, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Load or create conversation
    let conv_id = conversation_id;
    let history: Message[] = [];

    if (conv_id) {
      const { data: conv } = await sb
        .from("brand_agent_conversations")
        .select("messages")
        .eq("id", conv_id)
        .single();
      history = conv?.messages ?? [];
    } else {
      const { data: newConv } = await sb.from("brand_agent_conversations").insert({
        tenant_id,
        session_id,
        page_url,
        created_at: new Date().toISOString(),
      }).select("id").single();
      conv_id = newConv?.id;
    }

    const page_context: PageContext = {
      page_url,
      page_type:  page_type as PageContext["page_type"],
      title:      page_title,
      excerpt:    page_excerpt,
      telefone:   agentConfig.agent_name, // brand agent has phone in config
    };

    const ctx: AgentContext = {
      tenant_id,
      web_research_enabled: false,
      locale: "pt-BR",
      market: "BR",
      pipeline_context: {},
    };

    const result = await runSalesAgentChat({
      host,
      session_id,
      page_url,
      page_context,
      message,
      conversation_history: history,
      agent_config: {
        display_name:        agentConfig.agent_name ?? "Assistente",
        primary_goal:        agentConfig.primary_goal ?? "capturar orçamentos",
        qualifying_questions: agentConfig.qualifying_questions ?? [
          "Pode me contar mais sobre o que precisa?",
          "Para quando você está precisando?",
          "Qual o melhor contato para te enviarmos um orçamento?",
        ],
        telefone_whatsapp: agentConfig.whatsapp_number,
      },
    }, ctx);

    // Append messages to conversation
    const updatedHistory: Message[] = [
      ...history,
      { role: "user",      content: message,       created_at: new Date().toISOString() },
      { role: "assistant", content: result.reply,  created_at: new Date().toISOString() },
    ];

    await sb.from("brand_agent_conversations")
      .update({ messages: updatedHistory, updated_at: new Date().toISOString() })
      .eq("id", conv_id);

    // Capture lead if triggered
    if (result.should_capture_lead) {
      // Check if already captured for this session
      const { count } = await sb
        .from("brand_agent_leads")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant_id)
        .eq("session_id", session_id);

      if ((count ?? 0) === 0) {
        await sb.from("brand_agent_leads").insert({
          tenant_id,
          session_id,
          page_url,
          interest_summary: `Intenção: ${result.lead_score >= 60 ? "alta" : "média"} | Página: ${page_type}`,
          lead_score:       result.lead_score,
          created_at:       new Date().toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({
      conversation_id:        conv_id,
      reply:                  result.reply,
      next_question:          result.next_question,
      lead_capture_request:   result.lead_capture_request,
      whatsapp_link:          result.whatsapp_link,
      lead_score:             result.lead_score,
    }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
