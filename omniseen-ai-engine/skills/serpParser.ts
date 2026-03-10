// ============================================================
// Skill: serpParser — parse raw SERP into actionable insights
// ============================================================

import type { SerpResult, PlaceResult } from "../../types/agents.ts";

export interface SerpAnalysis {
  top10: SerpResult[];
  local_pack: PlaceResult[];
  domains_top3: string[];
  avg_word_count_estimate: number;
  content_formats_detected: string[]; // "list", "faq", "table", "guide"
  gaps: string[];                     // opportunities not covered in top10
  paa_questions: string[];            // People Also Ask
}

export function parseSerp(
  results: SerpResult[],
  local_pack: PlaceResult[] = []
): SerpAnalysis {
  const top10 = results.slice(0, 10);
  const domains_top3 = top10.slice(0, 3).map(r => r.domain);

  // Detect content formats from titles/descriptions
  const allText = top10.map(r => `${r.title} ${r.description}`).join(" ").toLowerCase();
  const content_formats_detected: string[] = [];
  if (allText.includes("como") || allText.includes("guia") || allText.includes("passo"))  content_formats_detected.push("guide");
  if (allText.includes("lista") || allText.includes("melhores") || allText.includes("top")) content_formats_detected.push("list");
  if (allText.includes("preço") || allText.includes("valor") || allText.includes("custo")) content_formats_detected.push("pricing");
  if (allText.includes("faq") || allText.includes("pergunta") || allText.includes("dúvida")) content_formats_detected.push("faq");
  if (allText.includes("comparação") || allText.includes("vs") || allText.includes("diferença")) content_formats_detected.push("comparison");

  // D5: Estimar word count alvo com base na densidade dos snippets SERP.
  // Baseline: artigos de serviço local precisam de ao menos 1500 palavras para ranquear.
  // Cada palavra na description representa ~12 palavras reais de artigo.
  const snippet_density = top10.reduce((sum, r) => sum + r.description.split(" ").length, 0) / Math.max(top10.length, 1);
  const avg_word_count_estimate = Math.min(Math.max(Math.round(snippet_density * 12), 1500), 3000);

  // Gaps: simple heuristic — look for topics not covered
  const gaps: string[] = [];
  if (!allText.includes("preço")) gaps.push("Falta informação de preço/custo");
  if (!allText.includes("prazo")) gaps.push("Falta informação de prazo");
  if (!allText.includes("garantia")) gaps.push("Falta informação de garantia");
  if (local_pack.length > 0 && !allText.includes("área")) gaps.push("Falta abordagem de área atendida");

  // D6: Extrair PAA questions dos títulos/descrições SERP
  // Em vez de esperar pelo TrendAnalyst (que nunca popula), extrai heuristicamente.
  const paaKeywords = ["como", "quanto", "qual", "o que", "por que", "quando", "onde", "devo", "posso"];
  const paa_candidates: string[] = [];
  for (const r of top10) {
    const sentences = `${r.title}. ${r.description}`.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
    for (const s of sentences) {
      const low = s.toLowerCase();
      if (paaKeywords.some(k => low.startsWith(k)) && s.length > 20 && s.length < 120) {
        const q = s.endsWith("?") ? s : `${s}?`;
        paa_candidates.push(q);
      }
    }
  }
  const paa_questions = [...new Set(paa_candidates)].slice(0, 5);

  return {
    top10,
    local_pack,
    domains_top3,
    avg_word_count_estimate: Math.max(avg_word_count_estimate, 800),
    content_formats_detected,
    gaps,
    paa_questions,
  };
}
