// ═══════════════════════════════════════════════════════════════════
// COMPETITOR FILTER: Filtro Inteligente de Concorrentes
// V1.0: Remove diretórios, agregadores e marketplaces
// 
// REGRA: Apenas empresas reais do nicho são concorrentes válidos.
// Diretórios e agregadores não competem pelo cliente final.
// ═══════════════════════════════════════════════════════════════════

// Domínios genéricos que NUNCA são concorrentes reais
export const BLOCKED_DOMAINS: string[] = [
  // === DIRETÓRIOS INTERNACIONAIS ===
  'yelp.com',
  'yelp.com.br',
  'yellowpages.com',
  'tripadvisor.com',
  'tripadvisor.com.br',
  'foursquare.com',
  'zomato.com',
  'manta.com',
  'bbb.org',
  'chamberofcommerce.com',
  'mapquest.com',
  'superpages.com',
  'whitepages.com',
  'citysearch.com',
  'angieslist.com',
  'homeadvisor.com',
  'thumbtack.com',
  'houzz.com',
  'healthgrades.com',
  'zocdoc.com',
  'vitals.com',
  'ratemds.com',
  'findlaw.com',
  'avvo.com',
  'justia.com',
  
  // === DIRETÓRIOS BRASILEIROS ===
  'guiamais.com.br',
  'telelistas.net',
  'apontador.com.br',
  'hagah.com.br',
  'kekanto.com.br',
  'encontrasp.com.br',
  'encontrarj.com.br',
  'listaonline.com.br',
  'cylex.com.br',
  'hotfrog.com.br',
  'osreformistas.com.br',
  'sfrubrica.com.br',
  'portaldenegocios.com.br',
  'queroanunciar.com.br',
  'empresasaqui.com.br',
  'sfrubrica.net',
  '123achei.com.br',
  'catalogosenai.com.br',
  'agendor.com.br',
  'empresasdobrasil.com',
  'listamais.com.br',
  'encontraminas.com.br',
  'solvis.com.br',
  
  // === MARKETPLACES ===
  'mercadolivre.com.br',
  'amazon.com.br',
  'amazon.com',
  'americanas.com',
  'submarino.com',
  'magazineluiza.com.br',
  'shopee.com.br',
  'alibaba.com',
  'aliexpress.com',
  'ebay.com',
  'olx.com.br',
  'enjoei.com.br',
  'casasbahia.com.br',
  'extra.com.br',
  'pontofrio.com.br',
  
  // === REDES SOCIAIS ===
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'linkedin.com',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
  'tumblr.com',
  
  // === PLATAFORMAS DE CONTEÚDO ===
  'wikipedia.org',
  'youtube.com',
  'vimeo.com',
  'medium.com',
  'blogspot.com',
  'wordpress.com',
  'wix.com',
  'squarespace.com',
  
  // === SITES GOVERNAMENTAIS ===
  'gov.br',
  'governo.br',
  'camara.leg.br',
  'senado.leg.br',
  'stf.jus.br',
  'stj.jus.br',
  'tse.jus.br',
  'tst.jus.br',
  'cvm.gov.br',
  'anvisa.gov.br',
  'inmetro.gov.br',
  
  // === AGREGADORES DE SERVIÇOS ===
  'getninjas.com.br',
  'habitissimo.com.br',
  'triider.com.br',
  'serviconahora.com.br',
  'cronoshare.com.br',
  'reformafacil.com.br',
  '99freelas.com.br',
  'workana.com',
  'freelancer.com',
  'upwork.com',
  'fiverr.com',
  
  // === CLASSIFICADOS ===
  'classificados.com.br',
  'vivaanuncios.com.br',
  'vivareal.com.br',
  'zapimoveis.com.br',
  'imovelweb.com.br',
  'quintoandar.com.br',
  'webmotors.com.br',
  'kavak.com',
  'icarros.com.br',
  
  // === SITES DE AVALIAÇÃO ===
  'reclameaqui.com.br',
  'trustpilot.com',
  'glassdoor.com',
  'indeed.com',
  'love mondays',
  'consumidor.gov.br',
  
  // === AGREGADORES DE NOTÍCIAS ===
  'g1.globo.com',
  'uol.com.br',
  'terra.com.br',
  'r7.com',
  'ig.com.br',
  'msn.com',
  'bol.uol.com.br'
];

// Padrões de URL que indicam diretórios/listagens
export const BLOCKED_URL_PATTERNS: RegExp[] = [
  /\/biz\//i,                     // Yelp business pages
  /\/listing\//i,                 // Directory listings
  /\/directory\//i,               // Generic directories
  /\/places\//i,                  // Google Places etc
  /\/maps\//i,                    // Map pages
  /\/category\//i,                // Category pages
  /\/empresas\//i,                // Brazilian business directories
  /\/negocios\//i,                // Business listings
  /\/servicos\//i,                // Service listings
  /\/fornecedores\//i,            // Supplier directories
  /\/prestadores\//i,             // Service provider listings
  /\/profissionais\//i,           // Professional directories
  /\/guia-comercial\//i,          // Commercial guides
  /\/lista-de-/i,                 // Lists of...
  /\/encontre-/i,                 // Find...
  /\/busca\//i,                   // Search results
  /\/search\//i,                  // Search results
  /\/resultados\//i,              // Results pages
  /\?q=/i,                        // Search query strings
  /\?search=/i,                   // Search query strings
  /\/tag\//i,                     // Tag pages
  /\/arquivo\//i,                 // Archive pages
  /\/author\//i,                  // Author pages (blog aggregators)
  /\/page\/\d+/i,                 // Pagination pages
  /\/perfil\//i,                  // Profile pages on directories
  /\/profile\//i,                 // Profile pages
  /\/company\//i,                 // Company listings
  /\/empresa\//i,                 // Company listings PT
  /maps\.google/i,                // Google Maps
  /google\.com\/maps/i,           // Google Maps
  /google\.com\.br\/maps/i,       // Google Maps BR
  /\/review\//i,                  // Review pages
  /\/avaliacoes\//i,              // Review pages PT
];

/**
 * Verifica se uma URL pertence a um domínio ou padrão bloqueado
 */
export function isBlockedCompetitor(url: string): { blocked: boolean; reason?: string } {
  const urlLower = url.toLowerCase();
  
  // Check blocked domains
  for (const domain of BLOCKED_DOMAINS) {
    if (urlLower.includes(domain)) {
      return { 
        blocked: true, 
        reason: `Domínio bloqueado: ${domain}` 
      };
    }
  }
  
  // Check blocked patterns
  for (const pattern of BLOCKED_URL_PATTERNS) {
    if (pattern.test(url)) {
      return { 
        blocked: true, 
        reason: `Padrão de diretório/listagem: ${pattern.source}` 
      };
    }
  }
  
  return { blocked: false };
}

/**
 * Filtra lista de URLs mantendo apenas concorrentes reais
 */
export function filterRealCompetitors<T extends { url: string }>(
  competitors: T[]
): { filtered: T[]; blocked: { item: T; reason: string }[] } {
  const filtered: T[] = [];
  const blocked: { item: T; reason: string }[] = [];
  
  for (const competitor of competitors) {
    const check = isBlockedCompetitor(competitor.url);
    if (check.blocked) {
      blocked.push({ item: competitor, reason: check.reason || 'Bloqueado' });
    } else {
      filtered.push(competitor);
    }
  }
  
  return { filtered, blocked };
}

/**
 * Valida se uma URL é de um concorrente real (não diretório/agregador)
 */
export function isRealCompetitor(url: string): boolean {
  return !isBlockedCompetitor(url).blocked;
}

/**
 * Detecta se a maioria das URLs filtradas indica problema na busca
 * (ex: busca muito genérica retornando só diretórios)
 */
export function analyzeFilterResults(
  originalCount: number,
  filteredCount: number
): { quality: 'good' | 'warning' | 'poor'; message: string } {
  const ratio = filteredCount / originalCount;
  
  if (ratio >= 0.5) {
    return { 
      quality: 'good', 
      message: `${filteredCount}/${originalCount} concorrentes reais encontrados` 
    };
  } else if (ratio >= 0.3) {
    return { 
      quality: 'warning', 
      message: `Poucos concorrentes reais (${filteredCount}/${originalCount}). Considere refinar a busca.` 
    };
  } else {
    return { 
      quality: 'poor', 
      message: `Busca retornou majoritariamente diretórios (${filteredCount}/${originalCount}). Refine a keyword ou território.` 
    };
  }
}
