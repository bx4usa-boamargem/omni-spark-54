import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { blogId } = await req.json();

    if (!blogId) {
      return new Response(
        JSON.stringify({ error: 'blogId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch business profile
    const { data: businessProfile, error: profileError } = await supabase
      .from('business_profile')
      .select('*')
      .eq('blog_id', blogId)
      .single();

    if (profileError || !businessProfile) {
      return new Response(
        JSON.stringify({ 
          error: 'Business profile not found. Please complete your strategy configuration first.',
          needsSetup: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { niche, target_audience, pain_points, desires, brand_keywords, long_description } = businessProfile;

    if (!niche) {
      return new Response(
        JSON.stringify({ 
          error: 'Please configure your business niche in Strategy settings first.',
          needsSetup: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Você é um especialista em SEO para blogs. Com base nas informações do negócio abaixo, gere 10 palavras-chave estratégicas relevantes.

INFORMAÇÕES DO NEGÓCIO:
- Nicho: ${niche}
- Público-alvo: ${target_audience || 'Não especificado'}
- Dores do público: ${pain_points?.join(', ') || 'Não especificado'}
- Desejos do público: ${desires?.join(', ') || 'Não especificado'}
- Palavras-chave da marca: ${brand_keywords?.join(', ') || 'Não especificado'}
- Descrição: ${long_description || 'Não especificado'}

REGRAS:
1. Gere exatamente 10 palavras-chave divididas em:
   - 3 palavras-chave principais (alto volume, mais genéricas)
   - 4 palavras-chave long-tail (específicas, mais fáceis de ranquear)
   - 3 palavras-chave baseadas em dores/desejos do público

2. Todas as palavras-chave devem ser em português brasileiro
3. Cada palavra-chave deve ter uma justificativa breve

RETORNE APENAS UM JSON válido no formato:
{
  "keywords": [
    { "keyword": "palavra-chave aqui", "type": "principal", "reason": "Justificativa breve" },
    { "keyword": "como fazer X", "type": "long-tail", "reason": "Justificativa breve" },
    { "keyword": "resolver problema Y", "type": "dor", "reason": "Justificativa breve" }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
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

    // Parse JSON from response
    let keywords;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const parsed = JSON.parse(jsonStr);
      keywords = parsed.keywords;
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ keywords }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-niche-keywords:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
