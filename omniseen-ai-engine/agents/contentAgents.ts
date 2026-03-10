// ============================================================
// Agent: blueprintArchitect (AG-05)
// Build complete content blueprint before any writing
// ============================================================

import { buildOutline } from "../skills/outlineBuilder.ts";
import type { AgentContext, ContentBlueprint } from "../types/agents.ts";
import type { SerpAnalysis } from "../skills/serpParser.ts";
import type { EntityMapperOutput } from "./serpScout.ts";

export interface BlueprintInput {
  primary_keyword:    string;
  secondary_keywords: string[];
  servico:            string;
  cidade:             string;
  estado:             string;
  intent:             "informational" | "commercial" | "local" | "transactional";
  serp_analysis:      SerpAnalysis;
  entity_data:        EntityMapperOutput;
  template_id?:       string; // for super pages
  word_count_target?: number;
}

export async function runBlueprintArchitect(
  input: BlueprintInput,
  ctx: AgentContext
): Promise<ContentBlueprint> {
  const word_count = input.word_count_target
    ?? Math.max(input.serp_analysis.avg_word_count_estimate + 200, 1200);

  return buildOutline({
    primary_keyword:    input.primary_keyword,
    secondary_keywords: input.secondary_keywords,
    cidade:             input.cidade,
    servico:            input.servico,
    intent:             input.intent,
    serp_analysis:      input.serp_analysis,
    entities:           input.entity_data.entities,
    word_count_target:  word_count,
  });
}

// ============================================================
// Agent: sectionWriter (AG-07)
// Loop: write each H2 section in isolation
// ============================================================

import { callGeminiTracked } from "../lib/ai/aiRouter.ts";
import { checkClaims } from "../skills/contentSkills.ts";
import type { GeneratedSection, OutlineSection } from "../types/agents.ts";

export interface SectionWriterInput {
  blueprint:  ContentBlueprint;
  servico:    string;
  cidade:     string;
  estado:     string;
  empresa:    string;
  telefone:   string;
  web_research_enabled: boolean;
  retry_warnings?: string[]; // from QualityGate on retry
}

export interface SectionWriterOutput {
  sections_html:     string[];
  full_content_html: string;
  word_count_total:  number;
  all_claims_flagged: string[];
}

export async function runSectionWriter(
  input: SectionWriterInput,
  ctx: AgentContext
): Promise<SectionWriterOutput> {
  const sections_html: string[] = [];
  const all_claims_flagged: string[] = [];
  let word_count_total = 0;

  const retryContext = input.retry_warnings?.length
    ? `\n\nADVERTÊNCIAS DA REVISÃO ANTERIOR — corrija:\n${input.retry_warnings.join("\n")}`
    : "";

  // Write each H2 section independently (anti-drift loop)
  for (const section of input.blueprint.sections) {
    const sectionHtml = await writeSingleSection(section, input, ctx, retryContext);

    // Apply anti-hallucination guard
    const { auto_fixed_content, warnings } = checkClaims(
      sectionHtml,
      input.web_research_enabled
    );

    sections_html.push(auto_fixed_content);
    all_claims_flagged.push(...warnings);
    word_count_total += auto_fixed_content.split(/\s+/).length;
  }

  const full_content_html = sections_html.join("\n\n");

  return { sections_html, full_content_html, word_count_total, all_claims_flagged };
}

async function writeSingleSection(
  section: OutlineSection,
  input: SectionWriterInput,
  ctx: AgentContext,
  retryContext: string
): Promise<string> {
  const h3s = section.h3s.length
    ? `Sub-seções obrigatórias (H3):\n${section.h3s.map(h => `- ${h}`).join("\n")}`
    : "";

  const localReq = section.local_signal_required
    ? `OBRIGATÓRIO: mencione "${input.cidade}" naturalmente nesta seção.`
    : "";

  const prompt = `
Você é redator SEO especialista em serviços locais brasileiros.

Escreva APENAS a seção "${section.h2}" em HTML semântico.

Contexto:
- Serviço: ${input.servico}
- Empresa: ${input.empresa}
- Cidade: ${input.cidade}, ${input.estado}
- Telefone: ${input.telefone}
- Word count alvo desta seção: ${section.word_count_target} palavras

${h3s}
${localReq}

Regras absolutas:
1. Retorne APENAS HTML (h2, h3, p, ul/li, table se necessário)
2. NÃO inventar preços, certificações, anos de mercado, reviews
3. NÃO usar expressões genéricas como "empresa de confiança" sem base
4. Texto em português brasileiro natural
5. Incluir CTA com telefone se for seção de contato ou CTA
6. Listas com pelo menos 3 itens quando usar ul
${retryContext}
`.trim();

  const result = await callGeminiTracked("flash", prompt, {
    tenant_id:   ctx.tenant_id,
    agent_id:    "section_writer",
    temperature: 0.65,
    maxTokens:   2000,
  });

  return result.output;
}
