import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArticlePdfRequest {
  article_id: string;
}

interface Article {
  id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  faq: { question: string; answer: string }[] | null;
  keywords: string[] | null;
  blog_id: string;
  share_token: string | null;
}

interface Blog {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  author_name: string | null;
  platform_subdomain: string | null;
  custom_domain: string | null;
  domain_verified: boolean | null;
}

interface SmartLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
}

// ─── Markdown inline parser ───────────────────────────────────────────────────

function parseInline(text: string, color: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      `<a href="$2" style="color:${color};text-decoration:underline;" target="_blank">$1</a>`)
    .replace(/\[([^\]]+)\]\((\/[^)]*)\)/g,
      `<a href="$2" style="color:${color};text-decoration:underline;">$1</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g,
      '<code style="background:#f4f4f4;padding:2px 6px;border-radius:4px;font-size:0.88em;font-family:monospace;">$1</code>');
}

interface Section {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'list' | 'blockquote' | 'divider';
  text: string;
  id?: string;   // used for TOC anchors
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

function parseMarkdownSections(content: string, color: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed === '---' || trimmed === '***') {
      sections.push({ type: 'divider', text: '' });
    } else if (trimmed.startsWith('### ')) {
      const raw = trimmed.slice(4);
      sections.push({ type: 'h3', text: parseInline(raw, color), id: slugify(raw) });
    } else if (trimmed.startsWith('## ')) {
      const raw = trimmed.slice(3);
      sections.push({ type: 'h2', text: parseInline(raw, color), id: slugify(raw) });
    } else if (trimmed.startsWith('# ')) {
      const raw = trimmed.slice(2);
      sections.push({ type: 'h1', text: parseInline(raw, color), id: slugify(raw) });
    } else if (trimmed.startsWith('> ')) {
      sections.push({ type: 'blockquote', text: parseInline(trimmed.slice(2), color) });
    } else if (trimmed.match(/^[-*]\s+/)) {
      sections.push({ type: 'list', text: parseInline(trimmed.replace(/^[-*]\s+/, ''), color) });
    } else if (trimmed.match(/^\d+\.\s+/)) {
      sections.push({ type: 'list', text: parseInline(trimmed.replace(/^\d+\.\s+/, ''), color) });
    } else {
      sections.push({ type: 'paragraph', text: parseInline(trimmed, color) });
    }
  }

  return sections;
}

// ─── Blog URL helper ──────────────────────────────────────────────────────────

function getBlogUrl(blog: Blog): string {
  if (blog.custom_domain && blog.domain_verified) {
    return `https://${blog.custom_domain.replace(/^https?:\/\//, '')}`;
  }
  if (blog.platform_subdomain) {
    const sub = blog.platform_subdomain.replace(/^https?:\/\//, '');
    return sub.includes('.') ? `https://${sub}` : `https://${sub}.app.omniseen.app`;
  }
  return `https://${blog.slug}.app.omniseen.app`;
}

// ─── Table of Contents builder ────────────────────────────────────────────────

function buildToc(sections: Section[], color: string): string {
  const headings = sections.filter(s => s.type === 'h1' || s.type === 'h2');
  if (headings.length < 2) return '';

  const items = headings.map(h => {
    const indent = h.type === 'h2' ? 'margin-left:16px;' : '';
    const raw = h.text.replace(/<[^>]+>/g, ''); // strip tags for display
    return `
      <div class="toc-item" style="${indent}">
        <a class="toc-link" href="#${h.id}" style="color:${color};">
          ${raw}
        </a>
      </div>`;
  }).join('');

  return `
    <div class="toc-page page-break-after">
      <h2 class="toc-title" style="color:${color};">Sumário</h2>
      <div class="toc-list">${items}</div>
    </div>`;
}

// ─── HTML eBook generator ─────────────────────────────────────────────────────

function generateEbookHtml(
  article: Article,
  blog: Blog,
  smartLinks: SmartLink[],
  shareToken: string,
): string {
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const primaryColor = blog.primary_color || '#6366f1';
  const blogUrl = getBlogUrl(blog);

  const sections = article.content ? parseMarkdownSections(article.content, primaryColor) : [];

  // ─ TOC ─
  const tocHtml = buildToc(sections, primaryColor);

  // ─ Main content ─
  let contentHtml = '';
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      contentHtml += `<ul class="content-list">${listBuffer.map(i => `<li>${i}</li>`).join('')}</ul>`;
      listBuffer = [];
    }
  };

  for (const section of sections) {
    if (section.type !== 'list') flushList();

    switch (section.type) {
      case 'h1':
        contentHtml += `<h2 class="section-title" id="${section.id ?? ''}">${section.text}</h2>`;
        break;
      case 'h2':
        contentHtml += `<h3 class="subsection-title" id="${section.id ?? ''}">${section.text}</h3>`;
        break;
      case 'h3':
        contentHtml += `<h4 class="subsubsection-title" id="${section.id ?? ''}">${section.text}</h4>`;
        break;
      case 'blockquote':
        contentHtml += `<blockquote class="content-quote">${section.text}</blockquote>`;
        break;
      case 'list':
        listBuffer.push(section.text);
        break;
      case 'divider':
        contentHtml += `<hr class="content-divider" />`;
        break;
      case 'paragraph':
        if (section.text.trim()) {
          contentHtml += `<p class="content-paragraph">${section.text}</p>`;
        }
        break;
    }
  }
  flushList();

  // ─ FAQ ─
  let faqHtml = '';
  if (article.faq && article.faq.length > 0) {
    faqHtml = `
      <div class="faq-section page-break-before">
        <h2 class="faq-title" style="color:${primaryColor};">Perguntas Frequentes</h2>
        ${article.faq.map(item => `
          <div class="faq-item">
            <p class="faq-question" style="color:${primaryColor};">${item.question}</p>
            <p class="faq-answer">${item.answer}</p>
          </div>
        `).join('')}
      </div>`;
  }

  // ─ Smart Links ─
  let smartLinksHtml = '';
  if (smartLinks.length > 0) {
    smartLinksHtml = `
      <div class="smart-links-section page-break-before">
        <h2 class="smart-links-title" style="color:${primaryColor};">Links Relacionados</h2>
        <p class="smart-links-intro">Acesse recursos adicionais diretamente pelos links abaixo:</p>
        <div class="smart-links-grid">
          ${smartLinks.map(link => `
            <a href="${blogUrl}/a/${link.slug}"
               class="smart-link-card"
               style="border-color:${primaryColor}30;"
               target="_blank">
              <span class="smart-link-arrow" style="color:${primaryColor};">→</span>
              <div class="smart-link-info">
                <span class="smart-link-name">${link.title}</span>
                ${link.description ? `<span class="smart-link-desc">${link.description}</span>` : ''}
              </div>
            </a>
          `).join('')}
        </div>
      </div>`;
  }

  // ─ CTA ─
  const ctaHtml = `
    <div class="cta-section">
      <div class="cta-box" style="background:linear-gradient(135deg,${primaryColor}18 0%,${primaryColor}08 100%);border-color:${primaryColor}40;">
        <h2 class="cta-title" style="color:${primaryColor};">Gostou do conteúdo?</h2>
        <p class="cta-text">Visite nosso blog para mais artigos como este e fique por dentro de todas as novidades.</p>
        <a href="${blogUrl}" class="cta-button" style="background-color:${primaryColor};" target="_blank">
          Acessar ${blog.name}
        </a>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title} — ${blog.name}</title>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Inter:wght@400;500;600;700&display=swap');

    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Page layout ──
       Margens generosas para texto nunca encostar nas bordas.
       O @page também define os running headers/footers em print.       */
    @page {
      size: A4;
      margin: 22mm 24mm 28mm 24mm;
    }

    /* Numeração de página no rodapé usando CSS Paged Media
       (funciona no Chromium nativo e em Puppeteer/wkhtmltopdf).
       Cada página imprime "Página X / N" centralizado.              */
    @page {
      @bottom-center {
        content: "Página " counter(page) " / " counter(pages);
        font-family: 'Inter', Arial, sans-serif;
        font-size: 8.5pt;
        color: #aaa;
      }
      @top-right {
        content: "${blog.name.replace(/"/g, '\\"')}";
        font-family: 'Inter', Arial, sans-serif;
        font-size: 8pt;
        color: #bbb;
      }
    }

    /* Suprimir numeração na capa */
    @page :first {
      @bottom-center { content: ""; }
      @top-right     { content: ""; }
    }

    body {
      font-family: 'Merriweather', Georgia, 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.8;
      color: #1a1a2e;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    a { color: ${primaryColor}; text-decoration: underline; }

    .page-break-before { page-break-before: always; }
    .page-break-after  { page-break-after: always;  }

    /* ═══════════════════ CAPA ═══════════════════ */
    .cover-page {
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 48px 40px;
      background: linear-gradient(160deg, ${primaryColor}16 0%, ${primaryColor}06 55%, #fff 100%);
      border-bottom: 5px solid ${primaryColor};
      page-break-after: always;
    }

    .cover-logo {
      max-width: 160px;
      max-height: 72px;
      object-fit: contain;
      margin-bottom: 44px;
    }

    .cover-badge {
      display: inline-block;
      background: ${primaryColor}18;
      color: ${primaryColor};
      font-family: 'Inter', Arial, sans-serif;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 6px 18px;
      border-radius: 20px;
      margin-bottom: 28px;
      border: 1px solid ${primaryColor}30;
    }

    .cover-title {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 28pt;
      font-weight: 800;
      color: #0d0d1f;
      margin-bottom: 20px;
      max-width: 86%;
      line-height: 1.12;
      letter-spacing: -0.02em;
    }

    .cover-subtitle {
      font-size: 12.5pt;
      font-style: italic;
      color: #555;
      max-width: 76%;
      margin-bottom: 36px;
      line-height: 1.6;
    }

    .cover-image {
      width: 100%;
      max-width: 500px;
      max-height: 270px;
      object-fit: cover;
      border-radius: 14px;
      margin-bottom: 36px;
      box-shadow: 0 16px 48px -10px rgba(0,0,0,0.2);
    }

    .cover-meta {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 10pt;
      color: #777;
    }

    .cover-author {
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 6px;
    }

    /* ═══════════════════ SUMÁRIO ═══════════════════ */
    .toc-page {
      padding: 0;
      page-break-after: always;
    }

    .toc-title {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 20pt;
      font-weight: 800;
      margin-bottom: 28px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${primaryColor}30;
      letter-spacing: -0.01em;
    }

    .toc-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .toc-item {
      border-bottom: 1px dotted #ddd;
      padding-bottom: 8px;
    }

    .toc-link {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11pt;
      font-weight: 500;
      text-decoration: none !important;
      transition: color 0.2s;
    }

    .toc-link:hover { text-decoration: underline !important; }

    /* ═══════════════════ CONTEÚDO ═══════════════════ */
    .content-page { padding: 0; }

    /* Seção principal — barra colorida à esquerda */
    .section-title {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 16pt;
      font-weight: 800;
      color: #0d0d1f;
      margin-top: 40px;
      margin-bottom: 16px;
      padding-left: 16px;
      border-left: 5px solid ${primaryColor};
      line-height: 1.25;
      page-break-after: avoid;
      break-after: avoid;
    }

    .subsection-title {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 13pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-top: 28px;
      margin-bottom: 10px;
      page-break-after: avoid;
      break-after: avoid;
    }

    .subsubsection-title {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11.5pt;
      font-weight: 600;
      color: #333;
      margin-top: 20px;
      margin-bottom: 8px;
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Texto — justificado, hifenizado, sem viúvas/órfãs */
    .content-paragraph {
      margin-bottom: 15px;
      text-align: justify;
      text-align-last: left;
      text-justify: inter-word;
      hyphens: auto;
      -webkit-hyphens: auto;
      word-break: break-word;
      overflow-wrap: break-word;
      orphans: 3;
      widows: 3;
    }

    /* Listas — também justificadas */
    .content-list {
      margin-bottom: 15px;
      padding-left: 26px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .content-list li {
      margin-bottom: 7px;
      line-height: 1.72;
      text-align: justify;
      text-justify: inter-word;
      hyphens: auto;
      -webkit-hyphens: auto;
    }

    /* Citações */
    .content-quote {
      border-left: 4px solid ${primaryColor};
      background: ${primaryColor}08;
      padding: 14px 18px;
      margin: 18px 0;
      font-style: italic;
      color: #444;
      border-radius: 0 10px 10px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .content-divider {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 28px 0;
    }

    /* ═══════════════════ FAQ ═══════════════════ */
    .faq-section { margin-top: 44px; padding-top: 32px; }

    .faq-title {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 17pt;
      font-weight: 800;
      margin-bottom: 24px;
      letter-spacing: -0.01em;
    }

    .faq-item {
      margin-bottom: 18px;
      padding: 16px 18px;
      background: ${primaryColor}07;
      border-radius: 10px;
      border: 1px solid ${primaryColor}22;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .faq-question {
      font-family: 'Inter', Arial, sans-serif;
      font-weight: 700;
      margin-bottom: 8px;
      font-size: 10.5pt;
    }

    .faq-answer {
      color: #444;
      font-size: 10.5pt;
      text-align: justify;
      text-justify: inter-word;
      hyphens: auto;
      -webkit-hyphens: auto;
    }

    /* ═══════════════════ SMART LINKS ═══════════════════ */
    .smart-links-section { margin-top: 40px; padding-top: 30px; }

    .smart-links-title {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 17pt;
      font-weight: 800;
      margin-bottom: 10px;
      letter-spacing: -0.01em;
    }

    .smart-links-intro {
      font-size: 10.5pt;
      color: #666;
      margin-bottom: 18px;
    }

    .smart-links-grid { display: flex; flex-direction: column; gap: 10px; }

    .smart-link-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 10px;
      background: #fafafa;
      text-decoration: none !important;
      color: inherit !important;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .smart-link-arrow {
      font-size: 15pt;
      font-weight: 700;
      flex-shrink: 0;
    }

    .smart-link-info { display: flex; flex-direction: column; gap: 2px; }

    .smart-link-name {
      font-family: 'Inter', Arial, sans-serif;
      font-weight: 600;
      font-size: 10.5pt;
      color: #111;
    }

    .smart-link-desc { font-size: 9.5pt; color: #777; }

    /* ═══════════════════ CTA ═══════════════════ */
    .cta-section { margin-top: 44px; page-break-inside: avoid; break-inside: avoid; }

    .cta-box {
      padding: 34px 36px;
      border: 1px solid;
      border-radius: 16px;
      text-align: center;
    }

    .cta-title {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 17pt;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: -0.01em;
    }

    .cta-text {
      font-size: 11pt;
      color: #555;
      margin-bottom: 24px;
      line-height: 1.65;
    }

    .cta-button {
      display: inline-block;
      color: #fff !important;
      text-decoration: none !important;
      padding: 13px 34px;
      border-radius: 9px;
      font-family: 'Inter', Arial, sans-serif;
      font-weight: 700;
      font-size: 11pt;
      letter-spacing: 0.01em;
    }

    /* ═══════════════════ PRINT OVERRIDES ═══════════════════ */
    @media print {
      body   { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      a      { color: ${primaryColor} !important; }
      .cta-button { color: #fff !important; }

      /* Garantir que elementos em bloco não quebrem no meio */
      .faq-item,
      .smart-link-card,
      .cta-box,
      .content-list,
      .content-quote { page-break-inside: avoid; }

      /* Títulos ficam com seu parágrafo seguinte */
      .section-title,
      .subsection-title,
      .subsubsection-title {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- ════════════ CAPA ════════════ -->
  <div class="cover-page">
    ${blog.logo_url ? `<img src="${blog.logo_url}" alt="${blog.name}" class="cover-logo" />` : ''}
    <span class="cover-badge">e-Book</span>
    <h1 class="cover-title">${article.title}</h1>
    ${article.meta_description
      ? `<p class="cover-subtitle">${article.meta_description}</p>`
      : ''}
    ${article.featured_image_url
      ? `<img src="${article.featured_image_url}" alt="${article.title}" class="cover-image" />`
      : ''}
    <div class="cover-meta">
      <p class="cover-author">Por ${blog.author_name || blog.name}</p>
      <p>${publishedDate}</p>
    </div>
  </div>

  <!-- ════════════ SUMÁRIO ════════════ -->
  ${tocHtml}

  <!-- ════════════ CONTEÚDO ════════════ -->
  <div class="content-page">
    ${contentHtml}
    ${faqHtml}
    ${smartLinksHtml}
    ${ctaHtml}
  </div>

</body>
</html>`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { article_id }: ArticlePdfRequest = await req.json();

    if (!article_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'article_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[generate-article-pdf] article: ${article_id}`);

    // ─ Fetch article ─
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      return new Response(
        JSON.stringify({ success: false, error: 'Article not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─ Fetch blog ─
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, name, slug, logo_url, primary_color, author_name, platform_subdomain, custom_domain, domain_verified')
      .eq('id', article.blog_id)
      .single();

    if (blogError || !blog) {
      return new Response(
        JSON.stringify({ success: false, error: 'Blog not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─ Fetch smart links ─
    const { data: smartLinksRaw } = await supabase
      .from('article_smart_links')
      .select('id, slug, title, description')
      .eq('blog_id', article.blog_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    const smartLinks: SmartLink[] = (smartLinksRaw || []) as SmartLink[];

    // ─ Ensure share_token exists on the article ─
    let shareToken: string = article.share_token ?? '';
    if (!shareToken) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      shareToken = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
      await supabase.from('articles').update({ share_token: shareToken }).eq('id', article_id);
    }

    // ─ Generate HTML eBook ─
    const html = generateEbookHtml(article as Article, blog as Blog, smartLinks, shareToken);

    // ─ Upload HTML to storage ─
    const storagePath = `${blog.id}/${article_id}.html`;
    const { error: uploadError } = await supabase.storage
      .from('article-pdfs')
      .upload(storagePath, new TextEncoder().encode(html), {
        contentType: 'text/html;charset=utf-8',
        upsert: true,
      });

    let htmlUrl: string | undefined;
    if (!uploadError) {
      const { data: pub } = supabase.storage.from('article-pdfs').getPublicUrl(storagePath);
      htmlUrl = pub?.publicUrl;
    } else {
      console.warn('[generate-article-pdf] Storage upload warning:', uploadError.message);
    }

    // ─ Update article record ─
    await supabase.from('articles').update({
      pdf_url: htmlUrl,
      pdf_generated_at: new Date().toISOString(),
    }).eq('id', article_id);

    // ─ Upsert ebook_views row (rastreamento) ─
    await supabase.from('ebook_views').upsert(
      { article_id, blog_id: article.blog_id, share_token: shareToken },
      { onConflict: 'share_token', ignoreDuplicates: true },
    );

    console.log(`[generate-article-pdf] Done. smart_links=${smartLinks.length} share_token=${shareToken}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: htmlUrl,
        share_token: shareToken,
        generated_at: new Date().toISOString(),
        smart_links_count: smartLinks.length,
        html,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('[generate-article-pdf] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});