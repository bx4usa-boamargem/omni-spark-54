import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callWriter } from "../_shared/aiProviders.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  type: 'image' | 'carousel' | 'video';
  images?: string[];     // base64 encoded images
  caption?: string;      // manually pasted caption
  videoUrl?: string;     // URL for video embedding
}

// Extract text from image using AI Vision
async function extractTextFromImage(imageBase64: string): Promise<string> {
  try {
    console.log('Extracting text from image using AI Vision...');

    const responseResult = await callWriter({
      messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extraia TODO o texto visível desta imagem de post do Instagram.

Instruções:
- Capture títulos, subtítulos, listas numeradas, bullets e qualquer texto
- Se for um post educativo/informativo, organize o conteúdo de forma estruturada
- Se houver múltiplos slides visíveis, separe cada um
- Mantenha a formatação original (listas, parágrafos, etc.)
- Se não houver texto, descreva brevemente o conteúdo visual

Responda APENAS com o texto extraído, sem comentários adicionais.`
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
      temperature: 0.7,
      maxTokens: 4096,
    });

    if (!responseResult.success || !responseResult.data?.content) {
      console.error("[AI] Writer failed:", responseResult.fallbackReason);
      throw new Error(`AI error: ${responseResult.fallbackReason}`);
    }

    const content = responseResult.data.content;
    return typeof content === 'string' ? content : JSON.stringify(content);
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw error;
  }
}

// Generate suggested title from content
async function generateSuggestedTitle(content: string): Promise<string> {
  try {
    const responseResult = await callWriter({
      messages: [
          {
            role: 'user',
            content: `Com base no seguinte conteúdo de um post do Instagram, sugira UM título de artigo de blog otimizado para SEO.

Conteúdo:
${content.substring(0, 2000)}

Responda APENAS com o título sugerido, sem aspas ou explicações.`
          }
        ],
      temperature: 0.7,
      maxTokens: 256,
    });

    if (!responseResult.success || !responseResult.data?.content) {
      return 'Conteúdo importado do Instagram';
    }

    const title = responseResult.data.content;
    return typeof title === 'string' ? title.trim() : 'Conteúdo importado do Instagram';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'Conteúdo importado do Instagram';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, images, caption, videoUrl }: ImportRequest = await req.json();

    let extractedContent = '';

    if (caption) {
      extractedContent = caption;
    } else if (images && images.length > 0) {
      const texts = await Promise.all(images.map(img => extractTextFromImage(img)));
      extractedContent = texts.filter(Boolean).join('\n\n---\n\n');
    } else if (videoUrl) {
      extractedContent = `Vídeo do Instagram: ${videoUrl}`;
    }

    if (!extractedContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum conteúdo para importar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestedTitle = await generateSuggestedTitle(extractedContent);

    return new Response(
      JSON.stringify({
        success: true,
        content: extractedContent,
        suggestedTitle,
        type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing Instagram content:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
