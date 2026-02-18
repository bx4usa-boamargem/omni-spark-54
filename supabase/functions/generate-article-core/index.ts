/**
 * CORE_ARTICLE_ENGINE V1 — Clean-Room Pipeline
 * 
 * Pipeline linear e determinístico para geração de artigos de autoridade local.
 * ZERO dependência de: editorialOrchestrator, footprintChecks, localIntelligence,
 * pipelineStages, qualityGate, strategyResolver, promptTypeCore.
 * 
 * Etapas: ResolveCity → BusinessProfile → SERP-Lite → Outline → Writer →
 *         PostFormat → CityEnforcement → CTA → Images → Score → Persist
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callWriter, callImageGeneration, generateUnsplashFallback } from '../_shared/aiProviders.ts';
import { ensureCompanyCTA, hasValidCTA, type CompanyInfo } from '../_shared/editorialContract.ts';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const HARD_DEADLINE_MS = 55000;
const IMAGE_TIMEOUT_MS = 15000;
const ENGINE_VERSION = 'CORE_V1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CoreRequest {
  blog_id: string;
  keyword: string;
  city?: string;
  niche?: string;
  language?: 'pt-BR' | 'en-US';
  targetImages?: number;
  incomingArticleId?: string;
  // Fields from ArticleGenerator payload
  article_id?: string;
  theme?: string;
  keywords?: string[];
  state?: string;
  mode?: string;
}

interface BusinessProfile {
  company_name: string;
  whatsapp: string | null;
  city: string | null;
  niche: string | null;
  services: string | null;
  project_name: string | null;
}

interface ResearchPackage {
  headings: string[];
  questions: string[];
  entities: string[];
  cautions: string[];
}

interface OutlineSection {
  heading: string;
  notes: string;
}

interface ValidationResult {
  city_in_h1: boolean;
  h2s_with_city: number;
  has_cta: boolean;
  max_paragraph_chars: number;
  score_status: 'ok' | 'failed' | 'skipped';
  images_total: number;
  images_completed: number;
  images_pending: boolean;
  engine_version: string;
  cta_missing_data: boolean;
}

// ═══════════════════════════════════════════════════════════════
// TIME BUDGET
// ═══════════════════════════════════════════════════════════════

let startedAt = 0;

function timeRemaining(): number {
  return HARD_DEADLINE_MS - (Date.now() - startedAt);
}

function log(step: string, msg: string) {
  const elapsed = Date.now() - startedAt;
  console.log(`[CORE_V1][${elapsed}ms][${step}] ${msg}`);
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: RESOLVE CITY
// ═══════════════════════════════════════════════════════════════

async function resolveCity(
  supabase: ReturnType<typeof createClient>,
  blogId: string,
  requestCity?: string
): Promise<string> {
  // Priority 1: business_profile.city
  try {
    const { data } = await supabase
      .from('business_profile')
      .select('city')
      .eq('blog_id', blogId)
      .maybeSingle();
    if (data?.city && data.city.trim() && data.city.trim().toLowerCase() !== 'brasil') {
      log('CITY', `From business_profile: "${data.city}"`);
      return data.city.trim();
    }
  } catch (e) {
    log('CITY', `business_profile query failed: ${e}`);
  }

  // Priority 2: request city
  if (requestCity && requestCity.trim() && requestCity.trim().toLowerCase() !== 'brasil') {
    log('CITY', `From request: "${requestCity}"`);
    return requestCity.trim();
  }

  // Priority 3: fallback
  log('CITY', 'Fallback to "Brasil"');
  return 'Brasil';
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: FETCH BUSINESS PROFILE
// ═══════════════════════════════════════════════════════════════

async function fetchBusinessProfile(
  supabase: ReturnType<typeof createClient>,
  blogId: string
): Promise<BusinessProfile> {
  const defaults: BusinessProfile = {
    company_name: '',
    whatsapp: null,
    city: null,
    niche: null,
    services: null,
    project_name: null,
  };

  try {
    const { data } = await supabase
      .from('business_profile')
      .select('company_name, whatsapp, city, niche, services, project_name')
      .eq('blog_id', blogId)
      .maybeSingle();
    
    if (data) {
      return {
        company_name: data.company_name || '',
        whatsapp: data.whatsapp || null,
        city: data.city || null,
        niche: data.niche || null,
        services: data.services || null,
        project_name: data.project_name || null,
      };
    }
  } catch (e) {
    log('PROFILE', `fetch failed: ${e}`);
  }

  return defaults;
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: SERP-LITE RESEARCH (via model, no external APIs)
// ═══════════════════════════════════════════════════════════════

async function serpLiteResearch(
  keyword: string,
  city: string,
  niche: string
): Promise<ResearchPackage> {
  const defaults: ResearchPackage = {
    headings: [
      `O que é ${keyword}`,
      `Como funciona ${keyword} em ${city}`,
      `Benefícios de ${keyword}`,
      `Erros comuns com ${keyword}`,
      `Quando contratar especialista em ${keyword}`,
    ],
    questions: [
      `Quanto custa ${keyword} em ${city}?`,
      `Qual a frequência ideal de ${keyword}?`,
      `Como escolher um profissional de ${keyword}?`,
    ],
    entities: [keyword, city, niche],
    cautions: [
      'Não inventar estatísticas ou porcentagens',
      'Não citar legislação sem certeza da vigência',
      'Não fazer promessas de resultado garantido',
    ],
  };

  try {
    const result = await callWriter({
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em SEO local para serviços profissionais. Retorne APENAS um objeto JSON válido, sem texto adicional.`
        },
        {
          role: 'user',
          content: `Para a keyword "${keyword}" no contexto de "${niche}" em "${city}", gere um pacote de pesquisa SEO.

Retorne este JSON exato:
{
  "headings": ["5 a 8 headings H2 recomendados para o artigo"],
  "questions": ["3 a 6 perguntas que o público faz sobre o tema"],
  "entities": ["8 a 15 entidades/termos relevantes para SEO"],
  "cautions": ["3 a 5 coisas que o artigo NÃO deve afirmar sem provas"]
}`
        }
      ],
      temperature: 0.3,
      maxTokens: 1500,
    });

    if (result.success && result.data?.content) {
      const text = result.data.content;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          headings: Array.isArray(parsed.headings) ? parsed.headings.slice(0, 8) : defaults.headings,
          questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 6) : defaults.questions,
          entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 15) : defaults.entities,
          cautions: Array.isArray(parsed.cautions) ? parsed.cautions.slice(0, 5) : defaults.cautions,
        };
      }
    }
  } catch (e) {
    log('SERP', `Research failed, using defaults: ${e}`);
  }

  return defaults;
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: BUILD OUTLINE (3 variants to reduce footprint)
// ═══════════════════════════════════════════════════════════════

function buildCoreOutline(
  keyword: string,
  city: string,
  niche: string,
  research: ResearchPackage
): OutlineSection[] {
  // Deterministic variant based on hash
  const hash = (keyword + city + niche).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const variant = hash % 3; // 0=A, 1=B, 2=C

  const enrichedH2s = research.headings.slice(0, 3);

  if (variant === 0) {
    // Variant A: Problem → Cause → Solution → Errors → Specialist → FAQ
    return [
      { heading: `# ${capitalize(keyword)} em ${city}`, notes: 'H1 com keyword + cidade' },
      { heading: '## Introdução', notes: '2 parágrafos curtos contextualizando o problema local' },
      { heading: `## ${enrichedH2s[0] || `O problema de ${keyword} em ${city}`}`, notes: 'Contexto local do problema' },
      { heading: `## Por que ${keyword} acontece em ${city}`, notes: 'Causas locais: clima, urbanismo, rotina' },
      { heading: `## Como resolver ${keyword} de forma eficaz`, notes: 'Passo a passo prático' },
      { heading: `## Erros mais comuns ao lidar com ${keyword}`, notes: 'Lista com 3-5 erros' },
      { heading: `## Quando chamar um especialista em ${city}`, notes: 'Sinais de que é hora de buscar ajuda profissional' },
      { heading: `## Perguntas frequentes sobre ${keyword}`, notes: 'FAQ com 3-5 perguntas' },
      { heading: '## Próximo passo', notes: 'CTA obrigatório' },
    ];
  } else if (variant === 1) {
    // Variant B: What → How → Benefits → Risks → When → FAQ
    return [
      { heading: `# ${capitalize(keyword)} em ${city}`, notes: 'H1 com keyword + cidade' },
      { heading: '## Introdução', notes: '2 parágrafos curtos' },
      { heading: `## O que é ${keyword} e por que importa em ${city}`, notes: 'Definição + relevância local' },
      { heading: `## ${enrichedH2s[1] || `Como funciona o serviço de ${keyword}`}`, notes: 'Processo detalhado' },
      { heading: `## Vantagens de contratar ${keyword} profissional`, notes: 'Lista de benefícios' },
      { heading: `## Riscos de não resolver ${keyword} a tempo`, notes: 'Consequências' },
      { heading: `## Quando procurar ajuda com ${keyword} em ${city}`, notes: 'Situações específicas' },
      { heading: `## Dúvidas comuns sobre ${keyword} em ${city}`, notes: 'FAQ' },
      { heading: '## Próximo passo', notes: 'CTA obrigatório' },
    ];
  } else {
    // Variant C: Guide → Local → Steps → Myths → Choose → FAQ
    return [
      { heading: `# ${capitalize(keyword)} em ${city}: guia completo`, notes: 'H1 com keyword + cidade' },
      { heading: '## Introdução', notes: '2 parágrafos curtos' },
      { heading: `## ${enrichedH2s[2] || `Cenário de ${keyword} em ${city}`}`, notes: 'Panorama local' },
      { heading: `## Passo a passo para resolver ${keyword}`, notes: 'Guia prático' },
      { heading: `## Mitos e verdades sobre ${keyword}`, notes: 'Desmistificação' },
      { heading: `## Como escolher o melhor profissional em ${city}`, notes: 'Critérios de seleção' },
      { heading: `## O que esperar do serviço de ${keyword}`, notes: 'Expectativas realistas' },
      { heading: `## Perguntas frequentes`, notes: 'FAQ' },
      { heading: '## Próximo passo', notes: 'CTA obrigatório' },
    ];
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ═══════════════════════════════════════════════════════════════
// STEP 5: WRITER
// ═══════════════════════════════════════════════════════════════

async function writeArticle(
  keyword: string,
  city: string,
  niche: string,
  profile: BusinessProfile,
  outline: OutlineSection[],
  research: ResearchPackage,
  language: string
): Promise<{ title: string; content: string; meta_description: string; excerpt: string; faq: Array<{ question: string; answer: string }> }> {
  const lang = language === 'en-US' ? 'English' : 'Português brasileiro';

  const systemPrompt = `Você é um escritor técnico especializado em blogs de serviços locais. Escreva em ${lang}.

REGRAS OBRIGATÓRIAS:
- O título H1 DEVE conter "${keyword}" e "${city}"
- Pelo menos 2 headings H2 devem mencionar "${city}"
- Parágrafos com 2-4 linhas (máximo ~120 palavras cada)
- Use listas quando houver 3+ itens
- Markdown limpo: ## para H2, ### para H3, **negrito**, - para listas
- Linha em branco antes e depois de cada heading
- NÃO inventar estatísticas, porcentagens ou dados numéricos
- NÃO usar emojis nos headings
- NÃO usar padrões repetitivos como "Verdade dura", "Dica prática", "Atenção"
- NÃO mencionar chatbots, automação, SaaS ou ferramentas digitais
- NÃO usar "Brasil" como localização principal quando a cidade é "${city}"
- NÃO terminar com "## Próximo passo" ou CTA — isso será adicionado automaticamente
- Callouts visuais (> **Nota:**) são opcionais, máximo 1 por artigo
- Se website existe, pode incluir 1 link interno natural. Não inventar URLs.
- Tom profissional e escaneável, como blogs de autoridade.`;

  const outlineText = outline
    .filter(s => !s.heading.startsWith('## Próximo passo') && !s.heading.startsWith('## Introdução'))
    .map(s => `${s.heading} — ${s.notes}`)
    .join('\n');

  const userPrompt = `Escreva um artigo completo sobre "${keyword}" em "${city}".

PERFIL DO NEGÓCIO:
- Empresa: ${profile.company_name || 'não informado'}
- Nicho: ${niche}
- Cidade: ${city}
${profile.project_name ? `- Website: ${profile.project_name}` : ''}

OUTLINE:
${outlineText}

ENTIDADES RELEVANTES (use naturalmente no texto):
${research.entities.join(', ')}

PERGUNTAS DO PÚBLICO (responda no FAQ ou no corpo):
${research.questions.join('\n')}

CUIDADOS (NÃO afirmar sem prova):
${research.cautions.join('\n')}

FORMATO DE SAÍDA (JSON):
{
  "title": "Título H1 com keyword e cidade",
  "meta_description": "Meta description até 155 caracteres com keyword",
  "excerpt": "Resumo do artigo em 1-2 frases",
  "content": "Conteúdo completo em Markdown (SEM o H1, começar direto com intro e H2s)",
  "faq": [{"question": "Pergunta?", "answer": "Resposta curta"}]
}`;

  const result = await callWriter({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    maxTokens: 6000,
  });

  if (!result.success || !result.data) {
    throw new Error(`Writer failed: ${result.fallbackReason || 'unknown'}`);
  }

  // Parse response
  let parsed: any;
  const raw = result.data.toolCall?.arguments || result.data.content;

  if (typeof raw === 'object') {
    parsed = raw;
  } else if (typeof raw === 'string') {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Writer returned no JSON');
    parsed = JSON.parse(jsonMatch[0]);
  } else {
    throw new Error('Writer returned empty response');
  }

  return {
    title: parsed.title || `${capitalize(keyword)} em ${city}`,
    content: parsed.content || '',
    meta_description: parsed.meta_description || '',
    excerpt: parsed.excerpt || '',
    faq: Array.isArray(parsed.faq) ? parsed.faq : [],
  };
}

// ═══════════════════════════════════════════════════════════════
// STEP 6: POST-FORMAT
// ═══════════════════════════════════════════════════════════════

function postFormat(content: string): { formatted: string; maxParagraphChars: number } {
  let lines = content.split('\n');
  let maxChars = 0;

  // Normalize headings: remove leading spaces, ensure blank lines
  const normalized: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimStart();
    
    if (/^#{1,3}\s/.test(line)) {
      // Ensure blank line before heading
      if (normalized.length > 0 && normalized[normalized.length - 1].trim() !== '') {
        normalized.push('');
      }
      normalized.push(line);
      // Ensure blank line after heading
      if (i + 1 < lines.length && lines[i + 1]?.trim() !== '') {
        normalized.push('');
      }
    } else {
      normalized.push(line);
    }
  }

  // Paragraph breaker: split blocks > 700 chars
  const blocks = normalized.join('\n').split(/\n\n+/);
  const result: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Skip headings, lists, blockquotes, images, CTA
    if (/^#{1,3}\s/.test(trimmed) || /^[-*]\s/.test(trimmed) || /^>\s/.test(trimmed) ||
        /^!\[/.test(trimmed) || /^<figure/.test(trimmed) || /^\*\*👉/.test(trimmed)) {
      result.push(trimmed);
      if (trimmed.length > maxChars) maxChars = trimmed.length;
      continue;
    }

    if (trimmed.length > 700) {
      // Find last period before midpoint
      const mid = Math.floor(trimmed.length / 2);
      let splitIdx = trimmed.lastIndexOf('. ', mid);
      if (splitIdx === -1) splitIdx = trimmed.indexOf('. ', mid);
      
      if (splitIdx > 0 && splitIdx < trimmed.length - 10) {
        const part1 = trimmed.substring(0, splitIdx + 1).trim();
        const part2 = trimmed.substring(splitIdx + 1).trim();
        result.push(part1);
        result.push(part2);
        if (part1.length > maxChars) maxChars = part1.length;
        if (part2.length > maxChars) maxChars = part2.length;
      } else {
        result.push(trimmed);
        if (trimmed.length > maxChars) maxChars = trimmed.length;
      }
    } else {
      result.push(trimmed);
      if (trimmed.length > maxChars) maxChars = trimmed.length;
    }
  }

  return { formatted: result.join('\n\n'), maxParagraphChars: maxChars };
}

// ═══════════════════════════════════════════════════════════════
// STEP 7: CITY ENFORCEMENT
// ═══════════════════════════════════════════════════════════════

function enforceCity(content: string, title: string, city: string): { content: string; title: string; h2sWithCity: number } {
  if (city === 'Brasil') {
    const h2Matches = content.match(/^## .+$/gm) || [];
    const h2sWithCity = h2Matches.filter(h => h.toLowerCase().includes('brasil')).length;
    return { content, title, h2sWithCity };
  }

  const cityLower = city.toLowerCase();

  // Enforce H1/title
  let fixedTitle = title;
  if (!title.toLowerCase().includes(cityLower)) {
    if (title.toLowerCase().includes('brasil')) {
      fixedTitle = title.replace(/brasil/gi, city);
    } else {
      fixedTitle = `${title} em ${city}`;
    }
  }

  // Enforce content H1 (if present in content)
  let fixedContent = content.replace(/^# (.+)$/m, (_match, h1Text) => {
    if (h1Text.toLowerCase().includes(cityLower)) return `# ${h1Text}`;
    if (h1Text.toLowerCase().includes('brasil')) return `# ${h1Text.replace(/brasil/gi, city)}`;
    return `# ${h1Text} em ${city}`;
  });

  // Count H2s with city
  const h2Matches = fixedContent.match(/^## .+$/gm) || [];
  let h2sWithCity = h2Matches.filter(h => h.toLowerCase().includes(cityLower)).length;

  // If < 2 H2s have city, inject into first suitable ones
  if (h2sWithCity < 2) {
    const needed = 2 - h2sWithCity;
    let injected = 0;

    fixedContent = fixedContent.replace(/^## (.+)$/gm, (match, h2Text) => {
      if (injected >= needed) return match;
      if (h2Text.toLowerCase().includes(cityLower)) return match;
      // Skip FAQ and CTA headings
      if (/perguntas frequentes|dúvidas comuns|faq|próximo passo/i.test(h2Text)) return match;
      injected++;
      // Append city naturally
      if (h2Text.toLowerCase().includes('brasil')) {
        return `## ${h2Text.replace(/brasil/gi, city)}`;
      }
      return `## ${h2Text} em ${city}`;
    });

    h2sWithCity += injected;
  }

  return { content: fixedContent, title: fixedTitle, h2sWithCity };
}

// ═══════════════════════════════════════════════════════════════
// STEP 8: CTA INJECTION
// ═══════════════════════════════════════════════════════════════

function injectCTA(
  content: string,
  city: string,
  profile: BusinessProfile,
  keyword: string
): { content: string; ctaInjected: boolean; ctaMissingData: boolean } {
  const companyInfo: CompanyInfo = {
    name: profile.company_name || 'nossa equipe',
    city: city,
    whatsapp: profile.whatsapp || undefined,
    niche: profile.niche || undefined,
    services: profile.services || keyword,
    articleTitle: keyword,
  };

  let ctaMissingData = false;
  if (!profile.whatsapp) {
    ctaMissingData = true;
  }

  // Use editorialContract's ensureCompanyCTA
  let result = ensureCompanyCTA(content, companyInfo);

  // Validate
  if (!hasValidCTA(result)) {
    // Hard append fallback
    log('CTA', 'Validation failed, hard-appending CTA');
    const whatsappLine = profile.whatsapp
      ? `- WhatsApp: https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`
      : `- WhatsApp: (adicione o número no cadastro da subconta)`;

    result = content.trimEnd() + `\n\n## Próximo passo

Se você precisa de ajuda com ${keyword} em ${city}, fale com a equipe da ${profile.company_name || 'nossa empresa'}.

${whatsappLine}
${profile.project_name ? `- Site: ${profile.project_name}` : ''}
- Atendimento em: ${city} e região`;
  }

  return {
    content: result,
    ctaInjected: hasValidCTA(result),
    ctaMissingData,
  };
}

// ═══════════════════════════════════════════════════════════════
// STEP 9: GENERATE IMAGES
// ═══════════════════════════════════════════════════════════════

interface ImageResult {
  url: string;
  context: string;
  after_section: number;
  generatedBy: string;
}

async function generateImages(
  keyword: string,
  city: string,
  niche: string,
  articleId: string,
  targetCount: number
): Promise<ImageResult[]> {
  const images: ImageResult[] = [];
  
  const prompts = [
    { context: 'cover', prompt: `Professional wide-angle photograph showing ${keyword} service in ${city}, Brazil. Clean, modern, photorealistic. No text, no watermarks. 16:9 aspect ratio.`, after: 0 },
    { context: 'inline_1', prompt: `Close-up detail shot related to ${keyword} in urban ${city} setting. Professional quality, natural lighting. No faces, no text. 16:9.`, after: 2 },
    { context: 'inline_2', prompt: `Professional ${niche} team equipment or workspace in ${city}. Clean composition, modern. No logos, no text. 16:9.`, after: 4 },
  ];

  const toGenerate = prompts.slice(0, targetCount);

  for (let i = 0; i < toGenerate.length; i++) {
    if (timeRemaining() < 12000) {
      log('IMAGES', `Time budget exhausted at image ${i + 1}/${toGenerate.length}, stopping`);
      break;
    }

    const p = toGenerate[i];
    const seed = `${articleId.slice(0, 8)}-${i}`;
    const promptWithSeed = `${p.prompt} Unique seed: ${seed}`;

    try {
      log('IMAGES', `Generating ${i + 1}/${toGenerate.length} (${p.context})...`);
      
      // Race with timeout
      const result = await Promise.race([
        callImageGeneration({ prompt: promptWithSeed, context: p.context, niche, city }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Image timeout')), IMAGE_TIMEOUT_MS))
      ]);

      if (result.success && result.data?.url) {
        images.push({ url: result.data.url, context: p.context, after_section: p.after, generatedBy: result.data.generatedBy });
      } else {
        throw new Error('No image URL');
      }
    } catch (e) {
      log('IMAGES', `Failed ${p.context}: ${e}, using fallback`);
      const fallback = generateUnsplashFallback({ prompt: p.prompt, context: p.context, niche, city });
      images.push({ url: fallback.url, context: p.context, after_section: p.after, generatedBy: fallback.generatedBy });
    }

    // Small delay between images
    if (i < toGenerate.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return images;
}

function injectInlineImages(content: string, images: ImageResult[]): string {
  const inlineImages = images.filter(img => img.context !== 'cover');
  if (inlineImages.length === 0) return content;

  const h2Matches = [...content.matchAll(/^## .+$/gm)];
  
  for (const img of inlineImages) {
    const targetH2Index = img.after_section;
    if (targetH2Index < h2Matches.length) {
      const h2 = h2Matches[targetH2Index];
      if (h2.index !== undefined) {
        const insertPos = h2.index;
        const imgMarkdown = `\n\n![${img.context} - serviço profissional em ${content.match(/^# (.+)$/m)?.[1]?.split(' em ')[1] || 'local'}](${img.url})\n\n`;
        content = content.slice(0, insertPos) + imgMarkdown + content.slice(insertPos);
        // Re-match after modification to avoid offset issues (simple approach: only first inline matters positionally)
      }
    }
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════
// STEP 10: CALCULATE SCORE (sync)
// ═══════════════════════════════════════════════════════════════

async function calculateScore(
  supabaseUrl: string,
  supabaseKey: string,
  articleId: string,
  title: string,
  content: string,
  keyword: string,
  blogId: string
): Promise<{ score: number | null; status: 'ok' | 'failed' | 'skipped' }> {
  if (timeRemaining() < 18000) {
    log('SCORE', 'Time budget insufficient, skipping score');
    return { score: null, status: 'skipped' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/calculate-content-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        articleId,
        title,
        content,
        keyword,
        blogId,
        saveScore: true,
        userInitiated: false,
      }),
    });

    if (!response.ok) {
      log('SCORE', `HTTP ${response.status}`);
      return { score: null, status: 'failed' };
    }

    const data = await response.json();
    log('SCORE', `Score: ${data.total_score || data.score || 'unknown'}`);
    return { score: data.total_score || data.score || null, status: 'ok' };
  } catch (e) {
    log('SCORE', `Failed: ${e}`);
    return { score: null, status: 'failed' };
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 11: PERSIST
// ═══════════════════════════════════════════════════════════════

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    .replace(/^-|-$/g, '');
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  startedAt = Date.now();
  log('INIT', 'CORE_ARTICLE_ENGINE V1 started');

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsData.claims.sub as string;

    // Parse body
    const body: CoreRequest = await req.json();
    const blogId = body.blog_id;
    const keyword = body.keyword || body.theme || '';
    const requestCity = body.city;
    const requestNiche = body.niche;
    const language = body.language || 'pt-BR';
    const targetImages = body.targetImages ?? 3;
    const incomingArticleId = body.incomingArticleId || body.article_id;

    if (!blogId || !keyword) {
      return new Response(JSON.stringify({ error: 'blog_id and keyword are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    log('INIT', `keyword="${keyword}" blog="${blogId}" lang="${language}" targetImages=${targetImages}`);

    // Update placeholder if exists
    if (incomingArticleId) {
      await supabaseAdmin.from('articles').update({
        generation_stage: 'researching',
        generation_progress: 10,
      }).eq('id', incomingArticleId);
    }

    // ═══════════════════════════════════════════════════════════
    // PIPELINE
    // ═══════════════════════════════════════════════════════════

    // Step 1: Resolve City
    const city = await resolveCity(supabaseAdmin, blogId, requestCity);
    log('CITY', `Resolved: "${city}"`);

    // Step 2: Business Profile
    const profile = await fetchBusinessProfile(supabaseAdmin, blogId);
    const effectiveNiche = requestNiche || profile.niche || 'general';
    log('PROFILE', `company="${profile.company_name}" niche="${effectiveNiche}" whatsapp=${!!profile.whatsapp}`);

    // Step 3: SERP-Lite
    if (incomingArticleId) {
      await supabaseAdmin.from('articles').update({ generation_stage: 'researching', generation_progress: 20 }).eq('id', incomingArticleId);
    }
    const research = await serpLiteResearch(keyword, city, effectiveNiche);
    log('SERP', `headings=${research.headings.length} questions=${research.questions.length} entities=${research.entities.length}`);

    // Step 4: Outline
    const outline = buildCoreOutline(keyword, city, effectiveNiche, research);
    const outlineVariant = ['A', 'B', 'C'][(keyword + city + effectiveNiche).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 3];
    log('OUTLINE', `Variant ${outlineVariant}, ${outline.length} sections`);

    // Step 5: Writer
    if (incomingArticleId) {
      await supabaseAdmin.from('articles').update({ generation_stage: 'writing', generation_progress: 35 }).eq('id', incomingArticleId);
    }
    log('WRITER', 'Calling writer...');
    const article = await writeArticle(keyword, city, effectiveNiche, profile, outline, research, language);
    log('WRITER', `Done. Title: "${article.title}" Content: ${article.content.length} chars`);

    // Step 6: Post-Format
    const { formatted, maxParagraphChars } = postFormat(article.content);
    log('FORMAT', `maxParagraph=${maxParagraphChars} chars`);

    // Step 7: City Enforcement
    const { content: cityContent, title: cityTitle, h2sWithCity } = enforceCity(formatted, article.title, city);
    log('CITY_ENFORCE', `title="${cityTitle}" h2sWithCity=${h2sWithCity}`);

    // Prepend H1 to content
    let fullContent = `# ${cityTitle}\n\n${cityContent}`;

    // Step 8: CTA Injection
    if (incomingArticleId) {
      await supabaseAdmin.from('articles').update({ generation_stage: 'finalizing', generation_progress: 70 }).eq('id', incomingArticleId);
    }
    const { content: ctaContent, ctaInjected, ctaMissingData } = injectCTA(fullContent, city, profile, keyword);
    fullContent = ctaContent;
    log('CTA', `injected=${ctaInjected} missingData=${ctaMissingData}`);

    // Step 9: Images
    if (incomingArticleId) {
      await supabaseAdmin.from('articles').update({ generation_stage: 'images', generation_progress: 78 }).eq('id', incomingArticleId);
    }

    let images: ImageResult[] = [];
    let featuredImageUrl: string | null = null;
    const effectiveTargetImages = timeRemaining() < 18000 ? 1 : targetImages;

    if (timeRemaining() >= 12000) {
      images = await generateImages(keyword, city, effectiveNiche, incomingArticleId || `core-${Date.now()}`, effectiveTargetImages);
      
      // Set featured image
      const coverImage = images.find(i => i.context === 'cover');
      if (coverImage) {
        featuredImageUrl = coverImage.url;
      }

      // Inject inline images
      fullContent = injectInlineImages(fullContent, images);
      log('IMAGES', `Generated ${images.length}/${targetImages}`);
    } else {
      log('IMAGES', 'Skipped due to time budget');
    }

    // Step 10: Score
    if (incomingArticleId) {
      await supabaseAdmin.from('articles').update({ generation_stage: 'seo', generation_progress: 88 }).eq('id', incomingArticleId);
    }
    const scoreResult = await calculateScore(
      supabaseUrl, serviceKey,
      incomingArticleId || 'temp',
      cityTitle, fullContent, keyword, blogId
    );
    log('SCORE', `status=${scoreResult.status} score=${scoreResult.score}`);

    // Step 11: Persist
    const slug = generateSlug(cityTitle);
    const readingTime = Math.ceil(fullContent.split(/\s+/).length / 200);
    const secondaryKeywords = research.entities.slice(0, 8);

    const sourcePayload = {
      coreEngine: {
        version: ENGINE_VERSION,
        mode: 'core',
        city,
        niche_normalized: effectiveNiche,
        keyword_primary: keyword,
        keywords_secondary: secondaryKeywords,
        outline_variant: outlineVariant,
        outline_used: outline.map(s => s.heading),
        score_status: scoreResult.status,
        score_value: scoreResult.score,
        cta_injected: ctaInjected,
        cta_missing_data: ctaMissingData,
        images_total: targetImages,
        images_completed: images.length,
        images_pending: images.length < targetImages,
        research_provider: 'model_generated',
        writer_provider: 'openai_or_google',
        generated_at: new Date().toISOString(),
        elapsed_ms: Date.now() - startedAt,
      },
    };

    const contentImages = images.map(img => ({
      context: img.context,
      url: img.url,
      after_section: img.after_section,
    }));

    const articleData = {
      blog_id: blogId,
      title: cityTitle,
      slug,
      content: fullContent,
      excerpt: article.excerpt,
      meta_description: article.meta_description,
      faq: article.faq,
      keywords: [keyword, ...secondaryKeywords],
      status: 'published',
      generation_stage: 'completed',
      generation_progress: 100,
      generation_source: 'core_engine',
      article_structure_type: 'complete_guide',
      reading_time: readingTime,
      featured_image_url: featuredImageUrl,
      content_images: contentImages,
      images_total: targetImages,
      images_completed: images.length,
      images_pending: images.length < targetImages,
      source_payload: sourcePayload,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let articleId = incomingArticleId;

    if (incomingArticleId) {
      // Update existing placeholder
      const { error } = await supabaseAdmin
        .from('articles')
        .update(articleData)
        .eq('id', incomingArticleId);

      if (error) {
        log('PERSIST', `Update failed: ${error.message}`);
        throw new Error(`Persist failed: ${error.message}`);
      }
      log('PERSIST', `Updated article ${incomingArticleId}`);
    } else {
      // Insert new
      const { data: inserted, error } = await supabaseAdmin
        .from('articles')
        .insert(articleData)
        .select('id')
        .single();

      if (error) {
        log('PERSIST', `Insert failed: ${error.message}`);
        throw new Error(`Persist failed: ${error.message}`);
      }
      articleId = inserted.id;
      log('PERSIST', `Inserted article ${articleId}`);
    }

    // Build validation
    const validation: ValidationResult = {
      city_in_h1: cityTitle.toLowerCase().includes(city.toLowerCase()),
      h2s_with_city: h2sWithCity,
      has_cta: ctaInjected,
      max_paragraph_chars: maxParagraphChars,
      score_status: scoreResult.status,
      images_total: targetImages,
      images_completed: images.length,
      images_pending: images.length < targetImages,
      engine_version: ENGINE_VERSION,
      cta_missing_data: ctaMissingData,
    };

    log('DONE', `Total: ${Date.now() - startedAt}ms | Validation: ${JSON.stringify(validation)}`);

    // Return response compatible with existing frontend (streamArticle expects this shape)
    return new Response(JSON.stringify({
      success: true,
      article: {
        id: articleId,
        title: cityTitle,
        slug,
        content: fullContent,
        excerpt: article.excerpt,
        meta_description: article.meta_description,
        faq: article.faq,
        reading_time: readingTime,
        image_prompts: [],
      },
      keywords: { primary: keyword, secondary: secondaryKeywords },
      total_score: scoreResult.score,
      images_total: targetImages,
      images_completed: images.length,
      validation,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', errorMsg);

    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
      engine_version: ENGINE_VERSION,
      elapsed_ms: Date.now() - startedAt,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
