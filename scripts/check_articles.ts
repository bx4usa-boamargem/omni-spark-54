import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("=== Verificando Bancos ===");

    // 1. Listar Tenants
    const { data: tenants, error: tErr } = await supabase.from('tenants').select('id, name, slug');
    if (tErr) console.error("Erro Tenants:", tErr.message);
    else console.log(`Encontrados ${tenants?.length || 0} tenants:`, JSON.stringify(tenants, null, 2));

    // 2. Listar Blogs
    const { data: blogs, error: bErr } = await supabase.from('blogs').select('id, name, tenant_id');
    if (bErr) console.error("Erro Blogs:", bErr.message);
    else console.log(`Encontrados ${blogs?.length || 0} blogs:`, JSON.stringify(blogs, null, 2));

    // 3. Listar Artigos Recentes
    const { data: articles, error: aErr } = await supabase.from('articles').select('id, title, status, blog_id').order('created_at', { ascending: false }).limit(5);
    if (aErr) console.error("Erro Artigos:", aErr.message);
    else {
        console.log(`Artigos recentes:`);
        console.log(JSON.stringify(articles, null, 2));
    }
}

check();
