// E-book Validation Utilities

export interface EbookValidationIssue {
  type: 'critical' | 'warning' | 'suggestion';
  code: string;
  field: string;
  message: string;
  canAutoFix: boolean;
  currentValue?: string | number;
  expectedValue?: string | number;
  weight: number;
}

export interface EbookValidationResult {
  isValid: boolean;
  score: number;
  issues: EbookValidationIssue[];
  suggestions: string[];
}

// Validation criteria weights
const EBOOK_CRITERIA_WEIGHTS = {
  CHAPTER_COUNT_MIN: 15,
  CHAPTER_COUNT_MAX: 5,
  WORD_COUNT: 15,
  COVER_IMAGE: 10,
  TABLE_OF_CONTENTS: 10,
  INTERNAL_IMAGES: 10,
  TIPS_SECTION: 5,
  CTA_PAGE: 10,
  SHORT_PARAGRAPHS: 15,
  BULLET_LISTS: 5,
};

export function countChapters(content: string): number {
  const h2Matches = content.match(/^## /gm);
  return h2Matches?.length || 0;
}

export function countEbookWords(content: string): number {
  return content.split(/\s+/).filter(w => w.length > 0).length;
}

export function hasCoverImage(coverImageUrl: string | null): boolean {
  return !!coverImageUrl && coverImageUrl.length > 0;
}

export function hasTableOfContents(content: string): boolean {
  return /##\s*(Sumário|Índice|Conteúdo)/i.test(content) || 
         content.includes('](#') || // Links internos
         /\[.+\]\(#/i.test(content);
}

export function countInternalImages(contentImages: any[] | null): number {
  return contentImages?.length || 0;
}

export function hasTipsSection(content: string): boolean {
  return /##\s*(Dicas|Bônus|Extra|Recomendações)/i.test(content);
}

export function hasCtaPage(cta: { title?: string; body?: string; buttonText?: string } | null): boolean {
  return !!(cta?.title || cta?.buttonText);
}

export function findEbookLongParagraphs(content: string): number {
  const paragraphs = content.split('\n\n');
  let longCount = 0;
  
  paragraphs.forEach(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed.startsWith('*') || 
        trimmed.startsWith('>') || !trimmed) {
      return;
    }
    
    // Count lines (4 lines max for ebook)
    const lines = trimmed.split('\n').length;
    if (lines > 4) {
      longCount++;
    }
  });
  
  return longCount;
}

export function countEbookBulletLists(content: string): number {
  const matches = content.match(/^[-*] /gm);
  return matches?.length || 0;
}

// Main e-book validation function
export function validateEbook(
  content: string,
  coverImageUrl: string | null,
  contentImages: any[] | null,
  cta: { title?: string; body?: string; buttonText?: string } | null
): EbookValidationResult {
  const issues: EbookValidationIssue[] = [];
  const suggestions: string[] = [];
  let score = 100;
  
  // 1. Chapter count validation
  const chapterCount = countChapters(content);
  if (chapterCount < 5) {
    issues.push({
      type: 'critical',
      code: 'CHAPTER_COUNT_LOW',
      field: 'content',
      message: `E-book tem apenas ${chapterCount} capítulos. Mínimo: 5`,
      canAutoFix: false,
      currentValue: chapterCount,
      expectedValue: 5,
      weight: EBOOK_CRITERIA_WEIGHTS.CHAPTER_COUNT_MIN,
    });
    score -= EBOOK_CRITERIA_WEIGHTS.CHAPTER_COUNT_MIN;
  }
  
  if (chapterCount > 10) {
    issues.push({
      type: 'warning',
      code: 'CHAPTER_COUNT_HIGH',
      field: 'content',
      message: `E-book tem ${chapterCount} capítulos. Máximo recomendado: 10`,
      canAutoFix: false,
      currentValue: chapterCount,
      expectedValue: 10,
      weight: EBOOK_CRITERIA_WEIGHTS.CHAPTER_COUNT_MAX,
    });
    score -= EBOOK_CRITERIA_WEIGHTS.CHAPTER_COUNT_MAX;
  }
  
  // 2. Word count
  const wordCount = countEbookWords(content);
  if (wordCount < 3500) {
    issues.push({
      type: 'critical',
      code: 'LOW_WORD_COUNT',
      field: 'content',
      message: `E-book tem ${wordCount} palavras. Mínimo: 3500`,
      canAutoFix: false,
      currentValue: wordCount,
      expectedValue: 3500,
      weight: EBOOK_CRITERIA_WEIGHTS.WORD_COUNT,
    });
    score -= EBOOK_CRITERIA_WEIGHTS.WORD_COUNT;
  }
  
  // 3. Cover image
  if (!hasCoverImage(coverImageUrl)) {
    issues.push({
      type: 'critical',
      code: 'NO_COVER_IMAGE',
      field: 'cover_image',
      message: 'E-book não tem imagem de capa',
      canAutoFix: false,
      weight: EBOOK_CRITERIA_WEIGHTS.COVER_IMAGE,
    });
    score -= EBOOK_CRITERIA_WEIGHTS.COVER_IMAGE;
  }
  
  // 4. Table of contents
  if (!hasTableOfContents(content)) {
    issues.push({
      type: 'warning',
      code: 'NO_TABLE_OF_CONTENTS',
      field: 'content',
      message: 'E-book não tem sumário com links de navegação',
      canAutoFix: false,
      weight: EBOOK_CRITERIA_WEIGHTS.TABLE_OF_CONTENTS,
    });
    score -= EBOOK_CRITERIA_WEIGHTS.TABLE_OF_CONTENTS;
  }
  
  // 5. Internal images
  const imageCount = countInternalImages(contentImages);
  if (imageCount < 3) {
    issues.push({
      type: 'warning',
      code: 'LOW_INTERNAL_IMAGES',
      field: 'content_images',
      message: `E-book tem apenas ${imageCount} imagem(ns) interna(s). Mínimo: 3`,
      canAutoFix: false,
      currentValue: imageCount,
      expectedValue: 3,
      weight: EBOOK_CRITERIA_WEIGHTS.INTERNAL_IMAGES,
    });
    score -= Math.max(0, EBOOK_CRITERIA_WEIGHTS.INTERNAL_IMAGES - imageCount * 3);
  }
  
  if (imageCount > 6) {
    issues.push({
      type: 'suggestion',
      code: 'HIGH_INTERNAL_IMAGES',
      field: 'content_images',
      message: `E-book tem ${imageCount} imagens internas. Máximo recomendado: 6`,
      canAutoFix: false,
      currentValue: imageCount,
      expectedValue: 6,
      weight: 0,
    });
    suggestions.push('Considere reduzir o número de imagens para melhor performance');
  }
  
  // 6. Tips section
  if (!hasTipsSection(content)) {
    issues.push({
      type: 'suggestion',
      code: 'NO_TIPS_SECTION',
      field: 'content',
      message: 'E-book não tem seção de "Dicas" ou "Bônus"',
      canAutoFix: false,
      weight: EBOOK_CRITERIA_WEIGHTS.TIPS_SECTION,
    });
    suggestions.push('Adicione uma seção de dicas ou bônus para agregar valor');
    score -= EBOOK_CRITERIA_WEIGHTS.TIPS_SECTION;
  }
  
  // 7. CTA page
  if (!hasCtaPage(cta)) {
    issues.push({
      type: 'critical',
      code: 'NO_CTA_PAGE',
      field: 'cta',
      message: 'E-book não tem página de CTA configurada',
      canAutoFix: false,
      weight: EBOOK_CRITERIA_WEIGHTS.CTA_PAGE,
    });
    score -= EBOOK_CRITERIA_WEIGHTS.CTA_PAGE;
  }
  
  // 8. Short paragraphs
  const longParagraphCount = findEbookLongParagraphs(content);
  if (longParagraphCount > 0) {
    issues.push({
      type: 'warning',
      code: 'LONG_PARAGRAPHS',
      field: 'content',
      message: `${longParagraphCount} parágrafo(s) com mais de 4 linhas`,
      canAutoFix: false,
      currentValue: longParagraphCount,
      expectedValue: 0,
      weight: EBOOK_CRITERIA_WEIGHTS.SHORT_PARAGRAPHS,
    });
    score -= Math.min(EBOOK_CRITERIA_WEIGHTS.SHORT_PARAGRAPHS, longParagraphCount * 3);
  }
  
  // 9. Bullet lists
  const bulletCount = countEbookBulletLists(content);
  if (bulletCount < 3) {
    issues.push({
      type: 'warning',
      code: 'LOW_BULLET_LISTS',
      field: 'content',
      message: `E-book tem apenas ${bulletCount} item(ns) de lista. Mínimo: 3`,
      canAutoFix: false,
      currentValue: bulletCount,
      expectedValue: 3,
      weight: EBOOK_CRITERIA_WEIGHTS.BULLET_LISTS,
    });
    score -= Math.max(0, EBOOK_CRITERIA_WEIGHTS.BULLET_LISTS - bulletCount);
  }
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));
  
  return {
    isValid: score >= 70,
    score,
    issues,
    suggestions,
  };
}

// Generate table of contents with links
export function generateTableOfContents(content: string): { toc: string; contentWithAnchors: string } {
  const lines = content.split('\n');
  const tocItems: { level: number; title: string; slug: string }[] = [];
  const newLines: string[] = [];
  
  lines.forEach(line => {
    if (line.startsWith('## ')) {
      const title = line.slice(3).trim();
      const slug = title.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .substring(0, 50);
      
      tocItems.push({ level: 2, title, slug });
      newLines.push(`<a name="${slug}"></a>`);
      newLines.push(line);
    } else if (line.startsWith('### ')) {
      const title = line.slice(4).trim();
      const slug = title.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .substring(0, 50);
      
      tocItems.push({ level: 3, title, slug });
      newLines.push(`<a name="${slug}"></a>`);
      newLines.push(line);
    } else {
      newLines.push(line);
    }
  });
  
  const toc = tocItems.map(item => {
    const indent = item.level === 3 ? '  ' : '';
    return `${indent}- [${item.title}](#${item.slug})`;
  }).join('\n');
  
  return {
    toc: `## Sumário\n\n${toc}`,
    contentWithAnchors: newLines.join('\n'),
  };
}
