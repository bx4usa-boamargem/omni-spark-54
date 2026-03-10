/**
 * seoValidator.ts
 * Validações SEO avançadas: Schema.org, E-E-A-T, headings, links internos,
 * reading time e compatibilidade com busca por IA (GPT, Gemini, Perplexity).
 */

export interface SEOValidationResult {
  passed: boolean;
  score: number; // 0–100
  checks: SEOValidationCheck[];
}

export interface SEOValidationCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  suggestion?: string;
  points: number;
  maxPoints: number;
}

/**
 * Valida o artigo para busca por IA (GPT, Gemini, Perplexity).
 * Critérios: respostas diretas, formato de lista, definições claras, Q&A detectado, fontes.
 */
export function validateForAISearch(article: {
  title: string;
  content: string | null;
  metaDescription?: string;
  keywords?: string[];
  publishedAt?: string | null;
  authorName?: string | null;
  featuredImage?: string | null;
}): SEOValidationResult {
  const checks: SEOValidationCheck[] = [];
  const { title, content, metaDescription = '', keywords = [], publishedAt, authorName, featuredImage } = article;
  const text = content || '';
  const html = text; // Assume content is HTML or markdown

  // ── 1. Schema.org / Structured Data (JSON-LD) ──────────────────────────
  const hasSchemaLD = html.includes('"@type"') || html.includes('application/ld+json');
  checks.push({
    id: 'schema',
    label: 'Schema.org (JSON-LD)',
    status: hasSchemaLD ? 'pass' : 'fail',
    message: hasSchemaLD
      ? 'Structured data detectado no conteúdo'
      : 'Nenhum JSON-LD de Schema.org encontrado',
    suggestion: !hasSchemaLD
      ? 'Adicione markup Article, FAQPage ou BreadcrumbList para aparecer em rich results e IA'
      : undefined,
    points: hasSchemaLD ? 15 : 0,
    maxPoints: 15,
  });

  // ── 2. E-E-A-T Signals ───────────────────────────────────────────────────
  const hasAuthor = !!authorName && authorName.trim().length > 2;
  const hasDate = !!publishedAt;
  const hasSources = /https?:\/\//.test(html) || /fonte:|source:|according to|segundo|de acordo com/i.test(html);
  const eeaScore = (hasAuthor ? 1 : 0) + (hasDate ? 1 : 0) + (hasSources ? 1 : 0);
  const eeaStatus = eeaScore === 3 ? 'pass' : eeaScore >= 2 ? 'warn' : 'fail';
  checks.push({
    id: 'eeat',
    label: 'E-E-A-T (Autor, Data, Fontes)',
    status: eeaStatus,
    message: eeaStatus === 'pass'
      ? 'Autor, data e fontes presentes — bom sinal de confiabilidade'
      : `Faltam: ${[!hasAuthor && 'autor', !hasDate && 'data de publicação', !hasSources && 'fontes/referências'].filter(Boolean).join(', ')}`,
    suggestion: eeaStatus !== 'pass'
      ? 'Adicione o nome do autor, data de publicação e links para fontes confiáveis'
      : undefined,
    points: eeaScore === 3 ? 15 : eeaScore * 4,
    maxPoints: 15,
  });

  // ── 3. Heading Hierarchy (H1/H2/H3) ────────────────────────────────────
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const h3Count = (html.match(/<h3[\s>]/gi) || []).length;
  // Also count markdown headings
  const mdH1Count = (html.match(/^# /gm) || []).length;
  const mdH2Count = (html.match(/^## /gm) || []).length;
  const totalH1 = h1Count + mdH1Count;
  const totalH2 = h2Count + mdH2Count;
  const headingStatus = totalH1 === 1 && totalH2 >= 2 ? 'pass' : totalH1 <= 1 && totalH2 >= 1 ? 'warn' : 'fail';
  checks.push({
    id: 'headings',
    label: 'Hierarquia de Títulos (H1/H2/H3)',
    status: headingStatus,
    message: `H1: ${totalH1} | H2: ${totalH2} | H3: ${h3Count}`,
    suggestion: headingStatus !== 'pass'
      ? 'Use exatamente 1 H1, pelo menos 2 H2 para estruturar seções, e H3 para subtópicos'
      : undefined,
    points: headingStatus === 'pass' ? 10 : headingStatus === 'warn' ? 5 : 0,
    maxPoints: 10,
  });

  // ── 4. Internal Links ───────────────────────────────────────────────────
  const internalLinkPattern = /href=["'][/][^"']+["']/gi;
  const mdInternalLinkPattern = /\[.+?\]\(\/[^)]+\)/g;
  const internalLinks = (html.match(internalLinkPattern) || []).length
    + (html.match(mdInternalLinkPattern) || []).length;
  const internalLinkStatus = internalLinks >= 2 ? 'pass' : internalLinks === 1 ? 'warn' : 'fail';
  checks.push({
    id: 'internal_links',
    label: 'Links Internos',
    status: internalLinkStatus,
    message: `${internalLinks} link(s) interno(s) encontrado(s)`,
    suggestion: internalLinkStatus !== 'pass'
      ? 'Adicione pelo menos 2 links internos para outros artigos ou páginas do site'
      : undefined,
    points: internalLinks >= 2 ? 10 : internalLinks * 3,
    maxPoints: 10,
  });

  // ── 5. Reading Time ─────────────────────────────────────────────────────
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const readingMinutes = Math.round(wordCount / 200); // 200 wpm average
  const readingStatus = readingMinutes >= 5 && readingMinutes <= 15 ? 'pass' : readingMinutes >= 3 ? 'warn' : 'fail';
  checks.push({
    id: 'reading_time',
    label: 'Tempo de Leitura',
    status: readingStatus,
    message: `~${readingMinutes} min de leitura (${wordCount} palavras)`,
    suggestion: readingStatus !== 'pass'
      ? readingMinutes < 5
        ? 'Artigos de 5-15 min têm melhor engajamento — expanda o conteúdo'
        : 'Artigo muito longo — considere dividir em partes'
      : undefined,
    points: readingStatus === 'pass' ? 10 : readingStatus === 'warn' ? 5 : 0,
    maxPoints: 10,
  });

  // ── 6. AI-Friendly Format ───────────────────────────────────────────────
  // Detecta: Q&A direto, listas de tópicos, parágrafos curtos, definições
  const hasQA = /\?([\r\n]|\s*<br)/i.test(html) || /\?[\s\n]/i.test(html);
  const hasBullets = /<ul>|<li>/.test(html) || /^\s*[-*•]/m.test(html);
  const hasDirectAnswer = /^(é |são |o (que|como)|como |quando |por que |qual )/im.test(html.substring(0, 500));
  const aiScore = (hasQA ? 1 : 0) + (hasBullets ? 1 : 0) + (hasDirectAnswer ? 1 : 0);
  const aiStatus = aiScore >= 2 ? 'pass' : aiScore === 1 ? 'warn' : 'fail';
  checks.push({
    id: 'ai_friendly',
    label: 'Formato AI-Friendly (GPT, Gemini, Perplexity)',
    status: aiStatus,
    message: aiStatus === 'pass'
      ? 'Conteúdo estruturado para extrações por IA'
      : 'Formato pouco amigável para buscas por IA',
    suggestion: aiStatus !== 'pass'
      ? 'Inclua: resposta direta no 1º parágrafo, listas com tópicos, seção FAQ com perguntas e respostas'
      : undefined,
    points: aiScore >= 2 ? 15 : aiScore * 5,
    maxPoints: 15,
  });

  const earned = checks.reduce((a, c) => a + c.points, 0);
  const max    = checks.reduce((a, c) => a + c.maxPoints, 0);
  const score  = max > 0 ? Math.round((earned / max) * 100) : 0;

  return {
    passed: score >= 70,
    score,
    checks,
  };
}

/**
 * Gera um slug único de smart link a partir do título do artigo
 */
export function generateSmartLinkSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 40);

  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`;
}
