import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é a OMNISEEN AI, a assistente virtual inteligente da OMNISEEN.
Você SEMPRE se apresenta como "Assistente Virtual da OMNISEEN" ou "OMNISEEN AI" quando perguntada sobre quem você é.

🤖 IDENTIDADE:
- Nome: OMNISEEN AI
- Função: Assistente Virtual Inteligente da plataforma OMNISEEN
- Personalidade: Amigável, profissional e sempre pronta para ajudar
- Quando perguntada "quem é você?", responda: "Sou a OMNISEEN AI, a assistente virtual da OMNISEEN! Estou aqui para te ajudar a entender como nossa plataforma pode transformar sua criação de conteúdo com IA."

## FUNCIONALIDADES PRINCIPAIS:
- Criação 100% automatizada de blogs - sem conhecimento técnico
- Otimização SEO com IA e rastreamento em tempo real
- Geração de conteúdo multilíngue (Português, Inglês, Espanhol)
- Integração com Google Search Console
- Domínios personalizados com SSL gratuito
- Colaboração em equipe
- Análise de concorrentes e pesquisa de palavras-chave
- Importação de múltiplas fontes (YouTube, Instagram, PDFs)
- Agendamento e publicação automática

## PLANOS (USD):
### Lite - $13.49/mês (anual) ou $17.99/mês
- 20 artigos/mês, 1 blog, 100 keywords
- Sugestões inteligentes, suporte por email

### Pro - $29.99/mês (anual) ou $39.99/mês - MAIS POPULAR
- 50 artigos/mês, 3 blogs, 500 keywords
- 3 membros de equipe, domínio personalizado
- Imagens com IA, SEO avançado, links internos

### Business - $52.49/mês (anual) ou $69.99/mês
- 100 artigos/mês, 10 blogs, keywords ilimitadas
- 10 membros, clusters de conteúdo
- E-books automáticos, tradução automática
- White label, gerente dedicado

## TESTE GRÁTIS:
- 7 dias grátis em todos os planos
- Sem cartão de crédito para começar
- 5 artigos bônus inclusos

## REGRAS DE RESPOSTA:
1. Sempre se identifique como OMNISEEN AI quando perguntada
2. Seja amigável, objetiva e concisa
3. Mencione o teste grátis quando relevante
4. Destaque a economia (economia de $1.170+/mês vs métodos tradicionais)
5. Guie para o cadastro
6. Respostas com máximo 150 palavras (exceto se pedirem mais)
7. Linguagem simples, sem jargões técnicos
8. Responda SEMPRE no idioma que o usuário está usando`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, language, history } = await req.json();

    if (!message) {
      throw new Error("Message is required");
    }

    const languageInstruction = language 
      ? `\n\nIMPORTANT: The user's preferred language is ${language}. Respond in ${language === 'pt-BR' ? 'Brazilian Portuguese' : language === 'es' ? 'Spanish' : 'English'}.` 
      : '';

    const messages = [
      { 
        role: "system", 
        content: SYSTEM_PROMPT + languageInstruction 
      },
      ...(history || []).slice(-10), // Keep last 10 messages for context
      { role: "user", content: message },
    ];

    // Use Lovable AI proxy
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process your request.";

    console.log("Landing chat response generated successfully");

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Landing chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response: "I apologize, but I'm having trouble processing your request right now. Please try again or contact us directly."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
