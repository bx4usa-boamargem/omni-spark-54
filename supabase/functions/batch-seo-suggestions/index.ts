import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArticleInput {
  id: string;
  title: string;
  meta_description: string | null;
  content: string | null;
  keywords: string[] | null;
}

interface SuggestionOutput {
  articleId: string;
  originalValue: string;
  suggestedValue: string;
  improvement: string;
  predictedImpact: 'high' | 'medium' | 'low';
}

const PROMPTS: Record<string, string> = {
  title: `Você é um especialista em SEO e copywriting. Analise os títulos dos artigos abaixo e gere títulos otimizados.

Para cada artigo, crie um título que:
- Tenha entre 50-60 caracteres
- Inclua a palavra-chave principal naturalmente
- Seja atraente e aumente o CTR
- Use números quando apropriado (ex: "7 Dicas...")
- Crie urgência ou curiosidade

Responda APENAS com um JSON válido no formato:
[
  {
    "articleId": "id_do_artigo",
    "originalValue": "título original",
    "suggestedValue": "título otimizado",
    "improvement": "motivo da melhoria em até 10 palavras",
    "predictedImpact": "high" ou "medium" ou "low"
  }
]`,

  meta: `Você é um especialista em SEO. Crie meta descriptions otimizadas para os artigos abaixo.

Para cada artigo, crie uma meta description que:
- Tenha entre 140-160 caracteres
- Inclua a palavra-chave principal
- Tenha uma chamada para ação
- Seja persuasiva e gere cliques

Responda APENAS com um JSON válido no formato:
[
  {
    "articleId": "id_do_artigo",
    "originalValue": "descrição original ou vazio",
    "suggestedValue": "nova meta description",
    "improvement": "motivo da melhoria em até 10 palavras",
    "predictedImpact": "high" ou "medium" ou "low"
  }
]`,

  keywords: `Você é um especialista em SEO. Sugira palavras-chave otimizadas para os artigos abaixo.

Para cada artigo, sugira 3-5 palavras-chave que:
- Sejam relevantes ao conteúdo
- Tenham potencial de busca
- Incluam variações long-tail
- Sejam naturais ao tema

Responda APENAS com um JSON válido no formato:
[
  {
    "articleId": "id_do_artigo",
    "originalValue": "keywords atuais ou vazio",
    "suggestedValue": "keyword1, keyword2, keyword3, keyword4",
    "improvement": "motivo da melhoria em até 10 palavras",
    "predictedImpact": "high" ou "medium" ou "low"
  }
]`,

  density: `Você é um especialista em SEO. Analise a densidade de palavras-chave dos artigos.

Para cada artigo, sugira ajustes para:
- Densidade ideal de 0.5% a 2.5%
- Distribuição natural no texto
- Evitar keyword stuffing
- Usar variações semânticas

Identifique trechos que podem ser melhorados e sugira reescritas.

Responda APENAS com um JSON válido no formato:
[
  {
    "articleId": "id_do_artigo",
    "originalValue": "trecho problemático identificado",
    "suggestedValue": "sugestão de melhoria ou ajuste",
    "improvement": "motivo da melhoria em até 10 palavras",
    "predictedImpact": "high" ou "medium" ou "low"
  }
]`,

  content: `Você é um especialista em SEO e conteúdo. Analise os artigos e sugira expansões.

Para cada artigo com conteúdo fraco, sugira:
- Novas seções H2/H3 a adicionar
- Tópicos para expandir
- Melhorias de estrutura

Responda APENAS com um JSON válido no formato:
[
  {
    "articleId": "id_do_artigo",
    "originalValue": "resumo do conteúdo atual",
    "suggestedValue": "sugestões de seções: 1. [H2] Título, 2. [H2] Título, 3. [H3] Subtópico",
    "improvement": "motivo da melhoria em até 10 palavras",
    "predictedImpact": "high" ou "medium" ou "low"
  }
]`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { type, articles, blog_id, user_id } = await req.json();

    if (!type || !articles || !Array.isArray(articles) || articles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, articles' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = PROMPTS[type];
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: `Invalid optimization type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare articles data for the prompt
    const articlesData = articles.map((a: ArticleInput) => {
      const data: Record<string, any> = {
        id: a.id,
        title: a.title
      };

      if (type === 'meta') {
        data.meta_description = a.meta_description || '';
        data.content_preview = (a.content || '').substring(0, 500);
      } else if (type === 'keywords') {
        data.current_keywords = a.keywords?.join(', ') || '';
        data.content_preview = (a.content || '').substring(0, 1000);
      } else if (type === 'density' || type === 'content') {
        data.keywords = a.keywords?.join(', ') || '';
        data.content = (a.content || '').substring(0, 3000);
      }

      return data;
    });

    console.log(`Processing ${articles.length} articles for ${type} optimization`);

    // Call Lovable AI Gateway
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
          { 
            role: 'user', 
            content: `Analise os seguintes artigos e gere sugestões de otimização:\n\n${JSON.stringify(articlesData, null, 2)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA insuficientes. Adicione créditos ao seu workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    let suggestions: SuggestionOutput[] = [];
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw response:', content);
    }

    console.log(`Generated ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('batch-seo-suggestions error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
