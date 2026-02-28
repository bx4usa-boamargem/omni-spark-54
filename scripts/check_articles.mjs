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
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function check() {
    console.log("=== Verificando Bancos ===");
    try {
        const tenantsRes = await fetch(`${supabaseUrl}/rest/v1/tenants?select=id,name,slug`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const tenants = await tenantsRes.json();
        console.log(`Encontrados ${tenants?.length || 0} tenants:`, JSON.stringify(tenants, null, 2));

        const blogsRes = await fetch(`${supabaseUrl}/rest/v1/blogs?select=id,name,tenant_id`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const blogs = await blogsRes.json();
        console.log(`Encontrados ${blogs?.length || 0} blogs:`, JSON.stringify(blogs, null, 2));

    } catch (err) {
        console.error("Erro na leitura:", err);
    }
}

check();
