import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Edge Function: find-authority-links
 * Usa Google Custom Search API para encontrar links autoritativos sobre um tópico.
 * Retorna: lista de URLs de alta autoridade para usar como links externos no artigo.
 *
 * Entrada (POST JSON):
 *   { keyword: string; city?: string; niche?: string; num?: number }
 *
 * Saída:
 *   { success: boolean; links: AuthorityLink[]; total: number; error?: string }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Domínios de alto DR para filtrar e priorizar
const HIGH_AUTHORITY_DOMAINS = [
  "gov.br", "org.br", "edu.br",
  "wikipedia.org", "wikipedia.com",
  "ibge.gov.br", "anvisa.gov.br",
  "cfo.org.br", "cfm.org.br", "crm", "crea",
  "sebrae.com.br",
  "ministeriosaude.gov.br",
  "scielo.br", "pubmed.ncbi.nlm.nih.gov",
  ".edu", ".gov",
];

interface AuthorityLink {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  isHighAuthority: boolean;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isHighAuthority(domain: string): boolean {
  return HIGH_AUTHORITY_DOMAINS.some((d) => domain.includes(d));
}

/**
 * Busca links autoritativos via Google Custom Search API.
 * Faz duas buscas: uma com "site:.gov.br OR site:.org.br" e outra geral.
 * Retorna os resultados rankeados por autoridade.
 */
async function findAuthorityLinks(
  keyword: string,
  city: string,
  apiKey: string,
  searchEngineId: string,
  maxResults = 10
): Promise<AuthorityLink[]> {
  const searchQuery = city ? `${keyword} ${city}` : keyword;
  const allLinks: AuthorityLink[] = [];

  // Query 1: Fontes autoritativas (.gov, .org, .edu)
  const authorityQuery = `${searchQuery} (site:.gov.br OR site:.org.br OR site:.edu.br OR site:wikipedia.org)`;
  const queries = [
    { q: authorityQuery, label: "authority" },
    { q: searchQuery, label: "general" },
  ];

  for (const { q, label } of queries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(q)}&gl=br&hl=pt-BR&num=5`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });

      if (!res.ok) {
        console.warn(`[FIND_AUTHORITY_LINKS] Google CSE HTTP ${res.status} para query "${label}"`);
        continue;
      }

      const data = await res.json();
      const items = data.items || [];

      for (const item of items) {
        const domain = extractDomain(item.link || "");
        // Evita duplicatas
        if (allLinks.some((l) => l.url === item.link)) continue;

        allLinks.push({
          title: item.title || "",
          url: item.link || "",
          snippet: item.snippet || "",
          domain,
          isHighAuthority: isHighAuthority(domain),
        });
      }
    } catch (e) {
      console.warn(`[FIND_AUTHORITY_LINKS] Erro na query "${label}":`, e instanceof Error ? e.message : String(e));
    }
  }

  // Rankear: alta autoridade primeiro, depois por ordem de aparição
  const ranked = [
    ...allLinks.filter((l) => l.isHighAuthority),
    ...allLinks.filter((l) => !l.isHighAuthority),
  ];

  return ranked.slice(0, maxResults);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const keyword: string = body.keyword || "";
    const city: string = body.city || "";
    const num: number = Math.min(Number(body.num) || 10, 20);

    if (!keyword) {
      return new Response(
        JSON.stringify({ success: false, error: "keyword is required", links: [], total: 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const googleApiKey = Deno.env.get("GOOGLE_CUSTOM_SEARCH_KEY");
    const searchEngineId = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID");

    if (!googleApiKey || !searchEngineId) {
      console.warn("[FIND_AUTHORITY_LINKS] GOOGLE_CUSTOM_SEARCH_KEY ou GOOGLE_SEARCH_ENGINE_ID não configurados.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "GOOGLE_CUSTOM_SEARCH_NOT_CONFIGURED",
          links: [],
          total: 0,
          latencyMs: Date.now() - startTime,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const links = await findAuthorityLinks(keyword, city, googleApiKey, searchEngineId, num);

    return new Response(
      JSON.stringify({
        success: true,
        links,
        total: links.length,
        highAuthorityCount: links.filter((l) => l.isHighAuthority).length,
        latencyMs: Date.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[FIND_AUTHORITY_LINKS] Erro fatal:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg, links: [], total: 0 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
