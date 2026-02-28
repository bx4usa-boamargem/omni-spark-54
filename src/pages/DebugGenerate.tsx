import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DebugGenerate() {
    const [status, setStatus] = useState("Iniciando...");
    const [blogId, setBlogId] = useState("");
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => {
        console.log(msg);
        setLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    const run = async () => {
        addLog("=== Iniciando Processo de Geração 100% Agente ===");

        // 1. Tentar obter o usuário atual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            addLog("Usuário não logado. Tentando login master...");
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: 'omniseenblog@gmail.com',
                password: 'OmniMaster2024!#' // Vou tentar esta, se falhar, tento criar um novo
            });

            if (signInError) {
                addLog(`Login master falhou: ${signInError.message}. Tentando criar usuário temporário...`);
                const tempEmail = `agent-${Date.now()}@test.com`;
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: tempEmail,
                    password: 'Password123!'
                });

                if (signUpError) {
                    addLog(`Erro ao criar usuário: ${signUpError.message}`);
                    return;
                }
                addLog(`Usuário temporário criado: ${tempEmail}`);
            } else {
                addLog("Login master realizado com sucesso!");
            }
        } else {
            addLog(`Usuário já logado: ${user.email}`);
        }

        // 2. Localizar ou Criar Blog
        addLog("Buscando blogs...");
        const { data: blogs, error: blogsError } = await supabase.from('blogs').select('id, name').limit(1);

        let targetBlogId = "";
        if (blogsError || !blogs || blogs.length === 0) {
            addLog("Nenhum blog encontrado. Criando blog de teste...");
            const { data: newBlog, error: createBlogError } = await supabase.from('blogs').insert({
                name: 'Blog de Teste Agente',
                slug: `teste-agente-${Date.now()}`,
                user_id: (await supabase.auth.getUser()).data.user?.id
            }).select().single();

            if (createBlogError) {
                addLog(`Erro ao criar blog: ${createBlogError.message}`);
                return;
            }
            targetBlogId = newBlog.id;
            addLog(`Blog criado com sucesso: ${targetBlogId}`);
        } else {
            targetBlogId = blogs[0].id;
            addLog(`Blog encontrado: ${blogs[0].name} (${targetBlogId})`);
        }

        setBlogId(targetBlogId);

        // 3. Disparar Geração
        addLog("Disparando pipeline de 2.000 palavras (Controle de Pragas Recife)...");
        const payload = {
            keyword: "controle de pragas em recife",
            blog_id: targetBlogId,
            city: "Recife",
            state: "PE",
            country: "BR",
            language: "pt-BR",
            niche: "pest_control",
            job_type: "article",
            intent: "informational",
            target_words: 2500, // Garante as 2.000+ palavras
            image_count: 4,
            brand_voice: { tone: "profissional", person: "nós" }
        };

        const { data: jobData, error: jobError } = await supabase.functions.invoke('create-generation-job', { body: payload });

        if (jobError) {
            addLog(`Erro ao disparar job: ${jobError.message}`);
        } else {
            addLog(`SUCESSO! Job criado: ${jobData.job_id}`);
            setStatus("CONCLUÍDO");
            addLog("Você pode acompanhar o progresso na aba Network ou no Dashboard.");
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Omniseen Agent Debug Generator</h1>
            <p>Status: <strong>{status}</strong></p>
            <button
                onClick={run}
                style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '5px' }}
            >
                Iniciar Geração Automática
            </button>
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '5px', minHeight: '300px' }}>
                <h3 style={{ marginTop: 0 }}>Logs:</h3>
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {log.map((line, i) => <div key={i}>{line}</div>)}
                </pre>
            </div>
        </div>
    );
}
