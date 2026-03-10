// ============================================================
// Agent: seoPackFinalizer (AG-10)
// Meta + canonical + full JSON-LD schema
// ============================================================

import {
  buildLocalBusinessSchema,
  buildFAQSchema,
  buildBreadcrumbSchema,
} from "../skills/contentSkills.ts";
import type { AgentContext, ContentBlueprint, BusinessInputs, JSONLDSchema, QualityReport } from "../types/agents.ts";

export interface SEOPackInput {
  blueprint:   ContentBlueprint;
  content_html: string;
  business:    BusinessInputs;
  portal_base_url: string;
}

export interface SEOPackOutput {
  meta_title:       string;
  meta_description: string;
  canonical_url:    string;
  og_tags:          Record<string, string>;
  schema_jsonld:    JSONLDSchema[];
  slug:             string;
}

export async function runSEOPackFinalizer(
  input: SEOPackInput,
  _ctx: AgentContext
): Promise<SEOPackOutput> {
  const canonical_url = `${input.portal_base_url}/${input.blueprint.slug}`;

  const schemas: JSONLDSchema[] = [
    buildLocalBusinessSchema(input.business),
  ];

  // Add FAQPage schema if FAQ section detected
  const faqMatches = [...input.content_html.matchAll(/<h3[^>]*>(.*?)<\/h3>\s*<p>(.*?)<\/p>/gis)];
  if (faqMatches.length >= 2) {
    const faqs = faqMatches.slice(0, 10).map(m => ({
      question: m[1].replace(/<[^>]+>/g, "").trim(),
      answer:   m[2].replace(/<[^>]+>/g, "").trim(),
    }));
    schemas.push(buildFAQSchema(faqs));
  }

  // Breadcrumb
  schemas.push(buildBreadcrumbSchema([
    { name: "Início", url: input.portal_base_url },
    { name: input.business.servico, url: `${input.portal_base_url}/servicos` },
    { name: input.blueprint.h1,     url: canonical_url },
  ]));

  const og_tags: Record<string, string> = {
    "og:title":       input.blueprint.meta_title,
    "og:description": input.blueprint.meta_description,
    "og:url":         canonical_url,
    "og:type":        "website",
    "og:locale":      "pt_BR",
  };

  return {
    meta_title:       input.blueprint.meta_title,
    meta_description: input.blueprint.meta_description,
    canonical_url,
    og_tags,
    schema_jsonld: schemas,
    slug:          input.blueprint.slug,
  };
}

// ============================================================
// Agent: qualityGate (AG-11)
// Validation — score < 70 triggers retry with context
// ============================================================

import { checkClaims } from "../skills/contentSkills.ts";
import { detectDuplication } from "../skills/conversionSkills.ts";

export interface QualityGateInput {
  content_html:         string;
  blueprint:            ContentBlueprint;
  business:             BusinessInputs;
  web_research_enabled: boolean;
  tenant_pages_sample:  Array<{ title: string; slug: string; content_sample: string }>;
}

export async function runQualityGate(
  input: QualityGateInput,
  _ctx: AgentContext
): Promise<QualityReport> {
  const warnings:   string[] = [];
  const auto_fixes: string[] = [];
  let score = 100;

  // 1. Anti-hallucination check
  const { warnings: claimWarnings, auto_fixed_content } = checkClaims(
    input.content_html,
    input.web_research_enabled
  );
  warnings.push(...claimWarnings);
  auto_fixes.push(...claimWarnings.filter(w => w.startsWith("Auto-removido")));
  score -= claimWarnings.length * 10;

  // 2. Local signals check — cidade must appear >= 3 times
  const cidadeCount = (
    input.content_html.toLowerCase().match(
      new RegExp(input.business.cidade.toLowerCase(), "g")
    ) ?? []
  ).length;
  if (cidadeCount < 3) {
    warnings.push(`Sinal local insuficiente: "${input.business.cidade}" aparece apenas ${cidadeCount}x (mínimo 3)`);
    score -= 15;
  }

  // 3. Entity coverage check
  const missingEntities = input.blueprint.entities_required.filter(
    e => !input.content_html.toLowerCase().includes(e.toLowerCase())
  );
  if (missingEntities.length > 0) {
    warnings.push(`Entidades ausentes: ${missingEntities.join(", ")}`);
    score -= missingEntities.length * 5;
  }

  // 4. Word count check (sem tags HTML — elas inflavam a contagem)
  const plain_text = input.content_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plain_text.split(" ").filter(Boolean).length;
  if (wordCount < input.blueprint.word_count_total * 0.75) {
    warnings.push(`Word count baixo: ${wordCount} palavras (esperado ${input.blueprint.word_count_total})`);
    score -= 20;
  }

  // 5. Duplicate detection
  const { is_duplicate, similarity_score, similar_pages } = detectDuplication(
    input.content_html,
    input.tenant_pages_sample
  );
  if (is_duplicate) {
    warnings.push(`Conteúdo similar detectado (${similarity_score}%): ${similar_pages[0]?.title}`);
    score -= 30;
  } else if (similarity_score > 40) {
    warnings.push(`Similaridade moderada (${similarity_score}%) com: ${similar_pages[0]?.title}`);
    score -= 10;
  }

  // 6. H1 contains keyword check
  if (!input.content_html.toLowerCase().includes(input.blueprint.primary_keyword.toLowerCase())) {
    warnings.push(`Keyword principal "${input.blueprint.primary_keyword}" não encontrada no conteúdo`);
    score -= 15;
  }

  const finalScore   = Math.max(score, 0);
  const approved     = finalScore >= 70;

  return {
    score:              finalScore,
    approved,
    warnings,
    auto_fixes,
    publish_ready:      approved,
    retry_with_context: approved ? undefined : warnings,
  };
}
