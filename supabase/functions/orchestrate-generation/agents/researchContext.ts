/**
 * Agent: researchContext
 * Chama a edge function `research-context` (Perplexity Sonar Pro) e `find-authority-links`
 * para enriquecer o contexto semântico antes da geração do conteúdo.
 *
 * Ambas as chamadas são non-blocking: se falharem, retornam dados vazios
 * e o pipeline continua normalmente.
 */

import { JobInput } from "../types/agentTypes.ts";

export interface ResearchContext {
  statistics: string[];
  local_entities: string[];
  trends: string[];
  authority_sources: { title: string; url: string }[];
  summary: string;
  citations: string[];
}

export interface AuthorityLink {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  isHighAuthority: boolean;
}

export interface ResearchOutput {
  research: ResearchContext | null;
  authority_links: AuthorityLink[];
  costUsd: number;
  warnings: string[];
}

async function invokeEdgeFunction<T>(
  supabaseUrl: string,
  serviceKey: string,
  functionName: string,
  body: Record<string, unknown>,
  timeoutMs = 35_000
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "x-client-info": "orchestrate-generation/research",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { data: null, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }

    const json = await res.json() as { success?: boolean; error?: string } & T;
    if (json.success === false) {
      return { data: null, error: json.error || "unknown_error" };
    }
    return { data: json as T, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Executa pesquisa de contexto (Perplexity) e busca de links autoritativos (Google CSE)
 * em paralelo, com fallback gracioso para qualquer falha.
 */
export async function executeResearchContext(
  jobInput: JobInput,
  supabaseUrl: string,
  serviceKey: string,
): Promise<ResearchOutput> {
  const keyword = jobInput.keyword || "";
  const city = jobInput.city || "";
  const niche = jobInput.niche || "business";
  const language = jobInput.language || "pt-BR";

  const warnings: string[] = [];
  let costUsd = 0;

  // Chama as duas funções em paralelo para economizar tempo
  const [researchResult, linksResult] = await Promise.allSettled([
    invokeEdgeFunction<{ data: ResearchContext | null; costUsd: number }>(
      supabaseUrl,
      serviceKey,
      "research-context",
      { keyword, city, niche, language },
      35_000
    ),
    invokeEdgeFunction<{ links: AuthorityLink[]; total: number }>(
      supabaseUrl,
      serviceKey,
      "find-authority-links",
      { keyword, city, num: 8 },
      25_000
    ),
  ]);

  // Process research-context
  let research: ResearchContext | null = null;
  if (researchResult.status === "fulfilled") {
    const { data, error } = researchResult.value;
    if (error) {
      warnings.push(`[RESEARCH_CONTEXT] ${error}`);
      console.warn(`[RESEARCH_CONTEXT_AGENT] Falhou (non-fatal): ${error}`);
    } else if (data?.data) {
      research = data.data;
      costUsd += data.costUsd || 0;
      console.log(`[RESEARCH_CONTEXT_AGENT] ✅ Contexto obtido: ${research.statistics.length} estatísticas, ${research.local_entities.length} entidades`);
    }
  } else {
    const errMsg = researchResult.reason instanceof Error ? researchResult.reason.message : String(researchResult.reason);
    warnings.push(`[RESEARCH_CONTEXT] Promise rejected: ${errMsg}`);
    console.warn(`[RESEARCH_CONTEXT_AGENT] Promise rejeitada (non-fatal): ${errMsg}`);
  }

  // Process find-authority-links
  let authority_links: AuthorityLink[] = [];
  if (linksResult.status === "fulfilled") {
    const { data, error } = linksResult.value;
    if (error) {
      warnings.push(`[FIND_AUTHORITY_LINKS] ${error}`);
      console.warn(`[AUTHORITY_LINKS_AGENT] Falhou (non-fatal): ${error}`);
    } else if (data?.links) {
      authority_links = data.links;
      console.log(`[AUTHORITY_LINKS_AGENT] ✅ ${authority_links.length} links encontrados (${authority_links.filter(l => l.isHighAuthority).length} alta autoridade)`);
    }
  } else {
    const errMsg = linksResult.reason instanceof Error ? linksResult.reason.message : String(linksResult.reason);
    warnings.push(`[FIND_AUTHORITY_LINKS] Promise rejected: ${errMsg}`);
    console.warn(`[AUTHORITY_LINKS_AGENT] Promise rejeitada (non-fatal): ${errMsg}`);
  }

  return {
    research,
    authority_links,
    costUsd,
    warnings,
  };
}
