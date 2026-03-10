// ============================================================
// Skill: outlineBuilder — build content blueprint from data
// ============================================================

import type { ContentBlueprint, OutlineSection, SerpAnalysis, EntityResult } from "../../types/agents.ts";
import { callGemini } from "../lib/ai/aiRouter.ts";

export interface OutlineInput {
  primary_keyword: string;
  secondary_keywords: string[];
  cidade: string;
  servico: string;
  intent: "informational" | "commercial" | "local" | "transactional";
  serp_analysis: SerpAnalysis;
  entities: EntityResult[];
  word_count_target: number;
}

const OUTLINE_SCHEMA = {
  type: "object",
  properties: {
    h1:                  { type: "string" },
    meta_title:          { type: "string" },
    meta_description:    { type: "string" },
    slug:                { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          h2:                     { type: "string" },
          h3s:                    { type: "array", items: { type: "string" } },
          intent:                 { type: "string" },
          word_count_target:      { type: "number" },
          local_signal_required:  { type: "boolean" },
          schema_eligible:        { type: "boolean" },
        },
        required: ["h2", "h3s", "intent", "word_count_target", "local_signal_required"],
      },
    },
    local_signals:         { type: "array", items: { type: "string" } },
    entities_required:     { type: "array", items: { type: "string" } },
    schema_types:          { type: "array", items: { type: "string" } },
  },
  required: ["h1","meta_title","meta_description","slug","sections","local_signals","entities_required","schema_types"],
};

export async function buildOutline(input: OutlineInput): Promise<ContentBlueprint> {
  const gapsText  = input.serp_analysis.gaps.join("; ") || "nenhum gap identificado";
  const entidades = input.entities.slice(0, 8).map(e => e.name).join(", ");
  const formats   = input.serp_analysis.content_formats_detected.join(", ") || "texto corrido";

  const prompt = `
Você é um especialista em SEO local brasileiro.

Crie um outline completo para um artigo/página sobre:
- Keyword principal: "${input.primary_keyword}"
- Keywords secundárias: ${input.secondary_keywords.join(", ")}
- Cidade/Região: ${input.cidade}
- Serviço: ${input.servico}
- Intenção: ${input.intent}
- Word count alvo: ${input.word_count_target} palavras

Contexto SERP:
- Top 3 domínios: ${input.serp_analysis.domains_top3.join(", ")}
- Formatos detectados: ${formats}
- Gaps identificados: ${gapsText}
- Entidades obrigatórias: ${entidades}

Regras:
1. H1 deve conter keyword + cidade
2. Primeiro H2: responde a intenção principal diretamente
3. Incluir seção de FAQ se intent = local ou commercial
4. Incluir seção "Áreas atendidas" para serviços locais
5. Último H2 deve ser CTA
6. Meta title: máx 60 chars, keyword no início
7. Meta description: máx 155 chars, keyword + cidade + diferencial

Retorne JSON válido seguindo o schema.
`.trim();

  const result = await callGemini("pro", prompt, {
    responseSchema: OUTLINE_SCHEMA,
    temperature: 0.4,
  });

  const parsed = result.parsed as Record<string, unknown>;

  return {
    h1:                parsed.h1          as string,
    meta_title:        parsed.meta_title  as string,
    meta_description:  parsed.meta_description as string,
    slug:              parsed.slug        as string,
    sections:          parsed.sections    as OutlineSection[],
    local_signals:     parsed.local_signals as string[],
    entities_required: parsed.entities_required as string[],
    schema_types:      parsed.schema_types as string[],
    word_count_total:  input.word_count_target,
    primary_keyword:   input.primary_keyword,
    secondary_keywords: input.secondary_keywords,
  };
}
