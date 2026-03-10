// ============================================================
// Skill: localSignalInjector
// ============================================================

export function injectLocalSignals(
  content: string,
  cidade: string,
  estado: string,
  servico: string,
  telefone?: string
): string {
  // Ensure cidade appears in first 200 chars
  if (!content.toLowerCase().includes(cidade.toLowerCase())) {
    content = content.replace(/<h2/, `<p class="local-intro">Atendemos em <strong>${cidade}, ${estado}</strong>.</p>\n<h2`);
  }

  // Inject service + city in alt tags if images present
  content = content.replace(
    /alt="([^"]*)"/g,
    (_, alt) => `alt="${alt || `${servico} em ${cidade}`}"`
  );

  // Replace placeholder [TELEFONE] with real value
  if (telefone) {
    content = content.replace(/\[TELEFONE\]/g, telefone);
  }

  return content;
}

// ============================================================
// Skill: schemaBuilder — JSON-LD for local business pages
// ============================================================

import type { BusinessInputs, JSONLDSchema } from "../../types/agents.ts";

export function buildLocalBusinessSchema(inputs: BusinessInputs): JSONLDSchema {
  const schema: JSONLDSchema = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "Service"],
    name: inputs.empresa,
    description: `${inputs.servico} em ${inputs.cidade}, ${inputs.estado}`,
    telephone: inputs.telefone,
    areaServed: {
      "@type": "City",
      name: inputs.cidade,
    },
    serviceType: inputs.servico,
    url: inputs.site_url ?? undefined,
  };

  if (inputs.endereco) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: inputs.endereco,
      addressLocality: inputs.cidade,
      addressRegion: inputs.estado,
      addressCountry: "BR",
    };
    schema.geo = undefined; // would need lat/lng
  }

  if (inputs.horario_funcionamento) {
    schema.openingHours = inputs.horario_funcionamento;
  }

  return schema;
}

export function buildFAQSchema(faqs: Array<{ question: string; answer: string }>): JSONLDSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): JSONLDSchema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ============================================================
// Skill: antiHallucinationGuard
// ============================================================

const HALLUCINATION_PATTERNS = [
  { pattern: /\b\d{1,3}%\s*(dos|de)\s*(clientes|casos|pacientes)/gi, label: "estatística sem fonte" },
  { pattern: /\bgarantimos\s+\d+\s*anos/gi,         label: "garantia inventada" },
  { pattern: /\bmais\s+de\s+\d+\s+anos\s+no\s+mercado/gi, label: "anos de mercado não verificados" },
  { pattern: /\bISO\s*\d+/gi,                        label: "certificação ISO não verificada" },
  { pattern: /\bCREA|CRM|CRO|CFM\s*n[°º]\s*\d+/gi,  label: "registro profissional inventado" },
  { pattern: /\bprêmio\s+\w+/gi,                     label: "prêmio não verificado" },
  { pattern: /\bR\$\s*\d+[\.,]\d*/gi,                label: "preço específico inventado" },
];

export interface HallucinationCheckResult {
  warnings: string[];
  auto_fixed_content: string;
  has_issues: boolean;
}

export function checkClaims(
  content: string,
  web_research_enabled: boolean
): HallucinationCheckResult {
  let fixed = content;
  const warnings: string[] = [];

  for (const { pattern, label } of HALLUCINATION_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      if (!web_research_enabled) {
        // Auto-fix: remove or neutralize
        fixed = fixed.replace(pattern, "[informação omitida]");
        warnings.push(`Auto-removido: ${label} — "${matches[0]}"`);
      } else {
        warnings.push(`Verificar com fonte: ${label} — "${matches[0]}"`);
      }
    }
  }

  return {
    warnings,
    auto_fixed_content: fixed,
    has_issues: warnings.length > 0,
  };
}
