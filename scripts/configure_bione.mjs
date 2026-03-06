import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oxbrvyinmpbkllicaxqk.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YnJ2eWlubXBia2xsaWNheHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjYwMTMsImV4cCI6MjA4NzAwMjAxM30.ZLvQlsid_xhhMvRUB_kgsjBupl7WoTd8haPhdv8_Du0';
const BLOG_ID = '8c39cb55-783f-426b-97a2-7e65d14c32b8';

const sb = createClient(SUPABASE_URL, ANON);

const auth = await sb.auth.signInWithPassword({
    email: 'operador@bioneadvocacia.com.br',
    password: 'BioneAdv2026!'
});

if (!auth.data?.session) {
    console.error('AUTH FAIL:', auth.error?.message);
    process.exit(1);
}

const token = auth.data.session.access_token;
console.log('AUTH OK user:', auth.data.user.id);

const sbUser = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: 'Bearer ' + token } }
});

// Atualizar o blog para configurar como bione-advocacia
const blogUpdate = await sbUser.from('blogs').update({
    name: 'Bione Advocacia',
    slug: 'bione-advocacia',
    description: 'Escritório de Direito Previdenciário em São Luís, Maranhão. OAB ativa.',
    primary_color: '#1e3a5f',
    secondary_color: '#b8922a',
    cta_type: 'whatsapp',
    cta_text: 'Consulta gratuita',
    author_name: 'Bione Advocacia',
    platform_subdomain: 'bione-advocacia',
    brand_description: 'Escritório de advocacia especializado exclusivamente em Direito Previdenciário com OAB ativa na Seccional Maranhão.',
    footer_text: '2026 Bione Advocacia - Direito Previdenciario em Sao Luis, MA',
    show_powered_by: false,
    banner_enabled: true,
    banner_title: 'Direito Previdenciário em São Luís',
    banner_description: 'Benefício negado pelo INSS? Analisamos seu caso gratuitamente. OAB ativa.'
}).eq('id', BLOG_ID).select('id, slug, name');

console.log('BLOG UPDATE:', JSON.stringify(blogUpdate.data), 'ERR:', blogUpdate.error?.message);

// Inserir artigos
const articles = [
    {
        blog_id: BLOG_ID,
        title: 'Aposentadoria por Invalidez em Sao Luis: tudo que voce precisa saber para garantir seu direito em 2026',
        slug: 'aposentadoria-por-invalidez-em-sao-luis',
        content: `<h1>Aposentadoria por Invalidez em Sao Luis</h1>
<p>A aposentadoria por invalidez e um beneficio previdenciario concedido ao segurado do INSS que, apos pericia medica, for declarado incapaz permanentemente de exercer atividade laboral. Em Sao Luis, MA, a Bione Advocacia atende nos JEFs e Varas Federais para garantir esse direito.</p>
<h2>Requisitos</h2>
<ul><li>Qualidade de segurado ativa</li><li>Carencia minima de 12 meses (salvo acidente ou doencas listadas em lei)</li><li>Incapacidade permanente comprovada em pericia medica do INSS</li></ul>
<h2>Quanto vale?</h2>
<p>100% do salario de beneficio, nunca inferior ao salario minimo (R$ 1.518 em 2026).</p>
<h2>Consulta Gratuita</h2>
<p>Entre em contato com a Bione Advocacia pelo WhatsApp para analise gratuita do seu caso. OAB ativa na Seccional Maranhao.</p>`,
        excerpt: 'Saiba como funciona a aposentadoria por invalidez em Sao Luis, quais sao os requisitos e como a Bione Advocacia pode garantir seu direito. Consulta gratuita.',
        category: 'Direito Previdenciário',
        status: 'published',
        published_at: new Date().toISOString(),
        reading_time: 12
    },
    {
        blog_id: BLOG_ID,
        title: 'Auxilio-Doenca em Sao Luis: Como Pedir e o que Fazer se Negado',
        slug: 'auxilio-doenca-em-sao-luis',
        content: `<h1>Auxilio-Doenca em Sao Luis</h1>
<p>O auxilio-doenca e concedido ao segurado do INSS temporariamente incapaz de trabalhar. Se o INSS negar, a Bione Advocacia pode recorrer nos JEFs em Sao Luis.</p>
<h2>Como pedir</h2>
<p>Solicite pelo aplicativo Meu INSS, pelo telefone 135 ou pessoalmente. Leve laudos medicos e documentacao completa.</p>
<h2>INSS Negou?</h2>
<p>Nao desista. A Bione Advocacia avalia seu caso gratuitamente e pode entrar com recurso ou acao judicial nos JEFs de Sao Luis.</p>`,
        excerpt: 'Saiba como pedir o auxilio-doenca em Sao Luis e o que fazer quando o INSS nega.',
        category: 'Direito Previdenciário',
        status: 'published',
        published_at: new Date().toISOString(),
        reading_time: 8
    },
    {
        blog_id: BLOG_ID,
        title: 'Beneficio Negado pelo INSS em Sao Luis: Como Reverter a Decisao',
        slug: 'beneficio-negado-inss-sao-luis',
        content: `<h1>Beneficio Negado pelo INSS em Sao Luis</h1>
<p>Se o INSS negou seu beneficio em Sao Luis, voce pode recorrer administrativamente (CRPS) ou judicialmente nos JEFs. A Bione Advocacia analisa seu caso gratuitamente.</p>
<h2>Motivos de negativa</h2>
<ul><li>Carencia nao cumprida</li><li>Qualidade de segurado perdida</li><li>Pericia medica desfavoravel</li><li>Documentacao incompleta</li></ul>`,
        excerpt: 'Beneficio negado pelo INSS em Sao Luis? Saiba como recorrer e quando acionar a Justica Federal.',
        category: 'Direito Previdenciário',
        status: 'published',
        published_at: new Date().toISOString(),
        reading_time: 8
    },
    {
        blog_id: BLOG_ID,
        title: 'Pericia Medica do INSS em Sao Luis: Como Funciona e Como se Preparar',
        slug: 'pericia-medica-inss-sao-luis',
        content: `<h1>Pericia Medica do INSS em Sao Luis</h1>
<p>A pericia medica do INSS e etapa obrigatoria para beneficios por incapacidade. A Bione Advocacia pode indicar um perito assistente para te acompanhar em Sao Luis.</p>
<h2>Perito Assistente</h2>
<p>Voce tem direito de levar um medico de sua confianca. A Bione Advocacia pode indicar um profissional para te acompanhar na pericia.</p>`,
        excerpt: 'Saiba como funciona a pericia medica do INSS em Sao Luis e como se preparar para ela.',
        category: 'Direito Previdenciário',
        status: 'published',
        published_at: new Date().toISOString(),
        reading_time: 9
    },
    {
        blog_id: BLOG_ID,
        title: 'Revisao de Beneficio Previdenciario em Sao Luis: Quando Vale a Pena',
        slug: 'revisao-beneficio-previdenciario-sao-luis',
        content: `<h1>Revisao de Beneficio Previdenciario em Sao Luis</h1>
<p>Muitos segurados do INSS em Sao Luis tem beneficios calculados a menor. A revisao pode resultar em aumento do valor mensal e pagamento de retroativos em ate 5 anos.</p>
<h2>Prazo</h2><p>10 anos da concessao (prazo decadencial). Retroativos prescrevem em 5 anos.</p>`,
        excerpt: 'Saiba quando revisar seu beneficio do INSS em Sao Luis para receber o que e seu por direito.',
        category: 'Direito Previdenciário',
        status: 'published',
        published_at: new Date().toISOString(),
        reading_time: 8
    },
    {
        blog_id: BLOG_ID,
        title: 'Advogado Previdenciario em Sao Luis: Quando Contratar e Como Funciona',
        slug: 'advogado-previdenciario-sao-luis',
        content: `<h1>Advogado Previdenciario em Sao Luis</h1>
<p>Um advogado previdenciario especializado em Sao Luis pode aumentar suas chances de aprovacao do beneficio em ate 70%. A Bione Advocacia atua com honorario de exito - voce so paga se ganhar.</p>
<h2>Honorario de Exito</h2><p>Na Bione Advocacia, voce so paga se ganhar. O honorario e debitado dos retroativos devidos pelo INSS, sem custo antecipado.</p>`,
        excerpt: 'Descubra quando contratar um advogado previdenciario em Sao Luis e como funciona o honorario de exito.',
        category: 'Direito Previdenciário',
        status: 'published',
        published_at: new Date().toISOString(),
        reading_time: 8
    }
];

const artsInsert = await sbUser.from('articles').insert(articles).select('id, slug, status');
console.log('ARTICLES INSERT count:', artsInsert.data?.length, 'ERR:', artsInsert.error?.message);

// Verificacao final
const blogFinal = await sbUser.from('blogs').select('id, slug, name').eq('id', BLOG_ID).single();
const artsFinal = await sbUser.from('articles').select('id, slug, status').eq('blog_id', BLOG_ID).eq('status', 'published');

console.log('\n=== RESULTADO FINAL ===');
console.log('BLOG:', JSON.stringify(blogFinal.data));
console.log('ARTIGOS PUBLISHED:', artsFinal.data?.length);

// Verificar acesso anon (public)
const sbAnon = createClient(SUPABASE_URL, ANON);
const blogAnon = await sbAnon.from('blogs').select('id, slug').eq('slug', 'bione-advocacia').single();
const artsAnon = await sbAnon.from('articles').select('count').eq('blog_id', BLOG_ID).eq('status', 'published');

console.log('BLOG via ANON:', JSON.stringify(blogAnon.data), 'ERR:', blogAnon.error?.message);
console.log('ARTS via ANON count:', artsAnon.data?.length, 'ERR:', artsAnon.error?.message);

if (blogAnon.data && !blogAnon.error) {
    console.log('\nSUCCESS_STATE = TRUE');
} else {
    console.log('\nSUCCESS_STATE = PARTIAL');
    console.log('Blog inserido mas necessita policy RLS publica.');
    console.log('Execute no Supabase Studio:');
    console.log('CREATE POLICY "Public" ON public.blogs FOR SELECT USING (true);');
    console.log('CREATE POLICY "Public arts" ON public.articles FOR SELECT USING (status = \'published\');');
}
