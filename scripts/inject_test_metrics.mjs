import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ ERRO: SUPABASE_SERVICE_ROLE_KEY ou VITE_SUPABASE_URL não está definida no ambiente.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BLOG_ID = '44c4f7cd-05b0-4229-9828-2eb822d38bfd'; // Using Bione Advocacia as standard test blog

async function runMockInjection() {
    console.log('--- 💉 INJETANDO DADOS DE TESTE NO DASHBOARD ---');

    console.log('1. Atualizando View Counts dos Articles...');
    // Fetch some articles to update their views
    const { data: articles } = await supabase.from('articles').select('id, title').eq('blog_id', BLOG_ID).limit(5);

    if (articles && articles.length > 0) {
        for (let i = 0; i < articles.length; i++) {
            const mockViews = Math.floor(Math.random() * 500) + 1500; // Between 1500 and 2000 views
            await supabase.from('articles').update({ view_count: mockViews }).eq('id', articles[i].id);
            console.log(`✅ Artigo "${articles[i].title}" atualizado para ${mockViews} views.`);
        }
    } else {
        console.log('⚠️ Nenhum artigo encontrado. Visitas ficarão zeradas.');
    }

    console.log('\n2. Inserindo Cliques de CTA falsos na real_leads...');
    // Insert CTA clicks (whatsapp_click, phone_click)
    const today = new Date();

    const clickData = [];
    for (let c = 0; c < 48; c++) {
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - (Math.random() * 10000)); // Spread over last ~7 days
        clickData.push({
            blog_id: BLOG_ID,
            lead_type: c % 2 === 0 ? 'whatsapp_click' : 'phone_click',
            created_at: pastDate.toISOString(),
            metadata: { source: 'dashboard_mock_test' }
        });
    }

    const { error: clickErr } = await supabase.from('real_leads').insert(clickData);
    if (!clickErr) console.log(`✅ ${clickData.length} cliques de CTA inseridos.`);
    else console.error('❌ Erro inserir clicks:', clickErr);


    console.log('\n3. Inserindo Leads Reais falsos (form_submit) na real_leads...');
    // Insert Real Leads
    const leadData = [];
    for (let l = 0; l < 12; l++) {
        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - (Math.random() * 160)); // Spread over last ~7 days
        leadData.push({
            blog_id: BLOG_ID,
            lead_type: 'form_submit',
            created_at: pastDate.toISOString(),
            metadata: { name: `Lead ${l}`, phone: '551199999999', email: `lead${l}@test.com` }
        });
    }

    const { error: leadErr } = await supabase.from('real_leads').insert(leadData);
    if (!leadErr) console.log(`✅ ${leadData.length} Leads Reais (form_submit) inseridos.`);
    else console.error('❌ Erro inserir leads:', leadErr);

    console.log('\n🌟 DADOS INJETADOS COM SUCESSO! Recarregue a página do Dashboard.');
}

runMockInjection().catch(console.error);
