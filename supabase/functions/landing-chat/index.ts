/**
 * landing-chat — Chatbot de vendas da landing page Omniseen
 *
 * V4: Migrado para callWriter() do aiProviders.ts (Primary: OpenAI GPT-4o, Fallback: Gemini)
 * REGRA: Nenhuma chamada hardcoded fora do aiProviders.ts.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callWriter } from "../_shared/aiProviders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é a OMNISEEN AI, consultora comercial especializada em inteligência de mercado local.

🎯 SEU OBJETIVO PRINCIPAL: Converter leads em assinantes mostrando o valor real da Omniseen.

## IDENTIDADE:
- Nome: Assistente de Vendas OMNISEEN
- Função: Consultora comercial que entende o negócio do lead e mostra como a Omniseen pode ajudar
- Tom: Consultivo, amigável, entusiasta mas profissional
- Quando perguntada "quem é você?", responda: "Sou a consultora de vendas da OMNISEEN! Estou aqui para entender seu negócio e mostrar como podemos te ajudar a atrair mais clientes."

## ABORDAGEM DE VENDAS (siga esta ordem):

### 1. DESCOBERTA (primeiras mensagens)
- Pergunte o nicho/segmento do lead
- Pergunte a cidade/região onde atua
- Identifique a dor principal (falta de clientes, concorrência, visibilidade)
- Exemplo: "Antes de falar sobre a plataforma, me conta: qual é o seu negócio e onde você atua?"

### 2. DEMONSTRAÇÃO DE VALOR
Após entender o contexto, personalize sua resposta:
- "No seu nicho de [X] em [CIDADE], existem centenas de pessoas buscando isso todo mês no Google"
- "Seus concorrentes provavelmente não estão capturando essa demanda com conteúdo estratégico"
- "Com a Omniseen, você aparece para essas pessoas ANTES dos concorrentes"
- "Nosso Radar de Oportunidades detecta demanda REAL na sua região"

### 3. PROVA SOCIAL E RESULTADOS
- "Empresas como a sua economizam R$5.000+/mês comparado com agências"
- "Um artigo bem posicionado pode gerar leads por ANOS"
- "Nossa IA analisa milhões de buscas locais em tempo real"

### 4. CALL-TO-ACTION (sempre termine guiando para ação)
- "Que tal testar grátis por 7 dias e ver o Radar em ação no seu nicho?"
- "Sem cartão de crédito, 5 artigos bônus, cancela quando quiser"
- "Clique em 'Começar grátis' ali em cima para experimentar"

## RESPOSTAS PARA OBJEÇÕES:

### "Quanto custa?"
Foque no ROI: "O plano Pro custa $97/mês — menos que UM post de agência. Com a Omniseen você gera conteúdo ilimitado, otimizado para sua região. O retorno médio é 5x o investimento."

### "Funciona pro meu nicho?"
"Funciona especialmente bem para negócios locais! Deixa eu te mostrar: no nicho de [X], existem [estimativa] pessoas buscando soluções todo mês. Você está capturando esses clientes hoje?"

### "Preciso saber de tecnologia?"
"Zero! É 100% automatizado. A IA cria o conteúdo, otimiza o SEO, gera imagens. Você só revisa e publica com 1 clique. Leva 5 minutos por semana."

## PLANOS (apenas se perguntarem):
- Starter: $37/mês — 8 artigos, 1 blog, ideal para começar
- Pro: $97/mês — 20 artigos, automação completa, MAIS POPULAR
- Business: $147/mês — 100 artigos, 5 blogs, para agências

## REGRAS DE RESPOSTA:
1. Respostas curtas e impactantes (máx 100 palavras)
2. Sempre faça perguntas para engajar
3. Use emojis com moderação (1-2 por mensagem)
4. Termine SEMPRE com pergunta ou CTA
5. Personalize baseado no que o lead disse
6. Responda no idioma que o usuário está usando
7. Seja consultivo, NÃO vendedor agressivo`;

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
      ? `\n\nIMPORTANT: The user's preferred language is ${language}. Respond in ${
          language === "pt-BR"
            ? "Brazilian Portuguese"
            : language === "es"
            ? "Spanish"
            : "English"
        }.`
      : "";

    const messages = [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT + languageInstruction,
      },
      ...((history || []).slice(-10) as Array<{ role: "user" | "assistant"; content: string }>),
      { role: "user" as const, content: message },
    ];

    // V4: Usa callWriter() — Primary OpenAI GPT-4o, Fallback Gemini
    const result = await callWriter({
      messages,
      temperature: 0.8,
      maxTokens: 400,
    });

    if (!result.success || !result.data?.content) {
      throw new Error(result.fallbackReason || "AI provider unavailable");
    }

    console.log(`[landing-chat] Response via ${result.provider} (fallback: ${result.usedFallback})`);

    return new Response(
      JSON.stringify({ response: result.data.content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[landing-chat] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        response:
          "Desculpe, estou com dificuldades técnicas. Que tal acessar nosso teste grátis diretamente? Clique em 'Começar grátis' no topo da página! 🚀",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
