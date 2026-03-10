// ============================================================
// Agent: serpScout (AG-01)
// Maps who is ranking for {service}+{city} right now
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { searchSerp } from "../lib/google/customSearch.ts";
import { searchNearby, geocodeCity } from "../lib/google/places.ts";
import { parseSerp } from "../skills/serpParser.ts";
import type { AgentContext, SerpResult, PlaceResult } from "../types/agents.ts";
import type { SerpAnalysis } from "../skills/serpParser.ts";

export interface SerpScoutInput {
  primary_keyword: string;
  cidade: string;
  estado: string;
  servico: string;
  radius_km?: number;
}

export interface SerpScoutOutput {
  serp_analysis: SerpAnalysis;
  query_used: string;
  local_pack: PlaceResult[];
}

export async function runSerpScout(
  input: SerpScoutInput,
  ctx: AgentContext
): Promise<SerpScoutOutput> {
  const query = `${input.servico} ${input.cidade}`;

  // Parallel: SERP + local places
  const [serpResults, geoCoords] = await Promise.all([
    searchSerp(query, { gl: "br", hl: "pt", num: 10 }),
    geocodeCity(input.cidade, input.estado).catch(() => null),
  ]);

  let local_pack: PlaceResult[] = [];
  if (geoCoords) {
    local_pack = await searchNearby(
      input.servico,
      geoCoords.lat,
      geoCoords.lng,
      (input.radius_km ?? 5) * 1000
    ).catch(() => []);
  }

  const serp_analysis = parseSerp(serpResults, local_pack);

  return { serp_analysis, query_used: query, local_pack };
}

// ============================================================
// Agent: entityMapper (AG-02)
// Extract semantic entities Google expects to see
// ============================================================

import { callGeminiTracked } from "../lib/ai/aiRouter.ts";
import type { EntityResult } from "../types/agents.ts";

export interface EntityMapperInput {
  serp_top3_titles: string[];
  serp_top3_descriptions: string[];
  servico: string;
  cidade: string;
}

export interface EntityMapperOutput {
  entities: EntityResult[];
  schema_type_recommended: string;
  topicos_semanticos: string[];
  categoria_google: string;
}

const ENTITY_SCHEMA = {
  type: "object",
  properties: {
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name:  { type: "string" },
          type:  { type: "string" },
          score: { type: "number" },
        },
        required: ["name","type","score"],
      },
    },
    schema_type_recommended: { type: "string" },
    topicos_semanticos:      { type: "array", items: { type: "string" } },
    categoria_google:        { type: "string" },
  },
  required: ["entities","schema_type_recommended","topicos_semanticos","categoria_google"],
};

export async function runEntityMapper(
  input: EntityMapperInput,
  ctx: AgentContext
): Promise<EntityMapperOutput> {
  const prompt = `
Você é um especialista em SEO semântico brasileiro.

Serviço: "${input.servico}" | Cidade: "${input.cidade}"

Top 3 SERP snippets:
${input.serp_top3_titles.map((t,i) => `${i+1}. ${t} — ${input.serp_top3_descriptions[i]}`).join("\n")}

Extraia:
1. Entidades semânticas que o Google espera neste conteúdo (nome, tipo, relevância 0-100)
2. Schema.org type mais adequado (ex: "LocalBusiness", "Service", "Article")
3. Tópicos semânticos LSI (mínimo 10)
4. Categoria de negócio Google (ex: "Serviço de dedetização")

Retorne JSON.
`.trim();

  const result = await callGeminiTracked("flash", prompt, {
    tenant_id: ctx.tenant_id,
    agent_id:  "entity_mapper",
    responseSchema: ENTITY_SCHEMA,
    temperature: 0.2,
  });

  return result.parsed as EntityMapperOutput;
}
