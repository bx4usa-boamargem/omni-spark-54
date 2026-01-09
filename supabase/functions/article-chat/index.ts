import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  blogId: string;
  generateArticle?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, blogId, generateArticle }: ChatRequest = await req.json();

    if (!blogId) {
      return new Response(
        JSON.stringify({ error: 'blogId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch business profile for context
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('*')
      .eq('blog_id', blogId)
      .single();

    const { data: contentPrefs } = await supabase
      .from('content_preferences')
      .select('*')
      .eq('blog_id', blogId)
      .single();

    const businessContext = businessProfile ? `
Contexto do Negócio:
- Empresa: ${businessProfile.company_name || 'Não informado'}
- Nicho: ${businessProfile.niche || 'Não informado'}
- Público-alvo: ${businessProfile.target_audience || 'Não informado'}
- Tom de voz: ${businessProfile.tone_of_voice || 'profissional'}
- Palavras-chave da marca: ${businessProfile.brand_keywords?.join(', ') || 'Não informado'}
- Descrição: ${businessProfile.long_description || 'Não informado'}
` : '';

    const systemPrompt = `Você é a OMNISEEN AI, a assistente virtual inteligente da plataforma OMNISEEN, especializada em criação de artigos para blogs.
Quando perguntada quem você é, responda: "Sou a OMNISEEN AI, sua assistente de criação de conteúdo! Vou te ajudar a criar artigos incríveis."

🤖 IDENTIDADE:
- Nome: OMNISEEN AI
- Função: Assistente de Criação de Conteúdo da OMNISEEN
- Personalidade: Criativa, prestativa e especialista em conteúdo

${businessContext}

FLUXO DA CONVERSA:
1. Se apresente brevemente como OMNISEEN AI na primeira mensagem
2. Pergunte sobre o TEMA principal do artigo
3. Pergunte sobre o PÚBLICO-ALVO específico 
4. Pergunte sobre o TOM desejado (profissional, descontraído, técnico, etc.)
5. Pergunte sobre PONTOS-CHAVE que devem ser abordados
6. Confirme as informações e ofereça gerar o artigo

REGRAS:
- Sempre se identifique como OMNISEEN AI quando perguntada
- Seja amigável e objetivo
- Faça uma pergunta por vez
- Sugira opções quando apropriado
- Use o contexto do negócio para fazer sugestões relevantes
- Quando tiver todas as informações, indique que está pronto para gerar

Se o usuário pedir para gerar o artigo, responda com um JSON no formato:
{"ready_to_generate": true, "article_data": {"theme": "...", "audience": "...", "tone": "...", "keyPoints": ["..."], "keywords": ["..."]}}`;

    // If generateArticle is true, use tool calling to generate the article
    if (generateArticle) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
      
      const generationPrompt = `Com base na conversa anterior, gere um artigo completo.

Conversa:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

Gere um artigo de blog completo e otimizado para SEO. Também gere um prompt para criar a imagem destacada.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
            { role: 'user', content: 'Por favor, gere o artigo completo agora.' }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'generate_article',
              description: 'Gera um artigo completo de blog com prompt para imagem',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Título otimizado para SEO' },
                  excerpt: { type: 'string', description: 'Resumo do artigo (max 160 chars)' },
                  meta_description: { type: 'string', description: 'Meta description para SEO' },
                  content: { type: 'string', description: 'Conteúdo completo em Markdown' },
                  keywords: { type: 'array', items: { type: 'string' }, description: 'Palavras-chave do artigo' },
                  faq: { 
                    type: 'array', 
                    items: { 
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        answer: { type: 'string' }
                      }
                    },
                    description: 'Perguntas frequentes'
                  },
                  image_prompt: { 
                    type: 'string', 
                    description: 'Prompt em inglês para gerar imagem destacada (hero image) do artigo. Descreva a imagem ideal para o tema.'
                  }
                },
                required: ['title', 'excerpt', 'meta_description', 'content', 'keywords', 'image_prompt']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'generate_article' } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Payment required. Please add credits.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw new Error('AI API error');
      }

      const aiResult = await response.json();
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        const articleData = JSON.parse(toolCall.function.arguments);
        
        // Generate featured image
        let featuredImageUrl = null;
        if (articleData.image_prompt) {
          try {
            const imageResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-image`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt: articleData.image_prompt,
                context: 'hero',
                articleTheme: articleData.title,
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              featuredImageUrl = imageData.imageUrl;
            }
          } catch (imgError) {
            console.error('Error generating image:', imgError);
            // Continue without image
          }
        }

        return new Response(
          JSON.stringify({ 
            type: 'article',
            article: {
              ...articleData,
              featured_image_url: featuredImageUrl
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate article' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular chat flow
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI API error');
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || '';

    // Check if response contains ready_to_generate
    let isReadyToGenerate = false;
    let articleData = null;

    try {
      const jsonMatch = content.match(/\{[\s\S]*"ready_to_generate"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.ready_to_generate) {
          isReadyToGenerate = true;
          articleData = parsed.article_data;
        }
      }
    } catch {
      // Not a JSON response, that's fine
    }

    return new Response(
      JSON.stringify({ 
        type: 'message',
        message: content,
        isReadyToGenerate,
        articleData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in article-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
