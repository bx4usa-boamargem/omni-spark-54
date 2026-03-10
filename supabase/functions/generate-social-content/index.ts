import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateSocialRequest {
  article_id: string;
  platforms?: ('instagram' | 'linkedin' | 'facebook' | 'google_business')[];
}

interface SocialContent {
  instagram?: {
    slides: { title: string; body: string; emoji?: string }[];
    caption: string;
    hashtags: string[];
  };
  linkedin?: {
    post_text: string;
    summary: string;
    call_to_action: string;
  };
  facebook?: {
    post_text: string;
    summary: string;
    image_description: string;
  };
  google_business?: {
    title: string;
    summary: string;
    call_to_action: string;
    call_to_action_url?: string;
  };
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini error: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: GenerateSocialRequest = await req.json();
    const { article_id, platforms = ['instagram', 'linkedin', 'facebook', 'google_business'] } = body;

    if (!article_id) {
      return new Response(JSON.stringify({ error: 'article_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar artigo
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, title, excerpt, content, keywords, meta_description, featured_image_url, blog_id, slug')
      .eq('id', article_id)
      .single();

    if (articleError || !article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar acesso ao blog
    const { data: blog } = await supabase
      .from('blogs')
      .select('id, name, slug, custom_domain, domain_verified, primary_color, author_name')
      .eq('id', article.blog_id)
      .single();

    if (!blog) {
      return new Response(JSON.stringify({ error: 'Blog not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construir URL do artigo
    const articleDomain = blog.custom_domain && blog.domain_verified
      ? `https://${blog.custom_domain}`
      : `https://${blog.slug}.omniseenapp.com`;
    const articleUrl = `${articleDomain}/artigo/${article.slug}`;

    // Preparar conteúdo do artigo (truncar para o prompt)
    const contentPreview = (article.content || article.excerpt || article.meta_description || article.title)
      .replace(/<[^>]*>/g, '') // strip HTML
      .replace(/#{1,6}\s/g, '') // strip markdown headers
      .substring(0, 3000);

    const keywordsStr = (article.keywords || []).join(', ');
    const blogName = blog.name;
    const authorName = blog.author_name || blogName;

    const prompt = `Você é um especialista em marketing de conteúdo. Com base no artigo abaixo, crie conteúdo otimizado para as seguintes redes sociais: ${platforms.join(', ')}.

ARTIGO:
Título: ${article.title}
Keywords: ${keywordsStr}
URL: ${articleUrl}
Conteúdo: ${contentPreview}

Responda SOMENTE com JSON no seguinte formato (inclua apenas as plataformas solicitadas):

{
  ${platforms.includes('instagram') ? `"instagram": {
    "slides": [
      { "title": "Título do Slide 1", "body": "Texto principal do slide (máx 100 chars)", "emoji": "🎯" },
      { "title": "Slide 2", "body": "Texto do slide", "emoji": "💡" }
    ],
    "caption": "Legenda completa para Instagram (máx 2200 chars, com quebras de linha, emojis)",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6", "hashtag7", "hashtag8"]
  },` : ''}
  ${platforms.includes('linkedin') ? `"linkedin": {
    "post_text": "Post completo para LinkedIn (profissional, máx 3000 chars, inclua URL do artigo ao final)",
    "summary": "Resumo em 2 linhas do artigo",
    "call_to_action": "Frase de CTA engajante"
  },` : ''}
  ${platforms.includes('facebook') ? `"facebook": {
    "post_text": "Post completo para Facebook (amigável, máx 500 chars + URL)",
    "summary": "Resumo curto e cativante",
    "image_description": "Descrição para a imagem destacada (alt text)"
  },` : ''}
  ${platforms.includes('google_business') ? `"google_business": {
    "title": "Título do post (máx 58 chars)",
    "summary": "Texto do post para Google Meu Negócio (máx 1500 chars, chamativo e local)",
    "call_to_action": "LEARN_MORE",
    "call_to_action_url": "${articleUrl}"
  }` : ''}
}

Regras importantes:
- Use português do Brasil
- Blog/negócio: ${blogName} (autor: ${authorName})
- Para Instagram: crie entre 5 e 8 slides no carrossel
- Para LinkedIn: tom profissional e informativo
- Para Facebook: tom amigável e acessível
- Para Google Business: foco em benefício local/prático
- Inclua a URL ${articleUrl} nos posts que tiverem link
- NÃO inclua campos JSON vazios ou nulos
`;

    let socialContent: SocialContent = {};

    try {
      const jsonText = await callGemini(prompt);
      // Sanitize: às vezes o model retorna ```json ... ```
      const clean = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      socialContent = JSON.parse(clean);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Salvar no banco
    const savedPosts: Record<string, string> = {};

    for (const platform of platforms) {
      const platformContent = socialContent[platform as keyof SocialContent];
      if (!platformContent) continue;

      // Upsert (sobrescreve se já existir para este artigo + plataforma)
      const { data: savedPost, error: saveError } = await supabase
        .from('social_posts')
        .upsert({
          article_id: article.id,
          blog_id: article.blog_id,
          platform,
          content: platformContent,
          status: 'draft',
          created_by: user.id,
        }, {
          onConflict: 'article_id,platform',
          ignoreDuplicates: false,
        })
        .select('id')
        .single();

      if (!saveError && savedPost) {
        savedPosts[platform] = savedPost.id;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      article_id: article.id,
      article_url: articleUrl,
      content: socialContent,
      saved_post_ids: savedPosts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('generate-social-content error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
