/**
 * V4.7: Image Injection Engine
 * 
 * Responsável por injetar imagens no content HTML
 * SEM reescrever texto ou alterar estrutura H2/H3
 * 
 * Regras:
 * - Nunca alterar texto existente
 * - Nunca remover H2/H3
 * - Nunca duplicar imagens
 * - Bloquear se menos de 5 H2
 * - Suportar HTML (<h2>) e Markdown (##)
 */

export interface ContentImage {
  context: string;
  url: string;
  alt?: string;
  after_section: number;
}

export interface InjectionResult {
  content: string;
  injected: number;
  skipped: number;
  structureValid: boolean;
}

/**
 * Valida estrutura do content antes de modificar
 * Requer mínimo de 5 H2s para permitir injeção
 */
export function validateContentStructure(content: string): boolean {
  if (!content || content.length < 100) {
    console.warn('[IMAGES][STRUCTURE_GUARD] Content too short or empty');
    return false;
  }

  // Contar H2 em HTML e Markdown
  const h2Html = (content.match(/<h2[^>]*>/gi) || []).length;
  const h2Md = (content.match(/^## /gm) || []).length;
  const totalH2 = h2Html + h2Md;
  
  console.log(`[IMAGES][STRUCTURE] H2 count: ${totalH2} (html: ${h2Html}, md: ${h2Md})`);
  
  if (totalH2 < 1) {
    console.warn(`[IMAGES][STRUCTURE_GUARD] Content has no H2s - cannot inject section images`);
    return false;
  }
  
  return true;
}

/**
 * Injeta imagens após cada H2 correspondente
 * - NÃO altera texto
 * - NÃO remove headings
 * - NÃO duplica se já existir img
 */
export function injectImagesIntoContent(
  content: string,
  contentImages: ContentImage[]
): InjectionResult {
  console.log(`[IMAGES][INJECT] Starting injection of ${contentImages.length} images`);
  
  // Validar estrutura primeiro
  if (!validateContentStructure(content)) {
    console.warn('[IMAGES][STRUCTURE_GUARD_BLOCKED] content not overwritten');
    return { 
      content, 
      injected: 0, 
      skipped: contentImages.length,
      structureValid: false 
    };
  }
  
  // Filtrar apenas imagens com URL válida
  const validImages = contentImages
    .filter(img => img.url && img.url.startsWith('http'))
    .sort((a, b) => a.after_section - b.after_section);
  
  if (validImages.length === 0) {
    console.log('[IMAGES][INJECT] No valid images to inject');
    return { content, injected: 0, skipped: 0, structureValid: true };
  }
  
  let modifiedContent = content;
  let injected = 0;
  let skipped = 0;
  
  // Encontrar todas as posições de </h2> (fim do H2)
  const h2EndRegex = /<\/h2>/gi;
  const h2Positions: number[] = [];
  let match;
  
  while ((match = h2EndRegex.exec(content)) !== null) {
    // Posição após o </h2>
    h2Positions.push(match.index + match[0].length);
  }
  
  console.log(`[IMAGES][INJECT] Found ${h2Positions.length} H2 positions`);
  
  // Injetar imagens em ordem reversa (para não quebrar índices)
  for (let i = validImages.length - 1; i >= 0; i--) {
    const image = validImages[i];
    const targetSection = Math.min(image.after_section, h2Positions.length) - 1;
    
    if (targetSection < 0 || targetSection >= h2Positions.length) {
      console.warn(`[IMAGES][INJECT] Section ${image.after_section} out of bounds (max: ${h2Positions.length}), skipping`);
      skipped++;
      continue;
    }
    
    const insertPosition = h2Positions[targetSection];
    
    // Verificar se já existe <figure> ou <img> próximo (próximos 300 chars)
    const nearbyContent = modifiedContent.substring(insertPosition, insertPosition + 300);
    if (nearbyContent.includes('<figure') || nearbyContent.match(/<img[^>]*src=/i)) {
      console.log(`[IMAGES][INJECT] Image already exists after section ${image.after_section}, skipping`);
      skipped++;
      continue;
    }
    
    // Criar bloco figure com classes para styling
    const alt = escapeHtml(image.alt || image.context || 'Imagem ilustrativa');
    const caption = escapeHtml(image.context || '');
    
    const figureBlock = `

<figure class="article-image my-8">
  <img 
    src="${image.url}" 
    alt="${alt}" 
    loading="lazy"
    class="w-full rounded-lg"
  />
  <figcaption class="text-sm text-center text-muted-foreground mt-2">
    ${caption}
  </figcaption>
</figure>
`;
    
    // Inserir no content
    modifiedContent = 
      modifiedContent.slice(0, insertPosition) + 
      figureBlock + 
      modifiedContent.slice(insertPosition);
    
    injected++;
    console.log(`[IMAGES][INJECT] Injected image after section ${image.after_section}`);
  }
  
  console.log(`[IMAGES][INJECT] injected=${injected} skipped=${skipped}`);
  return { 
    content: modifiedContent, 
    injected, 
    skipped,
    structureValid: true 
  };
}

/**
 * Escape HTML special characters para prevenir XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
