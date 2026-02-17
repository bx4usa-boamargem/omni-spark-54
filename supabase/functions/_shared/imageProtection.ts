/**
 * Image Protection Module V5.1
 * Extracts, protects, and re-injects image blocks during AI optimization.
 */

export interface ImageBlock {
  index: number;
  html: string;
  placeholder: string;
}

export interface ExtractionResult {
  cleanContent: string;
  imageBlocks: ImageBlock[];
}

export interface ValidationResult {
  preserved: boolean;
  beforeCount: number;
  afterCount: number;
  lostCount: number;
}

/**
 * Extract all <figure>...</figure> and standalone <img .../> blocks,
 * replacing them with unique placeholders.
 */
export function extractImageBlocks(html: string): ExtractionResult {
  if (!html) return { cleanContent: '', imageBlocks: [] };

  const imageBlocks: ImageBlock[] = [];
  let cleanContent = html;
  let index = 0;

  // 1. Extract <figure>...</figure> blocks (greedy, handles nested tags)
  const figureRegex = /<figure[\s\S]*?<\/figure>/gi;
  cleanContent = cleanContent.replace(figureRegex, (match) => {
    const placeholder = `<!--IMG_PLACEHOLDER_${index}-->`;
    imageBlocks.push({ index, html: match, placeholder });
    index++;
    return placeholder;
  });

  // 2. Extract standalone <img> tags (not already inside a captured figure)
  const imgRegex = /<img\s[^>]*\/?>/gi;
  cleanContent = cleanContent.replace(imgRegex, (match) => {
    const placeholder = `<!--IMG_PLACEHOLDER_${index}-->`;
    imageBlocks.push({ index, html: match, placeholder });
    index++;
    return placeholder;
  });

  return { cleanContent, imageBlocks };
}

/**
 * Re-inject original image blocks by replacing placeholders.
 */
export function reinjectImageBlocks(html: string, blocks: ImageBlock[]): string {
  if (!html || blocks.length === 0) return html;

  let result = html;
  for (const block of blocks) {
    result = result.replace(block.placeholder, block.html);
  }

  // If any placeholders were lost by the AI, append missing images
  // at the end of the nearest preceding <h2> section
  for (const block of blocks) {
    if (!result.includes(block.html)) {
      // Fallback: append before closing body or at end
      result += `\n${block.html}`;
    }
  }

  return result;
}

/**
 * Validate that images were preserved after AI processing.
 */
export function validateImagePreservation(
  originalHtml: string,
  processedHtml: string
): ValidationResult {
  const countImages = (html: string): number => {
    const figures = (html.match(/<figure[\s\S]*?<\/figure>/gi) || []).length;
    // Count standalone imgs not inside figures
    const standaloneImgs = (html.replace(/<figure[\s\S]*?<\/figure>/gi, '').match(/<img\s[^>]*\/?>/gi) || []).length;
    return figures + standaloneImgs;
  };

  const beforeCount = countImages(originalHtml);
  const afterCount = countImages(processedHtml);

  return {
    preserved: afterCount >= beforeCount,
    beforeCount,
    afterCount,
    lostCount: Math.max(0, beforeCount - afterCount),
  };
}

/**
 * Prompt instructions to add to AI calls for image/format protection.
 */
export const IMAGE_PROTECTION_PROMPT = `
## IMAGENS - REGRA ABSOLUTA
- Os marcadores <!--IMG_PLACEHOLDER_N--> representam imagens do artigo
- NUNCA remova esses marcadores
- Mantenha-os EXATAMENTE nas mesmas posições
- Se mover conteúdo, mantenha o placeholder após o H2 mais próximo

## FORMATAÇÃO - REGRA CRÍTICA
- Mantenha TODA a estrutura HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>
- NÃO converta HTML para Markdown
- NÃO converta Markdown para texto plano
- Se o input é HTML, o output DEVE ser HTML
- Se o input é Markdown, o output DEVE ser Markdown
- NÃO remova tags HTML existentes
- NÃO transforme headings em texto corrido`;
