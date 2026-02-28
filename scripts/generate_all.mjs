import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        env[match[1]] = val;
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function run() {
    console.log("=== Login como Master ===");
    try {
        const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'omniseenblog@gmail.com',
                password: 'OmniMaster2024!#'
            })
        });
        const authData = await authRes.json();
        if (authData.error) {
            console.error("Erro no login:", authData.error_description || authData.error);
            return;
        }
        const token = authData.access_token;
        console.log("Login com sucesso, buscando blogs...");

        const blogsRes = await fetch(`${supabaseUrl}/rest/v1/blogs?select=id,name,tenant_id`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${token}`
            }
        });
        const blogs = await blogsRes.json();
        console.log(`Encontrados ${blogs.length || 0} blogs:`, JSON.stringify(blogs, null, 2));

        if (blogs.length === 0) {
            console.log("Nenhum blog encontrado para este usuário.");
            return;
        }

        console.log("=== Disparando Geração ===");
        for (const blog of blogs) {
            console.log(`Disparando para o blog: ${blog.name} (${blog.id})`);
            const payload = {
                keyword: "controle de pragas em são luís do maranhão",
                blog_id: blog.id,
                city: "São Luís",
                state: "MA",
                country: "BR",
                language: "pt-BR",
                niche: "pest_control",
                job_type: "article",
                intent: "informational",
                target_words: 2000,
                image_count: 4,
                brand_voice: { tone: "profissional", person: "nós" }
            };

            const jobRes = await fetch(`${supabaseUrl}/functions/v1/create-generation-job`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!jobRes.ok) {
                const errText = await jobRes.text();
                console.error(`Erro ao disparar para ${blog.name}:`, errText);
            } else {
                const jobData = await jobRes.json();
                console.log(`Sucesso para ${blog.name}. Response:`, jobData);
            }
        }

    } catch (err) {
        console.error("Erro na leitura:", err);
    }
}

run();
