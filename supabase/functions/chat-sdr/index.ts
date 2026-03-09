import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import OpenAI from "https://esm.sh/openai@4.52.0";

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
        const openaiKey = Deno.env.get("OPENAI_API_KEY");

        if (!openaiKey) {
            throw new Error("Missing OPENAI_API_KEY");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Context resolution (optional extra business data could be fetched here based on articleId)
        // For now we will construct the base SDR identity using the title.
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

        const openai = new OpenAI({ apiKey: openaiKey });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost efficient for chat
            messages: [
                { role: "system", content: systemPrompt },
                ...messages.map((m: any) => ({
                    role: m.role || "user",
                    content: m.content || "",
                })),
            ],
            temperature: 0.7,
            max_tokens: 250, // Keep responses short and agile
            stream: false, // For simplicity in MVP we use non-streaming or full duplex depending on frontend. Let's do non-streaming for now.
        });

        const aiMessage = response.choices?.[0]?.message?.content || "No response";

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
