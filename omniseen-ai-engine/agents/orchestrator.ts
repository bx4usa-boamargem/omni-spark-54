// ============================================================
// Agent: salesAgentChat (AG-13)
// Attend visitors + qualify leads in real-time
// ============================================================

import { callGeminiTracked } from "../lib/ai/aiRouter.ts";
import { scoreLead } from "../skills/conversionSkills.ts";
import type { AgentContext, Message, PageContext, LeadData } from "../types/agents.ts";

export interface SalesAgentInput {
  host:             string;
  session_id:       string;
  page_url:         string;
  page_context:     PageContext;
  message:          string;
  conversation_history: Message[];
  agent_config: {
    display_name:        string;
    primary_goal:        string;
    qualifying_questions: string[];
    telefone_whatsapp?:  string;
  };
}

export interface SalesAgentOutput {
  reply:                  string;
  next_question?:         string;
  lead_capture_request?:  string[];  // fields to collect
  whatsapp_link?:         string;
  lead_score:             number;
  should_capture_lead:    boolean;
}

export async function runSalesAgentChat(
  input: SalesAgentInput,
  ctx: AgentContext
): Promise<SalesAgentOutput> {
  const history = input.conversation_history;
  const leadScore = scoreLead(history, input.page_context);

  const systemPrompt = `
Você é ${input.agent_config.display_name}, assistente de vendas especializado em ${input.page_context.servico ?? "serviços locais"}.

Contexto da página:
- URL: ${input.page_url}
- Serviço: ${input.page_context.servico ?? "serviço"}
- Cidade: ${input.page_context.cidade ?? ""}
- Telefone: ${input.page_context.telefone ?? ""}

Seu objetivo: ${input.agent_config.primary_goal}

Regras:
1. Responda em português brasileiro natural e amigável
2. NÃO invente preços, prazos ou garantias específicas
3. Quando detectar intenção de compra, qualifique com perguntas curtas
4. Máx 3 perguntas de qualificação, uma por vez
5. Ao final da qualificação, solicite nome + telefone/WhatsApp
6. Se perguntado sobre preço: "Posso te passar um orçamento personalizado. Me conta melhor o que precisa?"
7. Sempre ofereça contato via WhatsApp quando lead qualificado
`.trim();

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: input.message },
  ];

  const prompt = messages.map(m => `${m.role}: ${m.content}`).join("\n");

  const result = await callGeminiTracked("flash", prompt, {
    tenant_id:    ctx.tenant_id,
    agent_id:     "sales_agent",
    systemPrompt,
    temperature:  0.7,
    maxTokens:    300,
  });

  // Determine next qualifying question
  const questionIndex = history.filter(m => m.role === "assistant").length;
  const next_question = !leadScore.qualifying_complete && questionIndex < input.agent_config.qualifying_questions.length
    ? input.agent_config.qualifying_questions[questionIndex]
    : undefined;

  // Trigger lead capture when score >= 60
  const should_capture = leadScore.score >= 60 && !leadScore.has_contact;
  const lead_capture_request = should_capture
    ? ["nome", "telefone"]
    : undefined;

  // WhatsApp link
  const whatsapp_link = input.agent_config.telefone_whatsapp && leadScore.score >= 50
    ? `https://wa.me/55${input.agent_config.telefone_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vim pelo site sobre ${input.page_context.servico}`)}`
    : undefined;

  return {
    reply:               result.output,
    next_question,
    lead_capture_request,
    whatsapp_link,
    lead_score:          leadScore.score,
    should_capture_lead: should_capture,
  };
}

// ============================================================
// Orchestrator — executes pipeline, manages retries, context
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runSerpScout } from "./serpScout.ts";
import { runEntityMapper } from "./serpScout.ts";
import { runBlueprintArchitect, runSectionWriter } from "./contentAgents.ts";
import { runSEOPackFinalizer, runQualityGate } from "./seoAgents.ts";
import { suggestLinks, applyLinks } from "../skills/conversionSkills.ts";
import { injectLocalSignals } from "../skills/contentSkills.ts"; // D4: importar para uso no pipeline
import type { PipelineRunContext } from "../types/pipeline.ts";
import type { BusinessInputs } from "../types/agents.ts";

export interface ArticlePipelineInput {
  tenant_id:            string;
  primary_keyword:      string;
  secondary_keywords:   string[];
  business:             BusinessInputs;
  intent:               "informational" | "commercial" | "local" | "transactional";
  web_research_enabled: boolean;
  publish_mode:         "draft" | "schedule" | "publish";
  portal_base_url:      string;
  pipeline_run_id?:     string;
}

export async function runArticlePipeline(input: ArticlePipelineInput) {
  const sbUrl = Deno.env.get("SUPABASE_URL")!;
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb    = createClient(sbUrl, sbKey);

  const ctx: PipelineRunContext = {
    tenant_id:          input.tenant_id,
    pipeline_run_id:    input.pipeline_run_id ?? crypto.randomUUID(),
    web_research_enabled: input.web_research_enabled,
    locale:             "pt-BR",
    market:             "BR",
    steps_outputs:      {},
    current_step:       "",
    pipeline_context:   {},
  };

  const logStep = async (step: string, status: "started" | "done" | "failed", data?: unknown) => {
    await sb.from("job_events").insert({
      job_id:     input.pipeline_run_id,
      tenant_id:  input.tenant_id,
      event_type: status === "started" ? "step_started" : status === "done" ? "step_completed" : "error",
      message:    `${step} ${status}`,
      data_json:  data ?? {},
      created_at: new Date().toISOString(),
    }).catch(console.error);
  };

  // ── Step 1: SERP Scout
  ctx.current_step = "serp_scout";
  await logStep("serp_scout", "started");
  const serpOut = await runSerpScout({
    primary_keyword: input.primary_keyword,
    cidade:          input.business.cidade,
    estado:          input.business.estado,
    servico:         input.business.servico,
  }, ctx);
  await logStep("serp_scout", "done", { gaps: serpOut.serp_analysis.gaps });
  ctx.steps_outputs.serp_scout = serpOut;

  // ── Step 2: Entity Mapper
  ctx.current_step = "entity_mapper";
  await logStep("entity_mapper", "started");
  const entityOut = await runEntityMapper({
    serp_top3_titles:       serpOut.serp_analysis.top10.slice(0,3).map(r => r.title),
    serp_top3_descriptions: serpOut.serp_analysis.top10.slice(0,3).map(r => r.description),
    servico: input.business.servico,
    cidade:  input.business.cidade,
  }, ctx);
  await logStep("entity_mapper", "done", { entities_count: entityOut.entities.length });
  ctx.steps_outputs.entity_mapper = entityOut;

  // ── Step 3: Blueprint Architect
  ctx.current_step = "blueprint_architect";
  await logStep("blueprint_architect", "started");
  const blueprint = await runBlueprintArchitect({
    primary_keyword:    input.primary_keyword,
    secondary_keywords: input.secondary_keywords,
    servico:            input.business.servico,
    cidade:             input.business.cidade,
    estado:             input.business.estado,
    intent:             input.intent,
    serp_analysis:      serpOut.serp_analysis,
    entity_data:        entityOut,
  }, ctx);
  await logStep("blueprint_architect", "done", { h1: blueprint.h1, sections: blueprint.sections.length });
  ctx.steps_outputs.blueprint = blueprint;

  // ── Step 4: Section Writer (loop with max 1 retry)
  ctx.current_step = "section_writer";
  await logStep("section_writer", "started");
  let sectionOut = await runSectionWriter({
    blueprint,
    servico:              input.business.servico,
    cidade:               input.business.cidade,
    estado:               input.business.estado,
    empresa:              input.business.empresa,
    telefone:             input.business.telefone,
    web_research_enabled: input.web_research_enabled,
  }, ctx);
  ctx.steps_outputs.section_writer = sectionOut;

  // ── Step 4b: Local Signal Injection (D4 — estava sendo pulado)
  // Garante que cidade, estado e telefone aparecem no HTML final
  const htmlWithSignals = injectLocalSignals(
    sectionOut.full_content_html,
    input.business.cidade,
    input.business.estado,
    input.business.servico,
    input.business.telefone,
  );
  ctx.steps_outputs.local_signals = { injected: true };

  // ── Step 5: Internal Linking
  const { data: pagesData } = await sb
    .from("articles")
    .select("id, title, slug")
    .eq("tenant_id", input.tenant_id)
    .eq("status", "published")
    .limit(30);

  const published_pages = (pagesData ?? []).map((p: Record<string,string>) => ({
    id: p.id, title: p.title, slug: p.slug,
    url: `/${p.slug}`, type: "blog" as const, keywords: [], excerpt: "",
  }));

  const linkSuggestions = await suggestLinks(
    htmlWithSignals,
    published_pages,
    input.primary_keyword
  );
  const contentWithLinks = applyLinks(htmlWithSignals, linkSuggestions);
  ctx.steps_outputs.interlink = { links_applied: linkSuggestions.length };

  // ── Step 6: SEO Pack
  ctx.current_step = "seo_pack";
  await logStep("seo_pack", "started");
  const seoOut = await runSEOPackFinalizer({
    blueprint,
    content_html:     contentWithLinks,
    business:         input.business,
    portal_base_url:  input.portal_base_url,
  }, ctx);
  ctx.steps_outputs.seo_pack = seoOut;

  // ── Step 7: Quality Gate (with 1 retry)
  ctx.current_step = "quality_gate";
  await logStep("quality_gate", "started");
  const { data: tenantPages } = await sb
    .from("articles")
    .select("title, slug, excerpt")
    .eq("tenant_id", input.tenant_id)
    .eq("status", "published")
    .limit(20);

  let qaResult = await runQualityGate({
    content_html:         contentWithLinks,
    blueprint,
    business:             input.business,
    web_research_enabled: input.web_research_enabled,
    tenant_pages_sample:  (tenantPages ?? []).map((p: Record<string,string>) => ({
      title: p.title, slug: p.slug, content_sample: p.excerpt ?? "",
    })),
  }, ctx);

  // Retry once if score < 70
  if (!qaResult.approved && qaResult.retry_with_context) {
    await logStep("section_writer", "started", { retry: true });
    sectionOut = await runSectionWriter({
      blueprint,
      servico:              input.business.servico,
      cidade:               input.business.cidade,
      estado:               input.business.estado,
      empresa:              input.business.empresa,
      telefone:             input.business.telefone,
      web_research_enabled: input.web_research_enabled,
      retry_warnings:       qaResult.retry_with_context,
    }, ctx);

    const htmlRetryWithSignals = injectLocalSignals(
      sectionOut.full_content_html,
      input.business.cidade,
      input.business.estado,
      input.business.servico,
      input.business.telefone,
    );
    const retriedWithLinks = applyLinks(htmlRetryWithSignals, linkSuggestions);
    qaResult = await runQualityGate({
      content_html:         retriedWithLinks,
      blueprint,
      business:             input.business,
      web_research_enabled: input.web_research_enabled,
      tenant_pages_sample:  (tenantPages ?? []).map((p: Record<string,string>) => ({
        title: p.title, slug: p.slug, content_sample: p.excerpt ?? "",
      })),
    }, ctx);
  }

  await logStep("quality_gate", qaResult.approved ? "done" : "failed", {
    score: qaResult.score, warnings: qaResult.warnings,
  });

  return {
    approved:     qaResult.approved,
    quality_score: qaResult.score,
    blueprint,
    seo:          seoOut,
    content_html: contentWithLinks,
    sections:     sectionOut.sections_html,
    word_count:   sectionOut.word_count_total,
    warnings:     qaResult.warnings,
    pipeline_run_id: ctx.pipeline_run_id,
  };
}
