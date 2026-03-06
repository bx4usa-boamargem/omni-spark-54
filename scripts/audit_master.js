import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não está definida no ambiente.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BLOG_ID = '44c4f7cd-05b0-4229-9828-2eb822d38bfd';
const CLUSTER_ID = '941159f4-8ff8-4c70-b39f-8eec0b453c45';

async function runAudit() {
    console.log('--- 📊 AUDITORIA OMNISEEN V3: BIONE ADVOCACIA ---');

    // 1. Audit Blogs
    const { data: blogs } = await supabase.from('blogs').select('id, slug, platform_subdomain').eq('id', BLOG_ID);
    console.log('\n[BLOGS]', blogs?.length ? blogs : '❌ MISSING');

    // 2. Audit Articles
    const { data: articles } = await supabase.from('articles').select('id, slug, title, status').eq('blog_id', BLOG_ID);
    console.log('\n[ARTICLES] (Esperado: 6)', articles?.length ? `Encontrados: ${articles.length}` : '❌ MISSING');
    if (articles) console.table(articles);

    // 3. Audit Clusters
    const { data: clusters } = await supabase.from('content_clusters').select('id, name').eq('id', CLUSTER_ID);
    console.log('\n[CLUSTERS]', clusters?.length ? clusters : '❌ MISSING');

    // 4. Audit Storage 
    const { data: files } = await supabase.storage.from('article-images').list(BLOG_ID);
    console.log('\n[STORAGE] Arquivos no bucket article-images (Esperado: Múltiplos):', files?.length || 0);
    if (files) console.table(files.map(f => ({ name: f.name, size: f.metadata?.size })));

    console.log('\n✅ Auditoria Completa.');
}

runAudit().catch(console.error);
