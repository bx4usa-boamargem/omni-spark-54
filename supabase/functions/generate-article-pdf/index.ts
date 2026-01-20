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

// Convert markdown to clean text for PDF
function markdownToText(content: string): string {
  return content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic markers
    .replace(/`([^`]+)`/g, '$1') // Remove code markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Keep link text only
    .replace(/^\s*[-*]\s+/gm, '• ') // Convert list items
    .replace(/^\s*\d+\.\s+/gm, '') // Remove number list markers
    .trim();
}

// Parse markdown into sections
function parseMarkdownSections(content: string): Array<{ type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'list'; text: string }> {
  const lines = content.split('\n');
  const sections: Array<{ type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'list'; text: string }> = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check for headings
    if (trimmed.startsWith('### ')) {
      sections.push({ type: 'h3', text: trimmed.replace('### ', '') });
    } else if (trimmed.startsWith('## ')) {
      sections.push({ type: 'h2', text: trimmed.replace('## ', '') });
    } else if (trimmed.startsWith('# ')) {
      sections.push({ type: 'h1', text: trimmed.replace('# ', '') });
    } else if (trimmed.match(/^[-*]\s+/)) {
      sections.push({ type: 'list', text: trimmed.replace(/^[-*]\s+/, '• ') });
    } else {
      sections.push({ type: 'paragraph', text: markdownToText(trimmed) });
    }
  }
  
  return sections;
}

// Get blog URL
function getBlogUrl(blog: Blog): string {
  if (blog.custom_domain && blog.domain_verified) {
    return `https://${blog.custom_domain.replace('https://', '').replace('http://', '')}`;
  }
  if (blog.platform_subdomain) {
    const subdomain = blog.platform_subdomain.replace('https://', '').replace('http://', '');
    if (subdomain.includes('.app.omniseen.app')) {
      return `https://${subdomain}`;
    }
    return `https://${subdomain}.app.omniseen.app`;
  }
  return `https://${blog.slug}.app.omniseen.app`;
}

// Generate HTML for PDF
function generateEbookHtml(article: Article, blog: Blog): string {
  const publishedDate = article.published_at 
    ? new Date(article.published_at).toLocaleDateString('pt-BR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    : new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const primaryColor = blog.primary_color || '#6366f1';
  const blogUrl = getBlogUrl(blog);
  
  // Parse content into sections
  const sections = article.content ? parseMarkdownSections(article.content) : [];
  
  // Build content HTML
  let contentHtml = '';
  for (const section of sections) {
    switch (section.type) {
      case 'h1':
        contentHtml += `<h2 class="section-title">${section.text}</h2>`;
        break;
      case 'h2':
        contentHtml += `<h3 class="subsection-title">${section.text}</h3>`;
        break;
      case 'h3':
        contentHtml += `<h4 class="subsubsection-title">${section.text}</h4>`;
        break;
      case 'list':
        contentHtml += `<p class="list-item">${section.text}</p>`;
        break;
      case 'paragraph':
        contentHtml += `<p class="content-paragraph">${section.text}</p>`;
        break;
    }
  }
  
  // Build FAQ HTML
  let faqHtml = '';
  if (article.faq && article.faq.length > 0) {
    faqHtml = `
      <div class="faq-section page-break-before">
        <h2 class="faq-title">❓ Perguntas Frequentes</h2>
        ${article.faq.map(item => `
          <div class="faq-item">
            <p class="faq-question">${item.question}</p>
            <p class="faq-answer">${item.answer}</p>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Open+Sans:wght@400;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    @page {
      size: A4;
      margin: 20mm;
    }
    
    body {
      font-family: 'Merriweather', Georgia, serif;
      font-size: 11pt;
      line-height: 1.7;
      color: #1a1a1a;
      background: #fff;
    }
    
    .page-break-before {
      page-break-before: always;
    }
    
    .page-break-after {
      page-break-after: always;
    }
    
    /* Cover Page */
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px;
      background: linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}05 100%);
      page-break-after: always;
    }
    
    .cover-logo {
      max-width: 180px;
      max-height: 80px;
      object-fit: contain;
      margin-bottom: 40px;
    }
    
    .cover-title {
      font-family: 'Open Sans', sans-serif;
      font-size: 32pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 24px;
      max-width: 90%;
      line-height: 1.2;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      font-style: italic;
      color: #555;
      max-width: 80%;
      margin-bottom: 40px;
      line-height: 1.5;
    }
    
    .cover-image {
      width: 100%;
      max-width: 500px;
      max-height: 300px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 40px;
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);
    }
    
    .cover-meta {
      font-family: 'Open Sans', sans-serif;
      font-size: 11pt;
      color: #666;
    }
    
    .cover-author {
      font-weight: 600;
      color: ${primaryColor};
      margin-bottom: 8px;
    }
    
    /* Content Pages */
    .content-page {
      padding: 0;
    }
    
    .section-title {
      font-family: 'Open Sans', sans-serif;
      font-size: 18pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-top: 32px;
      margin-bottom: 16px;
      border-left: 4px solid ${primaryColor};
      padding-left: 16px;
    }
    
    .subsection-title {
      font-family: 'Open Sans', sans-serif;
      font-size: 14pt;
      font-weight: 600;
      color: #333;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    
    .subsubsection-title {
      font-family: 'Open Sans', sans-serif;
      font-size: 12pt;
      font-weight: 600;
      color: #444;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    
    .content-paragraph {
      margin-bottom: 14px;
      text-align: justify;
      text-justify: inter-word;
    }
    
    .list-item {
      margin-bottom: 8px;
      padding-left: 20px;
    }
    
    /* FAQ Section */
    .faq-section {
      margin-top: 40px;
      padding-top: 32px;
      border-top: 2px solid ${primaryColor}30;
    }
    
    .faq-title {
      font-family: 'Open Sans', sans-serif;
      font-size: 18pt;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 24px;
    }
    
    .faq-item {
      margin-bottom: 20px;
      padding: 16px;
      background: ${primaryColor}08;
      border-radius: 8px;
    }
    
    .faq-question {
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 8px;
      font-size: 11pt;
    }
    
    .faq-answer {
      color: #444;
      font-size: 10pt;
    }
    
    /* Footer */
    .page-footer {
      position: fixed;
      bottom: 10mm;
      left: 20mm;
      right: 20mm;
      text-align: center;
      font-family: 'Open Sans', sans-serif;
      font-size: 9pt;
      color: #888;
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
    
    .footer-url {
      color: ${primaryColor};
      text-decoration: none;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    ${blog.logo_url ? `<img src="${blog.logo_url}" alt="${blog.name}" class="cover-logo" />` : ''}
    
    <h1 class="cover-title">${article.title}</h1>
    
    ${article.meta_description ? `<p class="cover-subtitle">${article.meta_description}</p>` : ''}
    
    ${article.featured_image_url ? `<img src="${article.featured_image_url}" alt="${article.title}" class="cover-image" />` : ''}
    
    <div class="cover-meta">
      <p class="cover-author">Por ${blog.author_name || blog.name}</p>
      <p>${publishedDate}</p>
    </div>
  </div>
  
  <!-- Content Pages -->
  <div class="content-page">
    ${contentHtml}
    
    ${faqHtml}
  </div>
  
  <!-- Footer on all pages -->
  <div class="page-footer">
    Gerado por Omniseen • <a href="${blogUrl}" class="footer-url">${blogUrl.replace('https://', '')}</a>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { article_id }: ArticlePdfRequest = await req.json();

    if (!article_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'article_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-article-pdf] Starting PDF generation for article: ${article_id}`);

    // Fetch article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      console.error('[generate-article-pdf] Article not found:', articleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Article not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch blog
    const { data: blog, error: blogError } = await supabase
      .from('blogs')
      .select('id, name, slug, logo_url, primary_color, author_name, platform_subdomain, custom_domain, domain_verified')
      .eq('id', article.blog_id)
      .single();

    if (blogError || !blog) {
      console.error('[generate-article-pdf] Blog not found:', blogError);
      return new Response(
        JSON.stringify({ success: false, error: 'Blog not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-article-pdf] Generating HTML for article: ${article.title}`);

    // Generate HTML
    const html = generateEbookHtml(article as Article, blog as Blog);

    // Convert HTML to PDF using an external service or return HTML for client-side conversion
    // For now, we'll store the HTML and let the client handle PDF conversion
    // In production, you could use Puppeteer, wkhtmltopdf, or a PDF API service

    // Create a simple text-based PDF content (base64)
    const pdfFileName = `${article_id}.html`;
    const storagePath = `${blog.id}/${pdfFileName}`;

    // Upload HTML to storage (will be converted to PDF client-side)
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const htmlBuffer = await htmlBlob.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('article-pdfs')
      .upload(storagePath, new Uint8Array(htmlBuffer), {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      console.error('[generate-article-pdf] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to upload PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('article-pdfs')
      .getPublicUrl(storagePath);

    const pdfUrl = publicUrlData.publicUrl;

    console.log(`[generate-article-pdf] Uploaded to: ${pdfUrl}`);

    // Update article with PDF URL
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        pdf_url: pdfUrl,
        pdf_generated_at: new Date().toISOString()
      })
      .eq('id', article_id);

    if (updateError) {
      console.error('[generate-article-pdf] Update error:', updateError);
    }

    console.log(`[generate-article-pdf] Successfully generated PDF for article: ${article_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: pdfUrl,
        generated_at: new Date().toISOString(),
        html // Return HTML for client-side PDF generation as fallback
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-article-pdf] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});