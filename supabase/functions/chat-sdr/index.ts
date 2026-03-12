// V4: Migrado de OpenAI SDK hardcoded → callWriter() do aiProviders.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callWriter } from "../_shared/aiProviders.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { messages, articleTitle } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            throw new Error("Missing or invalid messages array");
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const systemPrompt = `Você é um SDR (Sales Development Representative) ágil, persuasivo e altamente focado na qualificação de leads MQL. 
Seu objetivo é transformar visitantes do nosso blog em clientes potenciais (leads).
Mantenha respostas curtas e humanas.

O usuário está acessando um artigo/página com o tema: ${articleTitle || 'Serviço Profissional'}.

**Roteiro BANT Resumido (Sua Missão):**
1. Cumprimente e se mostre pronto para tirar a dúvida sobre o conteúdo.
2. Identifique rapidamente uma "dor" ou interesse de compra do usuário (Ex: "Como podemos aplicar isso na sua realidade?").
3. Logo que a oportunidade aparecer, peça os dados vitais para "repassar a um especialista nosso que tem exatamente a solução". Peça NOME e WHATSAPP.
4. Após o usuário passar os contatos, confirme que recebeu, diga que entrarão em contato muito em breve e encerre a persuasão.

NUNCA dê a impressão de ser uma "IA estúpida de atendimento longo". Seja proativo na venda.`;

        const aiResult = await callWriter({
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map((m: { role?: string; content?: string }) => ({
                    role: (m.role || 'user') as 'user' | 'assistant' | 'system',
                    content: m.content || '',
                })),
            ],
            temperature: 0.7,
            maxTokens: 250,
        });

        if (!aiResult.success || !aiResult.data?.content) {
            throw new Error(aiResult.fallbackReason || 'AI provider unavailable');
        }

        const aiMessage = aiResult.data.content;

        return new Response(JSON.stringify({ reply: aiMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: unknown) {
        console.error("Chat SDR pipeline error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
    }
});
