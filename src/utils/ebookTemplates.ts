// E-book Template System

export interface EbookTemplate {
  id: string;
  name: string;
  description: string;
  baseStyle: 'endeavor' | 'dna_vendas' | 'automarticles';
  coverStyle: 'gradient' | 'solid' | 'image-bg';
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  typography: {
    headingFont: 'helvetica' | 'times' | 'courier';
    bodyFont: 'helvetica' | 'times' | 'courier';
    headingSize: number;
    bodySize: number;
    lineHeight: number;
  };
  layout: {
    marginSize: 'compact' | 'normal' | 'generous';
    chapterStyle: 'numbered' | 'named' | 'minimal';
    summaryStyle: 'linked' | 'simple' | 'visual';
    paragraphSpacing: number;
    showPageNumbers: boolean;
    showFooterLogo: boolean;
  };
  features: {
    hasTableOfContents: boolean;
    hasChapterDividers: boolean;
    hasHighlightBoxes: boolean;
    hasQuoteBlocks: boolean;
    hasTipsSection: boolean;
  };
}

export const EBOOK_TEMPLATES: EbookTemplate[] = [
  {
    id: 'corporativo',
    name: 'Corporativo',
    description: 'Layout profissional inspirado em materiais corporativos',
    baseStyle: 'endeavor',
    coverStyle: 'gradient',
    colorScheme: {
      primary: '#006633', // Verde corporativo
      secondary: '#004d26',
      accent: '#00994d',
      text: '#333333',
      background: '#f8fafc',
    },
    typography: {
      headingFont: 'helvetica',
      bodyFont: 'helvetica',
      headingSize: 24,
      bodySize: 11,
      lineHeight: 1.6,
    },
    layout: {
      marginSize: 'normal',
      chapterStyle: 'numbered',
      summaryStyle: 'linked',
      paragraphSpacing: 8,
      showPageNumbers: true,
      showFooterLogo: true,
    },
    features: {
      hasTableOfContents: true,
      hasChapterDividers: true,
      hasHighlightBoxes: true,
      hasQuoteBlocks: true,
      hasTipsSection: false,
    },
  },
  {
    id: 'compacto',
    name: 'Compacto',
    description: 'Layout denso e focado para leitura rápida',
    baseStyle: 'dna_vendas',
    coverStyle: 'solid',
    colorScheme: {
      primary: '#6b21a8', // Roxo
      secondary: '#7e22ce',
      accent: '#a855f7',
      text: '#1f2937',
      background: '#ffffff',
    },
    typography: {
      headingFont: 'helvetica',
      bodyFont: 'helvetica',
      headingSize: 20,
      bodySize: 10,
      lineHeight: 1.4,
    },
    layout: {
      marginSize: 'compact',
      chapterStyle: 'named',
      summaryStyle: 'simple',
      paragraphSpacing: 5,
      showPageNumbers: true,
      showFooterLogo: false,
    },
    features: {
      hasTableOfContents: true,
      hasChapterDividers: false,
      hasHighlightBoxes: true,
      hasQuoteBlocks: false,
      hasTipsSection: true,
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Layout editorial premium com tipografia elegante',
    baseStyle: 'automarticles',
    coverStyle: 'gradient',
    colorScheme: {
      primary: '#1e40af', // Azul
      secondary: '#1d4ed8',
      accent: '#3b82f6',
      text: '#111827',
      background: '#f9fafb',
    },
    typography: {
      headingFont: 'times',
      bodyFont: 'helvetica',
      headingSize: 28,
      bodySize: 12,
      lineHeight: 1.8,
    },
    layout: {
      marginSize: 'generous',
      chapterStyle: 'minimal',
      summaryStyle: 'visual',
      paragraphSpacing: 10,
      showPageNumbers: true,
      showFooterLogo: true,
    },
    features: {
      hasTableOfContents: true,
      hasChapterDividers: true,
      hasHighlightBoxes: true,
      hasQuoteBlocks: true,
      hasTipsSection: true,
    },
  },
  {
    id: 'minimalista',
    name: 'Minimalista',
    description: 'Layout limpo e focado no conteúdo',
    baseStyle: 'automarticles',
    coverStyle: 'solid',
    colorScheme: {
      primary: '#0f172a',
      secondary: '#1e293b',
      accent: '#475569',
      text: '#334155',
      background: '#ffffff',
    },
    typography: {
      headingFont: 'helvetica',
      bodyFont: 'helvetica',
      headingSize: 22,
      bodySize: 11,
      lineHeight: 1.7,
    },
    layout: {
      marginSize: 'generous',
      chapterStyle: 'minimal',
      summaryStyle: 'simple',
      paragraphSpacing: 8,
      showPageNumbers: false,
      showFooterLogo: false,
    },
    features: {
      hasTableOfContents: true,
      hasChapterDividers: false,
      hasHighlightBoxes: false,
      hasQuoteBlocks: true,
      hasTipsSection: false,
    },
  },
  {
    id: 'vibrante',
    name: 'Vibrante',
    description: 'Layout colorido e moderno com visual impactante',
    baseStyle: 'dna_vendas',
    coverStyle: 'gradient',
    colorScheme: {
      primary: '#ea580c', // Laranja
      secondary: '#f97316',
      accent: '#fb923c',
      text: '#1c1917',
      background: '#fffbeb',
    },
    typography: {
      headingFont: 'helvetica',
      bodyFont: 'helvetica',
      headingSize: 24,
      bodySize: 11,
      lineHeight: 1.5,
    },
    layout: {
      marginSize: 'normal',
      chapterStyle: 'numbered',
      summaryStyle: 'visual',
      paragraphSpacing: 7,
      showPageNumbers: true,
      showFooterLogo: true,
    },
    features: {
      hasTableOfContents: true,
      hasChapterDividers: true,
      hasHighlightBoxes: true,
      hasQuoteBlocks: true,
      hasTipsSection: true,
    },
  },
];

export function getEbookTemplateById(id: string): EbookTemplate | undefined {
  return EBOOK_TEMPLATES.find(t => t.id === id);
}

export function getEbookTemplatesByStyle(style: 'endeavor' | 'dna_vendas' | 'automarticles'): EbookTemplate[] {
  return EBOOK_TEMPLATES.filter(t => t.baseStyle === style);
}

export function getDefaultEbookTemplate(): EbookTemplate {
  return EBOOK_TEMPLATES[0]; // Corporativo
}

// Calculate margin size in mm
export function getMarginSize(marginSize: 'compact' | 'normal' | 'generous'): number {
  switch (marginSize) {
    case 'compact': return 15;
    case 'normal': return 20;
    case 'generous': return 25;
    default: return 20;
  }
}

// Get chapter number prefix
export function getChapterPrefix(chapterStyle: 'numbered' | 'named' | 'minimal', index: number): string {
  switch (chapterStyle) {
    case 'numbered': return `Capítulo ${index + 1}: `;
    case 'named': return '';
    case 'minimal': return '';
    default: return '';
  }
}

// Hex to RGB conversion
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 99, g: 102, b: 241 };
}
