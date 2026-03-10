/**
 * geminiImageGenerator.ts — OmniSeen (Global)
 *
 * Geração e busca de imagens para artigos.
 *
 * Prioridade:
 *   1. Google Imagen 3 (geração IA com prompt contextual)
 *   2. Busca editorial local (Google Custom Search Image + Places Photos)
 *      → funciona como um editor local de qualquer cidade do mundo
 *
 * REGRA DOS 40%: no máximo 40% das imagens de um lote podem conter pessoas.
 *
 * Docs Imagen: https://ai.google.dev/gemini-api/docs/imagen
 * Docs Custom Search: https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list
 * Docs Places: https://developers.google.com/maps/documentation/places/web-service/photos
 */

import { fetchLocalEditorialImage, toImageGenerationResult } from "./localImageSearch.ts";

export interface ImageGenerationResult {
  url: string;
  generated_by: 'gemini_image' | 'places_photo' | 'none';
}

// ============================================================================
// REGRA DOS 40% — CONTROLE DE PESSOAS NAS IMAGENS
// ============================================================================

/**
 * Determina deterministicamente se a imagem naquele índice pode conter pessoas.
 * Regra: no máximo 40% do total → arredondado para baixo.
 * Ex: 4 imagens → max 1 com pessoa (índice 1 do lote).
 */
export function shouldIncludePeople(imageIndex: number, totalImages: number): boolean {
  const maxWithPeople = Math.floor(totalImages * 0.4);
  if (maxWithPeople === 0) return false;
  const interval = Math.floor(totalImages / maxWithPeople);
  return (imageIndex % interval) === 0;
}

/** Palavras/frases que indicam presença de pessoas num prompt */
const PEOPLE_TERMS_REGEX =
  /\b(person|people|man|woman|men|women|team|professional|worker|employee|customer|client|doctor|nurse|specialist|technician|businessman|businesswoman|couple|family|group|staff|operator|plumber|electrician|painter|cleaner|expert|consultant|attorney|lawyer|dentist|patient|chef|waiter|waitress|receptionist|individual|human|face|portrait|pessoa|pessoas|homem|mulher|equipe|profissional|trabalhador|funcionário|cliente|médico|enfermeiro|especialista|técnico|empresário|família|grupo|atendente|operador|encanador|eletricista|pintor|limpador|consultor|advogado|dentista|paciente|cozinheiro|garçom|rosto|retrato)\b/gi;

/**
 * Sanitiza um prompt removendo menções a pessoas quando o slot não permite.
 * Substitui por elementos visuais alternativos relevantes ao contexto.
 */
export function sanitizePromptForPeopleRule(
  prompt: string,
  allowPeople: boolean,
  niche: string,
  context: string
): string {
  if (allowPeople) return prompt;

  const nicheAlternatives: Record<string, string[]> = {
    pest_control: ['pest control equipment', 'spray nozzle close-up', 'clean indoor environment after treatment', 'service van exterior'],
    plumbing: ['modern pipe fittings', 'clean plumbing installation', 'bathroom fixtures', 'toolbox with plumbing tools'],
    dental: ['dental clinic interior', 'modern dental equipment', 'clean orthodontic tools arrangement', 'bright dental office'],
    legal: ['law books on desk', 'justice scales', 'modern law office interior', 'legal documents'],
    accounting: ['financial charts on screen', 'calculator and spreadsheet', 'organized office desk', 'business graphs'],
    real_estate: ['modern house exterior', 'interior design living room', 'aerial view of neighborhood', 'real estate sign'],
    technology: ['modern server room', 'computer screens with code', 'tech equipment closeup', 'modern office setup'],
    cleaning: ['clean spotless surface', 'cleaning supplies arrangement', 'before and after cleaning', 'sparkling floor'],
    electrician: ['electrical panel closeup', 'wiring installation', 'modern electrical equipment', 'city lights circuit'],
    painting: ['fresh painted wall texture', 'paint brushes and rollers', 'color palette samples', 'renovated room'],
  };

  const alternatives = nicheAlternatives[niche] || [
    'professional service equipment', 'clean work environment', 'industry tools arranged neatly', 'modern workspace',
  ];

  const altIndex = Math.abs(prompt.length + context.length) % alternatives.length;
  const alternative = alternatives[altIndex];

  const sanitized = prompt.replace(PEOPLE_TERMS_REGEX, '').replace(/\s{2,}/g, ' ').trim();

  if (sanitized.length < 20) {
    return `Professional photography of ${alternative}. ${context} related. Clean, modern, high quality.`;
  }

  return `${sanitized}, featuring ${alternative}. No people, no faces.`;
}

// ============================================================================
// GOOGLE IMAGEN 3 — Geração primária de imagens com IA
// ============================================================================

/**
 * Gera uma imagem via Google Imagen 3.
 * Em caso de falha, usa fetchLocalEditorialImage como fallback.
 */
export async function generateImageWithGemini(
  prompt: string,
  context: string,
  niche: string,
  city: string,
  apiKey?: string,
  language = 'en',
  country?: string
): Promise<ImageGenerationResult> {
  console.log('[GeminiImage] Attempting Imagen 3...');
  console.log('[GeminiImage] Prompt:', prompt.substring(0, 100) + '...');

  const key = apiKey || Deno.env.get('GOOGLE_GLOBAL_API_KEY') || Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');

  if (!key) {
    console.warn('[GeminiImage] ⚠️ Nenhuma chave de API encontrada — usando busca editorial local');
    return fallbackToLocalSearch(niche, city, context, language, country, 0);
  }

  try {
    const enhancedPrompt = [
      `Professional business photography: ${prompt}.`,
      `Context: ${context} service in ${city}.`,
      `Industry: ${niche}.`,
      'Style: High-quality, photorealistic, modern, professional lighting.',
      '16:9 aspect ratio for web.',
      'No text, no watermarks, no logos.',
    ].join(' ');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: enhancedPrompt }],
        parameters: { sampleCount: 1, aspectRatio: '16:9' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GeminiImage] ❌ API Error:', response.status, errorText.substring(0, 200));

      // Rate limit ou indisponibilidade → busca editorial local
      if (response.status === 429 || response.status === 503) {
        console.warn('[GeminiImage] Rate limited → usando busca editorial local');
        return fallbackToLocalSearch(niche, city, context, language, country, 0);
      }

      throw new Error(`Imagen 3 returned ${response.status}`);
    }

    const data = await response.json();
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
    const mimeType = data.predictions?.[0]?.mimeType || 'image/png';

    if (base64Image) {
      console.log('[GeminiImage] ✅ Imagem gerada via Imagen 3');
      return { url: `data:${mimeType};base64,${base64Image}`, generated_by: 'gemini_image' };
    }

    console.warn('[GeminiImage] ⚠️ Sem dados de imagem — usando busca editorial local');
  } catch (error) {
    console.error('[GeminiImage] ❌ Erro:', error instanceof Error ? error.message : error);
  }

  // Fallback final: busca editorial local
  return fallbackToLocalSearch(niche, city, context, language, country, 0);
}

/**
 * Busca editorial local: substituindo o simples "fetchLocalPhoto" anterior.
 * Usa o módulo localImageSearch que opera globalmente em qualquer idioma/país.
 */
async function fallbackToLocalSearch(
  niche: string,
  city: string,
  context: string,
  language: string,
  country: string | undefined,
  imageIndex: number
): Promise<ImageGenerationResult> {
  console.log(`[GeminiImage] 📍 Busca editorial local: "${niche}" em "${city}" (${language})`);

  const localResult = await fetchLocalEditorialImage({
    niche,
    city,
    country,
    language,
    articleContext: context,
    imageIndex,
  });

  return toImageGenerationResult(localResult);
}

// ============================================================================
// BATCH GENERATION — Gera todas as imagens de um artigo
// ============================================================================

/**
 * Gera imagens para todos os prompts do artigo.
 * Aplica a regra dos 40% para controle de presença de pessoas.
 * Suporta qualquer idioma/país do mundo.
 */
export async function generateArticleImages(
  // deno-lint-ignore no-explicit-any
  article: any,
  niche: string,
  city: string,
  apiKey?: string,
  language = 'en',
  country?: string
): // deno-lint-ignore no-explicit-any
Promise<any> {
  if (!Array.isArray(article.image_prompts) || article.image_prompts.length === 0) {
    console.log('[Images] No image prompts to generate');
    return article;
  }

  const total = article.image_prompts.length;
  const maxWithPeople = Math.floor(total * 0.4);
  console.log(
    `[Images] Iniciando geração: ${total} imagens (máx ${maxWithPeople} com pessoas — regra 40%)`,
    `| city="${city}" lang="${language}"`
  );

  for (let i = 0; i < total; i++) {
    const imgPrompt = article.image_prompts[i];
    const context = imgPrompt.context || 'business';
    const rawPrompt = imgPrompt.prompt || `Professional ${context} image`;

    // Regra dos 40%: limita imagens com pessoas
    const allowPeople = shouldIncludePeople(i, total);
    const finalPrompt = sanitizePromptForPeopleRule(rawPrompt, allowPeople, niche, context);

    console.log(`[Images] ${i + 1}/${total} | pessoas: ${allowPeople ? '✅ ok' : '❌ removido'}`);

    let result: ImageGenerationResult;

    try {
      result = await generateImageWithGemini(
        finalPrompt,
        context,
        niche,
        city,
        apiKey,
        language,
        country
      );
    } catch {
      // Fallback direto para busca editorial local em caso de erro inesperado
      const localResult = await fetchLocalEditorialImage({
        niche,
        city,
        country,
        language,
        articleContext: context,
        imageIndex: i,
      });
      result = toImageGenerationResult(localResult);
    }

    imgPrompt.url = result.url || null;
    imgPrompt.generated_by = result.generated_by;

    const statusLabel: Record<string, string> = {
      gemini_image: '✅ Imagen 3',
      places_photo: '📍 Busca editorial local',
      none: '⚠️ Sem imagem',
    };
    console.log(`[Images] ${i + 1}: ${statusLabel[result.generated_by] ?? '⚠️'}`);

    // Pausa entre requisições para evitar rate limiting
    if (i < total - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Define featured image com a primeira imagem disponível
  if (!article.featured_image_url && article.image_prompts[0]?.url) {
    article.featured_image_url = article.image_prompts[0].url;
    console.log('[Images] Featured image definida a partir da primeira imagem');
  }

  console.log(`[Images] ✅ ${total} imagens processadas`);
  return article;
}
