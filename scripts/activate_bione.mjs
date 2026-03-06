import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oxbrvyinmpbkllicaxqk.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YnJ2eWlubXBia2xsaWNheHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjYwMTMsImV4cCI6MjA4NzAwMjAxM30.ZLvQlsid_xhhMvRUB_kgsjBupl7WoTd8haPhdv8_Du0';

const BLOG_ID = '44c4f7cd-05b0-4229-9828-2eb822d38bfd';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
    console.log('=== FINAL_DATABASE_ACTIVATION ===');
    console.log('Tenant: Bione Advocacia\n');

    // PASSO 1: Tentar autenticar como operador
    console.log('[1/5] Autenticando como operador...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'operador@bioneadvocacia.com.br',
        password: 'BioneAdv2026!'
    });

    if (authError || !authData.session) {
        console.error('❌ Auth falhou:', authError?.message || 'sem sessão');
        console.log('\n[INFO] Tentando signup do operador...');

        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: 'operador@bioneadvocacia.com.br',
            password: 'BioneAdv2026!',
            options: {
                data: {
                    full_name: 'Operador Bione Advocacia',
                    blog_id: BLOG_ID,
                    role: 'owner'
                }
            }
        });

        if (signupError) {
            console.error('❌ Signup falhou:', signupError.message);
        } else {
            console.log('✅ Signup OK:', signupData.user?.id);
        }
    } else {
        console.log('✅ Auth OK! Usuario:', authData.user?.id);
    }

    // PASSO 2: Verificar blog existente
    console.log('\n[2/5] Verificando blog no banco...');
    const { data: blogCheck, error: blogCheckErr } = await supabase
        .from('blogs')
        .select('id, name, slug')
        .eq('id', BLOG_ID)
        .single();

    console.log('BLOG CHECK:', JSON.stringify(blogCheck), 'ERR:', blogCheckErr?.message);

    // PASSO 3: Upsert blog
    console.log('\n[3/5] Upsert do blog...');
    const { data: blogUpsert, error: blogUpsertErr } = await supabase
        .from('blogs')
        .upsert({
            id: BLOG_ID,
            name: 'Bione Advocacia',
            slug: 'bione-advocacia',
            description: 'Escritório de Direito Previdenciário em São Luís, Maranhão. OAB ativa.',
            primary_color: '#1e3a5f',
            secondary_color: '#b8922a',
            cta_type: 'whatsapp',
            cta_text: 'Consulta gratuita',
            author_name: 'Bione Advocacia',
            author_bio: 'Especialistas em Direito Previdenciário em São Luís, MA. OAB ativa.',
            platform_subdomain: 'bione-advocacia',
            onboarding_completed: true,
            brand_description: 'Escritório especializado exclusivamente em Direito Previdenciário com OAB ativa na Seccional Maranhão.',
            footer_text: '© 2026 Bione Advocacia — Direito Previdenciário em São Luís, MA',
            show_powered_by: false
        }, { onConflict: 'id' })
        .select('id, slug');

    console.log('BLOG UPSERT:', JSON.stringify(blogUpsert), 'ERR:', blogUpsertErr?.message);

    // PASSO 4: Upsert artigos
    console.log('\n[4/5] Upserting artigos com status published...');
    const articles = [
        {
            id: '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679',
            blog_id: BLOG_ID,
            title: 'Aposentadoria por Invalidez em São Luís: tudo o que você precisa saber para garantir seu direito em 2026',
            slug: 'aposentadoria-por-invalidez-em-sao-luis',
            content: '<h1>Aposentadoria por Invalidez em São Luís</h1><p>A aposentadoria por invalidez é um benefício previdenciário concedido ao segurado do INSS que, após perícia médica, for declarado incapaz permanentemente de exercer atividade laboral. Em São Luís, MA, a Bione Advocacia atende nos JEFs e Varas Federais para garantir esse direito.</p><h2>Requisitos</h2><ul><li>Qualidade de segurado ativa</li><li>Carência mínima de 12 meses</li><li>Incapacidade permanente comprovada em perícia médica do INSS</li></ul>',
            excerpt: 'Saiba como funciona a aposentadoria por invalidez em São Luís, quais são os requisitos e como a Bione Advocacia pode garantir seu direito.',
            category: 'Direito Previdenciário',
            status: 'published',
            published_at: new Date().toISOString(),
            reading_time: 12
        },
        {
            id: 'dbe957ec-5d3d-409a-b585-7cc0e2474139',
            blog_id: BLOG_ID,
            title: 'Auxílio-Doença em São Luís: Como Pedir, Requisitos e o que Fazer se Negado',
            slug: 'auxilio-doenca-em-sao-luis',
            content: '<h1>Auxílio-Doença em São Luís</h1><p>O auxílio-doença (benefício B31 ou B91) é concedido ao segurado do INSS temporariamente incapaz de trabalhar. Se o INSS negar, a Bione Advocacia pode recorrer administrativamente ou judicialmente nos JEFs em São Luís.</p>',
            excerpt: 'Saiba como pedir o auxílio-doença em São Luís e o que fazer quando o INSS nega.',
            category: 'Direito Previdenciário',
            status: 'published',
            published_at: new Date().toISOString(),
            reading_time: 8
        },
        {
            id: '2256d1ee-2ed0-492c-a57a-c19ed911983e',
            blog_id: BLOG_ID,
            title: 'Benefício Negado pelo INSS em São Luís: Como Reverter a Decisão',
            slug: 'beneficio-negado-inss-sao-luis',
            content: '<h1>Benefício Negado pelo INSS em São Luís</h1><p>Se o INSS negou seu benefício em São Luís, você pode recorrer administrativamente (CRPS) ou judicialmente nos JEFs. A Bione Advocacia analisa seu caso gratuitamente.</p>',
            excerpt: 'Benefício negado pelo INSS em São Luís? Saiba como recorrer e quando acionar a Justiça Federal.',
            category: 'Direito Previdenciário',
            status: 'published',
            published_at: new Date().toISOString(),
            reading_time: 8
        },
        {
            id: 'c50e0ed1-aa46-430e-8afe-130b74217f25',
            blog_id: BLOG_ID,
            title: 'Perícia Médica do INSS em São Luís: Como Funciona e Como se Preparar',
            slug: 'pericia-medica-inss-sao-luis',
            content: '<h1>Perícia Médica do INSS em São Luís</h1><p>A perícia médica do INSS é etapa obrigatória para concessão de benefícios por incapacidade. A Bione Advocacia pode indicar um perito assistente para te acompanhar.</p>',
            excerpt: 'Saiba como funciona a perícia médica do INSS em São Luís e como se preparar para ela.',
            category: 'Direito Previdenciário',
            status: 'published',
            published_at: new Date().toISOString(),
            reading_time: 9
        },
        {
            id: '64a0ac9d-3030-4686-a4ad-dd19d61d9eef',
            blog_id: BLOG_ID,
            title: 'Revisão de Benefício Previdenciário em São Luís: Quando Vale a Pena',
            slug: 'revisao-beneficio-previdenciario-sao-luis',
            content: '<h1>Revisão de Benefício Previdenciário em São Luís</h1><p>Muitos segurados do INSS em São Luís têm benefícios calculados a menor. A revisão pode resultar em aumento do valor mensal e pagamento de retroativos em até 5 anos.</p>',
            excerpt: 'Saiba quando e como revisar seu benefício do INSS em São Luís para receber o que é seu por direito.',
            category: 'Direito Previdenciário',
            status: 'published',
            published_at: new Date().toISOString(),
            reading_time: 8
        },
        {
            id: '0943fa2a-6396-4192-83ae-5eaa151bce78',
            blog_id: BLOG_ID,
            title: 'Advogado Previdenciário em São Luís: Quando Contratar e Como Funciona',
            slug: 'advogado-previdenciario-sao-luis',
            content: '<h1>Advogado Previdenciário em São Luís</h1><p>Um advogado previdenciário especializado em São Luís pode aumentar suas chances de aprovação do benefício em até 70%. A Bione Advocacia atua com honorário de êxito — você só paga se ganhar.</p>',
            excerpt: 'Descubra quando contratar um advogado previdenciário em São Luís e como funciona o honorário de êxito.',
            category: 'Direito Previdenciário',
            status: 'published',
            published_at: new Date().toISOString(),
            reading_time: 8
        }
    ];

    const { data: artUpsert, error: artErr } = await supabase
        .from('articles')
        .upsert(articles, { onConflict: 'id' })
        .select('id, slug, status');

    console.log('ARTICLES UPSERT:', JSON.stringify(artUpsert), 'ERR:', artErr?.message);

    // PASSO 5: Verificação final
    console.log('\n[5/5] Verificação final...');
    const { data: finalBlogs } = await supabase.from('blogs').select('id, slug').eq('slug', 'bione-advocacia');
    const { data: finalArts } = await supabase.from('articles').select('id, slug, status').eq('blog_id', BLOG_ID);

    console.log('\n=== RESULTADO FINAL ===');
    console.log('BLOG:', JSON.stringify(finalBlogs));
    console.log('ARTICLES COUNT:', finalArts?.length || 0);
    console.log('ARTICLES PUBLISHED:', finalArts?.filter(a => a.status === 'published').length || 0);

    if (finalBlogs?.length > 0 && (finalArts?.filter(a => a.status === 'published').length || 0) >= 6) {
        console.log('\n✅ SUCCESS_STATE = TRUE');
        console.log('Blog público ativo. Artigos publicados.');
    } else {
        console.log('\n⚠️  SUCCESS_STATE = PARTIAL');
        console.log('Dados inseridos mas RLS pode estar bloqueando leitura pública.');
        console.log('Execute o SQL de policy RLS no Supabase Studio.');
    }
}

main().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
