// ============================================================
// Skill: internalLinkSuggester
// ============================================================

import type { LinkSuggestion, PageIndex } from "../../types/agents.ts";
import { callGemini } from "../lib/ai/aiRouter.ts";

const MAX_LINKS = 8;
const MIN_LINKS = 3;

export async function suggestLinks(
  content: string,
  published_pages: PageIndex[],
  primary_keyword: string
): Promise<LinkSuggestion[]> {
  if (published_pages.length === 0) return [];

  const pagesContext = published_pages
    .slice(0, 20)
    .map(p => `[${p.type}] "${p.title}" → /${p.slug} | keywords: ${p.keywords.join(", ")}`)
    .join("\n");

  const prompt = `
Você é especialista em links internos SEO para sites em português.

Conteúdo novo (primeiros 1500 chars):
${content.slice(0, 1500)}

Keyword principal: "${primary_keyword}"

Páginas disponíveis para linkar:
${pagesContext}

Regras:
- Sugerir entre ${MIN_LINKS} e ${MAX_LINKS} links
- Anchor text natural em português, não keyword-stuffing
- Não repetir a mesma página
- Indicar em qual seção (h2 title) inserir o link

Retorne JSON array:
[{"anchor":"texto do link","url":"/slug-da-pagina","reason":"por que este link","position_hint":"após qual H2"}]
`.trim();

  const result = await callGemini("flash", prompt, {
    responseSchema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          anchor:        { type: "string" },
          url:           { type: "string" },
          reason:        { type: "string" },
          position_hint: { type: "string" },
        },
        required: ["anchor", "url", "reason", "position_hint"],
      },
    },
    temperature: 0.3,
  });

  const suggestions = (result.parsed as LinkSuggestion[]) ?? [];
  return suggestions.slice(0, MAX_LINKS);
}

// Inject links into HTML content
export function applyLinks(content: string, links: LinkSuggestion[]): string {
  let result = content;
  let applied = 0;

  for (const link of links) {
    if (applied >= MAX_LINKS) break;
    // Only inject if anchor text appears naturally and link not already present
    const regex = new RegExp(`(?<!href=")\\b${escapeRegex(link.anchor)}\\b(?![^<]*>)`, "i");
    if (regex.test(result) && !result.includes(link.url)) {
      result = result.replace(regex, `<a href="${link.url}">${link.anchor}</a>`);
      applied++;
    }
  }

  return result;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================
// Skill: duplicateDetector
// ============================================================

export interface DuplicateCheckResult {
  similarity_score: number; // 0-100
  is_duplicate: boolean;    // true if > 70
  similar_pages: Array<{ title: string; url: string; score: number }>;
}

export function detectDuplication(
  new_content: string,
  tenant_pages: Array<{ title: string; slug: string; content_sample: string }>
): DuplicateCheckResult {
  const newWords = new Set(
    new_content.toLowerCase().split(/\W+/).filter(w => w.length > 4)
  );

  const results = tenant_pages.map(page => {
    const pageWords = new Set(
      page.content_sample.toLowerCase().split(/\W+/).filter(w => w.length > 4)
    );
    const intersection = [...newWords].filter(w => pageWords.has(w)).length;
    const union = new Set([...newWords, ...pageWords]).size;
    const score = union > 0 ? Math.round((intersection / union) * 100) : 0;
    return { title: page.title, url: `/${page.slug}`, score };
  });

  const maxScore = Math.max(...results.map(r => r.score), 0);
  const similar  = results.filter(r => r.score > 40).sort((a, b) => b.score - a.score);

  return {
    similarity_score: maxScore,
    is_duplicate:     maxScore > 70,
    similar_pages:    similar,
  };
}

// ============================================================
// Skill: leadScorer
// ============================================================

import type { Message, PageContext } from "../../types/agents.ts";

export type LeadIntent = "budget" | "info" | "schedule" | "unknown";

export interface LeadScore {
  score: number;       // 0-100
  intent: LeadIntent;
  has_contact: boolean;
  qualifying_complete: boolean;
  reasoning: string;
}

const BUDGET_SIGNALS   = ["preço", "valor", "custo", "orçamento", "quanto", "cobram", "caro"];
const SCHEDULE_SIGNALS = ["agendar", "agenda", "visita", "quando", "disponível", "atender", "urgente"];
const INFO_SIGNALS     = ["como funciona", "o que é", "quero saber", "me explica", "dúvida"];

export function scoreLead(conversation: Message[], page_context: PageContext): LeadScore {
  const userMessages = conversation
    .filter(m => m.role === "user")
    .map(m => m.content.toLowerCase())
    .join(" ");

  let score = 20; // base
  let intent: LeadIntent = "unknown";

  // Intent detection
  const budgetHits   = BUDGET_SIGNALS.filter(s => userMessages.includes(s)).length;
  const scheduleHits = SCHEDULE_SIGNALS.filter(s => userMessages.includes(s)).length;
  const infoHits     = INFO_SIGNALS.filter(s => userMessages.includes(s)).length;

  if (budgetHits >= scheduleHits && budgetHits >= infoHits && budgetHits > 0) {
    intent = "budget";
    score += 40;
  } else if (scheduleHits > 0) {
    intent = "schedule";
    score += 50;
  } else if (infoHits > 0) {
    intent = "info";
    score += 15;
  }

  // Bonus: super_page context = higher commercial intent
  if (page_context.page_type === "super_page") score += 15;

  // Bonus: conversation length (engagement)
  score += Math.min(conversation.length * 3, 15);

  // Check if contact info provided
  const hasPhone = /\b\d{10,11}\b/.test(userMessages);
  const hasEmail = /\S+@\S+\.\S+/.test(userMessages);
  const has_contact = hasPhone || hasEmail;
  if (has_contact) score += 10;

  const qualifying_complete = conversation.filter(m => m.role === "user").length >= 3;

  return {
    score: Math.min(score, 100),
    intent,
    has_contact,
    qualifying_complete,
    reasoning: `Intent=${intent}, msgs=${conversation.length}, contact=${has_contact}`,
  };
}
