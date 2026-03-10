/**
 * localImageSearch.ts — OmniSeen (Global)
 *
 * Busca de imagens com toque editorial local.
 * Suporte completo a qualquer cidade/país/idioma do mundo.
 *
 * Estratégia de 3 camadas (como um editor local faria):
 *   1. Google Custom Search Image API — query editorial contextual na língua local
 *   2. Google Places Photos API — foto real de estabelecimento local
 *   3. Google Custom Search Image API — query ampliada sem restrição geográfica
 */

import { getGlobalKey } from "./getGlobalKey.ts";

export interface LocalImageResult {
  url: string;
  source: "custom_search" | "places_photo" | "custom_search_fallback" | "none";
  query_used?: string;
  title?: string;
  contextLink?: string;
}

// ============================================================================
// MAPEAMENTO DE NICHOS: palavras-chave por idioma
// Estrutura: niche → record<langCode, keywords[]>
// ============================================================================

const NICHE_KEYWORDS_BY_LANG: Record<string, Record<string, string>> = {
  pest_control: {
    'pt': 'controle de pragas dedetização',
    'en': 'pest control exterminator',
    'es': 'control de plagas fumigación',
    'fr': 'dératisation désinsectisation',
    'de': 'Schädlingsbekämpfung',
    'it': 'disinfestazione controllo parassiti',
    'ja': '害虫駆除',
    'zh': '害虫防治',
    'ar': 'مكافحة الآفات',
    'default': 'pest control exterminator',
  },
  plumbing: {
    'pt': 'encanador hidráulica encanamento',
    'en': 'plumber plumbing pipes',
    'es': 'fontanero plomería',
    'fr': 'plombier plomberie',
    'de': 'Klempner Installation',
    'it': 'idraulico impianti idraulici',
    'ja': '配管工事 水道工事',
    'zh': '管道工 水管',
    'ar': 'سباك سباكة',
    'default': 'plumber plumbing',
  },
  dental: {
    'pt': 'dentista clínica odontológica',
    'en': 'dentist dental clinic',
    'es': 'dentista clínica dental',
    'fr': 'dentiste clinique dentaire',
    'de': 'Zahnarzt Zahnklinik',
    'it': 'dentista studio dentistico',
    'ja': '歯医者 歯科クリニック',
    'zh': '牙医诊所',
    'ar': 'طبيب أسنان عيادة أسنان',
    'default': 'dentist dental clinic',
  },
  legal: {
    'pt': 'advogado escritório advocacia',
    'en': 'lawyer law firm attorney',
    'es': 'abogado bufete jurídico',
    'fr': 'avocat cabinet juridique',
    'de': 'Anwalt Kanzlei',
    'it': 'avvocato studio legale',
    'ja': '弁護士事務所',
    'zh': '律师事务所',
    'ar': 'محامي مكتب قانوني',
    'default': 'lawyer law firm',
  },
  accounting: {
    'pt': 'contador contabilidade',
    'en': 'accountant accounting firm',
    'es': 'contador contaduría',
    'fr': 'comptable cabinet comptable',
    'de': 'Buchhalter Steuerberater',
    'it': 'commercialista studio contabile',
    'ja': '会計士 税理士事務所',
    'zh': '会计师事务所',
    'ar': 'محاسب مكتب محاسبة',
    'default': 'accountant accounting',
  },
  real_estate: {
    'pt': 'imobiliária imóveis corretor',
    'en': 'real estate agent property',
    'es': 'inmobiliaria bienes raíces',
    'fr': 'immobilier agence immobilière',
    'de': 'Immobilien Makler',
    'it': 'agenzia immobiliare',
    'ja': '不動産 不動産会社',
    'zh': '房地产 中介',
    'ar': 'عقارات وكالة عقارية',
    'default': 'real estate agency',
  },
  technology: {
    'pt': 'empresa tecnologia TI',
    'en': 'technology company IT services',
    'es': 'empresa tecnología informática',
    'fr': 'entreprise technologie informatique',
    'de': 'Technologieunternehmen IT',
    'it': 'azienda tecnologia informatica',
    'ja': 'IT企業 テクノロジー',
    'zh': '科技公司 IT服务',
    'ar': 'شركة تكنولوجيا',
    'default': 'technology company IT',
  },
  cleaning: {
    'pt': 'empresa limpeza serviços limpeza',
    'en': 'cleaning company cleaning services',
    'es': 'empresa limpieza servicios',
    'fr': 'entreprise nettoyage',
    'de': 'Reinigungsunternehmen',
    'it': 'impresa pulizie',
    'ja': '清掃会社 クリーニング',
    'zh': '清洁公司 保洁服务',
    'ar': 'شركة تنظيف خدمات التنظيف',
    'default': 'cleaning company services',
  },
  electrician: {
    'pt': 'eletricista instalação elétrica',
    'en': 'electrician electrical services',
    'es': 'electricista instalación eléctrica',
    'fr': 'électricien installation électrique',
    'de': 'Elektriker Elektroinstallation',
    'it': 'elettricista impianti elettrici',
    'ja': '電気工事士',
    'zh': '电工电气服务',
    'ar': 'كهربائي خدمات كهربائية',
    'default': 'electrician electrical services',
  },
  painting: {
    'pt': 'pintor pintura predial',
    'en': 'painter painting services',
    'es': 'pintor empresa pintura',
    'fr': 'peintre entreprise peinture',
    'de': 'Maler Malerarbeiten',
    'it': 'imbianchino pittura',
    'ja': '塗装業者',
    'zh': '油漆工 涂装服务',
    'ar': 'رسام دهان خدمات طلاء',
    'default': 'painter painting services',
  },
  restaurant: {
    'pt': 'restaurante gastronomia',
    'en': 'restaurant food dining',
    'es': 'restaurante gastronomía',
    'fr': 'restaurant gastronomie',
    'de': 'Restaurant Gastronomie',
    'it': 'ristorante gastronomia',
    'ja': 'レストラン 飲食店',
    'zh': '餐厅 美食',
    'ar': 'مطعم طعام',
    'default': 'restaurant food',
  },
};

// ============================================================================
// MAPEAMENTO DE GL (country code) A PARTIR DO IDIOMA/CIDADE
// A Custom Search API usa ISO 3166-1 alpha-2 para gl
// ============================================================================

const LANG_TO_GL: Record<string, string> = {
  'pt': 'br',    // padrão BR, mas pode ser PT — ok como default
  'pt-BR': 'br',
  'pt-PT': 'pt',
  'en': 'us',
  'en-US': 'us',
  'en-GB': 'gb',
  'en-AU': 'au',
  'es': 'es',
  'es-MX': 'mx',
  'es-AR': 'ar',
  'fr': 'fr',
  'de': 'de',
  'it': 'it',
  'ja': 'jp',
  'zh': 'cn',
  'zh-TW': 'tw',
  'ar': 'sa',
  'ru': 'ru',
  'ko': 'kr',
  'nl': 'nl',
  'pl': 'pl',
  'tr': 'tr',
  'hi': 'in',
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Resolve as palavras-chave do nicho no idioma correto.
 * Usa fallback hierárquico: idioma completo → código 2 chars → 'default'.
 */
function resolveNicheKeywords(niche: string, language: string): string {
  const langMap = NICHE_KEYWORDS_BY_LANG[niche];
  if (!langMap) return `${niche} professional service`;

  // Tenta: 'pt-BR' → 'pt' → 'default'
  const lang2 = language.split('-')[0].toLowerCase();
  return langMap[language.toLowerCase()] || langMap[lang2] || langMap['default'] || niche;
}

/**
 * Resolve o código de país (gl) para a Custom Search API.
 */
function resolveCountryCode(language: string, country?: string): string {
  if (country && country.length === 2) return country.toLowerCase();
  return LANG_TO_GL[language] || LANG_TO_GL[language.split('-')[0]] || 'us';
}

/**
 * Monta a query editorial injetando cidade e contexto.
 * Varia com base no imageIndex para diversificar as queries do lote.
 */
function buildEditorialQuery(
  niche: string,
  city: string,
  articleContext: string,
  language: string,
  imageIndex: number
): string {
  const nicheKeywords = resolveNicheKeywords(niche, language);
  const context = articleContext?.trim() || '';

  // Alterna entre estratégias de query para obter diversidade no lote
  const strategies = [
    `${nicheKeywords} ${city}`,                                    // Nicho + cidade
    `${city} ${nicheKeywords}`,                                    // Cidade primeiro
    `${context ? context + ' ' : ''}${city}`,                    // Contexto + cidade
    `${nicheKeywords} ${city} professional`,                      // Com adjetivo
    `${context ? context + ' ' + city : nicheKeywords + ' ' + city}`, // Variação
  ];

  return strategies[imageIndex % strategies.length].trim();
}

// ============================================================================
// CAMADA 1: Google Custom Search Image API
// ============================================================================

async function searchImagesViaCustomSearch(
  query: string,
  apiKey: string,
  cx: string,
  language: string,
  country: string,
  imgSize: 'MEDIUM' | 'LARGE' | 'XLARGE' = 'LARGE'
): Promise<LocalImageResult | null> {
  try {
    const url = new URL('https://customsearch.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('imgSize', imgSize);
    url.searchParams.set('imgType', 'photo');
    url.searchParams.set('safe', 'active');
    url.searchParams.set('num', '10');
    url.searchParams.set('gl', country);
    url.searchParams.set('hl', language);
    // Filtra por imagens com licença aberta (opcional — aumenta relevância sem bloquear)
    // url.searchParams.set('rights', 'cc_publicdomain,cc_attribute,cc_sharealike');

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn(`[LocalImage] Custom Search HTTP ${res.status}: ${errBody.substring(0, 100)}`);
      return null;
    }

    const data = await res.json();
    const items = data.items as Array<{
      link?: string;
      title?: string;
      image?: { contextLink?: string };
    }> | undefined;

    if (!items?.length) {
      console.warn(`[LocalImage] Custom Search: sem resultados para "${query}"`);
      return null;
    }

    // Filtra itens com URL de imagem real (não SVG, ícone, logo)
    const validItem = items.find(item => {
      const link = (item.link || '').toLowerCase();
      return (
        link.startsWith('http') &&
        !link.includes('favicon') &&
        !link.endsWith('.svg') &&
        !link.endsWith('.ico') &&
        !link.includes('placeholder') &&
        !link.includes('/logo') &&
        !link.includes('icon')
      );
    });

    if (!validItem?.link) return null;

    console.log(`[LocalImage] ✅ Custom Search: imagem local encontrada para "${query}"`);
    return {
      url: validItem.link,
      source: 'custom_search',
      query_used: query,
      title: validItem.title,
      contextLink: validItem.image?.contextLink,
    };
  } catch (e) {
    console.warn('[LocalImage] Custom Search falhou:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ============================================================================
// CAMADA 2: Google Places Photos API
// ============================================================================

async function searchViaPlacesPhotos(
  niche: string,
  city: string,
  language: string,
  apiKey: string
): Promise<LocalImageResult | null> {
  const nicheKeywords = resolveNicheKeywords(niche, language);
  const searchQuery = `${nicheKeywords} ${city}`.trim();

  try {
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    searchUrl.searchParams.set('query', searchQuery);
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('language', language.split('-')[0]); // 'pt', 'en', etc.

    const searchRes = await fetch(searchUrl.toString(), { signal: AbortSignal.timeout(8000) });
    if (!searchRes.ok) throw new Error(`Places textSearch HTTP ${searchRes.status}`);

    const searchData = await searchRes.json();
    const results = (searchData.results || []) as Array<{
      photos?: Array<{ photo_reference: string }>;
      name?: string;
    }>;

    let photoRef: string | null = null;
    let placeName: string | undefined;

    for (const place of results.slice(0, 5)) {
      if (place.photos?.[0]?.photo_reference) {
        photoRef = place.photos[0].photo_reference;
        placeName = place.name;
        break;
      }
    }

    if (!photoRef) return null;

    // Segue redirect para obter a URL pública da foto
    const photoRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/photo?photoreference=${encodeURIComponent(photoRef)}&maxwidth=1200&key=${apiKey}`,
      { redirect: 'follow', signal: AbortSignal.timeout(8000) }
    );
    if (!photoRes.ok) throw new Error(`Places photo HTTP ${photoRes.status}`);

    console.log(`[LocalImage] ✅ Places Photo: "${placeName || searchQuery}"`);
    return {
      url: photoRes.url,
      source: 'places_photo',
      query_used: searchQuery,
      title: placeName,
    };
  } catch (e) {
    console.warn('[LocalImage] Places Photos falhou:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ============================================================================
// ORQUESTRADOR PRINCIPAL — busca em 3 camadas
// ============================================================================

export interface LocalImageSearchParams {
  niche: string;           // ex: 'pest_control', 'dental', 'plumbing'
  city: string;            // ex: 'São Paulo', 'New York', 'London', 'Tokyo'
  country?: string;        // ISO 3166-1 alpha-2 opcional (ex: 'br', 'us', 'jp')
  language?: string;       // ex: 'pt-BR', 'en', 'es', 'ja' (padrão: 'en')
  articleContext?: string; // tema/seção/problema do artigo
  imageIndex?: number;     // índice da imagem no lote (diversifica queries)
}

/**
 * Busca a imagem local mais relevante para o artigo.
 * Funciona como um editor local de qualquer cidade do mundo:
 * busca fotos reais da cidade/região relacionadas ao nicho e tema.
 */
export async function fetchLocalEditorialImage(
  params: LocalImageSearchParams
): Promise<LocalImageResult> {
  const {
    niche,
    city,
    country,
    language = 'en',
    articleContext = '',
    imageIndex = 0,
  } = params;

  let apiKey: string;
  let cx: string;

  try {
    const keys = getGlobalKey('search');
    apiKey = keys.apiKey;
    cx = keys.cx || '';
  } catch {
    console.warn('[LocalImage] getGlobalKey falhou — verificar GOOGLE_GLOBAL_API_KEY');
    return { url: '', source: 'none' };
  }

  const countryCode = resolveCountryCode(language, country);
  const langCode = language.toLowerCase();

  console.log(`[LocalImage] Editor local: niche="${niche}" city="${city}" lang="${langCode}" country="${countryCode}"`);

  // ── CAMADA 1: Custom Search Image — query editorial contextual ──
  if (cx) {
    const query1 = buildEditorialQuery(niche, city, articleContext, language, imageIndex);
    console.log(`[LocalImage] 🔍 Camada 1a — Custom Search: "${query1}"`);

    const result1 = await searchImagesViaCustomSearch(query1, apiKey, cx, langCode, countryCode, 'LARGE');
    if (result1?.url) return result1;

    // Tenta query alternativa (estratégia diferente)
    const query1b = buildEditorialQuery(niche, city, articleContext, language, imageIndex + 2);
    if (query1b !== query1) {
      console.log(`[LocalImage] 🔍 Camada 1b — Custom Search alt: "${query1b}"`);
      const result1b = await searchImagesViaCustomSearch(query1b, apiKey, cx, langCode, countryCode, 'MEDIUM');
      if (result1b?.url) return result1b;
    }
  }

  // ── CAMADA 2: Google Places Photos ──
  console.log(`[LocalImage] 🔍 Camada 2 — Places Photos: ${niche} em ${city}`);
  const result2 = await searchViaPlacesPhotos(niche, city, language, apiKey);
  if (result2?.url) return result2;

  // ── CAMADA 3: Custom Search — query ampliada sem restrição local ──
  if (cx) {
    const nicheKeywords = resolveNicheKeywords(niche, language);
    const broadQuery = `${nicheKeywords} professional service`;
    console.log(`[LocalImage] 🔍 Camada 3 — Custom Search broad: "${broadQuery}"`);

    const result3 = await searchImagesViaCustomSearch(broadQuery, apiKey, cx, langCode, countryCode, 'MEDIUM');
    if (result3?.url) return { ...result3, source: 'custom_search_fallback' };
  }

  console.warn(`[LocalImage] ⚠️ Todas as camadas falharam: ${niche} / ${city} (${langCode})`);
  return { url: '', source: 'none' };
}

/**
 * Adaptador: converte LocalImageResult para o formato do geminiImageGenerator.
 */
export function toImageGenerationResult(local: LocalImageResult): {
  url: string;
  generated_by: 'gemini_image' | 'places_photo' | 'none';
} {
  return {
    url: local.url,
    generated_by:
      local.source === 'none'
        ? 'none'
        : 'places_photo', // 'places_photo' = foto real encontrada (custom_search ou places)
  };
}
