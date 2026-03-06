import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const BLOG_ID = '44c4f7cd-05b0-4229-9828-2eb822d38bfd';

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Usar service_role para bypass de RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const log: string[] = [];

        // 1. UPSERT BLOG
        log.push('[1] Upsert blog bione-advocacia...');
        const { data: blog, error: blogErr } = await supabaseAdmin
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
                author_bio: 'Especialistas em Direito Previdenciário em São Luís, MA. OAB ativa. Consulta gratuita.',
                platform_subdomain: 'bione-advocacia',
                onboarding_completed: true,
                brand_description: 'Escritório de advocacia especializado exclusivamente em Direito Previdenciário com OAB ativa na Seccional Maranhão.',
                footer_text: '© 2026 Bione Advocacia — Direito Previdenciário em São Luís, MA',
                show_powered_by: false,
                banner_enabled: true,
                banner_title: 'Direito Previdenciário em São Luís',
                banner_description: 'Benefício negado pelo INSS? A Bione Advocacia analisa seu caso gratuitamente. OAB ativa.',
            }, { onConflict: 'id' })
            .select('id, slug');

        if (blogErr) log.push(`  ERRO: ${blogErr.message}`);
        else log.push(`  OK: ${JSON.stringify(blog)}`);

        // 2. UPSERT ARTIGOS
        log.push('[2] Upsert artigos com status=published...');
        const articles = [
            {
                id: '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679',
                blog_id: BLOG_ID,
                title: 'Aposentadoria por Invalidez em São Luís: tudo o que você precisa saber para garantir seu direito em 2026',
                slug: 'aposentadoria-por-invalidez-em-sao-luis',
                content: '<h1>Aposentadoria por Invalidez em São Luís</h1><p>A aposentadoria por invalidez é um benefício previdenciário concedido ao segurado do INSS que, após perícia médica, for declarado incapaz permanentemente de exercer atividade laboral. Em São Luís, MA, a Bione Advocacia atende nos JEFs e Varas Federais para garantir esse direito.</p><h2>Requisitos</h2><ul><li>Qualidade de segurado ativa</li><li>Carência mínima de 12 meses (salvo acidente ou doenças listadas em lei)</li><li>Incapacidade permanente comprovada em perícia médica do INSS</li></ul><h2>Quanto vale?</h2><p>100% do salário de benefício, nunca inferior ao salário mínimo (R$ 1.518 em 2026).</p><h2>Consulta Gratuita</h2><p>Entre em contato com a Bione Advocacia pelo WhatsApp para análise gratuita do seu caso. OAB ativa na Seccional Maranhão.</p>',
                excerpt: 'Saiba como funciona a aposentadoria por invalidez em São Luís, quais são os requisitos e como a Bione Advocacia pode garantir seu direito. Consulta gratuita.',
                meta_description: 'Saiba como funciona a aposentadoria por invalidez em São Luís. Veja os requisitos, documentos e como um advogado previdenciário pode garantir seu direito. Consulta gratuita.',
                category: 'Direito Previdenciário',
                status: 'published',
                published_at: new Date().toISOString(),
                reading_time: 12,
                generation_source: 'article-engine-v2',
            },
            {
                id: 'dbe957ec-5d3d-409a-b585-7cc0e2474139',
                blog_id: BLOG_ID,
                title: 'Auxílio-Doença em São Luís: Como Pedir, Requisitos e o que Fazer se Negado',
                slug: 'auxilio-doenca-em-sao-luis',
                content: '<h1>Auxílio-Doença em São Luís</h1><p>O auxílio-doença (benefício B31 ou B91) é concedido ao segurado do INSS temporariamente incapaz de trabalhar. Se o INSS negar seu auxílio-doença em São Luís, a Bione Advocacia pode recorrer administrativamente ou judicialmente nos JEFs.</p><h2>Como pedir o Auxílio-Doença</h2><p>Você pode solicitar pelo aplicativo Meu INSS, pelo telefone 135 ou pessoalmente numa agência. Leve laudos médicos e documentação completa.</p><h2>INSS Negou?</h2><p>Não desista. A Bione Advocacia avalia seu caso gratuitamente e pode entrar com recurso ou ação judicial nos JEFs de São Luís.</p>',
                excerpt: 'Saiba como pedir o auxílio-doença em São Luís e o que fazer quando o INSS nega. Consulta gratuita com advogado previdenciário.',
                category: 'Direito Previdenciário',
                status: 'published',
                published_at: new Date().toISOString(),
                reading_time: 8,
                generation_source: 'article-engine-v2',
            },
            {
                id: '2256d1ee-2ed0-492c-a57a-c19ed911983e',
                blog_id: BLOG_ID,
                title: 'Benefício Negado pelo INSS em São Luís: Como Reverter a Decisão',
                slug: 'beneficio-negado-inss-sao-luis',
                content: '<h1>Benefício Negado pelo INSS em São Luís</h1><p>Se o INSS negou seu benefício em São Luís, você pode recorrer administrativamente (CRPS) ou judicialmente nos JEFs. A Bione Advocacia analisa seu caso gratuitamente.</p><h2>Principais motivos de negativa</h2><ul><li>Carência não cumprida</li><li>Qualidade de segurado perdida</li><li>Perícia médica desfavorável</li><li>Documentação incompleta</li></ul><h2>Como a Bione Advocacia pode ajudar</h2><p>Com OAB ativa, nossa equipe avalia o seu caso e entra com recurso ou ação no prazo correto.</p>',
                excerpt: 'Benefício negado pelo INSS em São Luís? Saiba os principais motivos, como recorrer e quando acionar a Justiça Federal.',
                category: 'Direito Previdenciário',
                status: 'published',
                published_at: new Date().toISOString(),
                reading_time: 8,
                generation_source: 'article-engine-v2',
            },
            {
                id: 'c50e0ed1-aa46-430e-8afe-130b74217f25',
                blog_id: BLOG_ID,
                title: 'Perícia Médica do INSS em São Luís: Como Funciona e Como se Preparar',
                slug: 'pericia-medica-inss-sao-luis',
                content: '<h1>Perícia Médica do INSS em São Luís</h1><p>A perícia médica do INSS é etapa obrigatória para concessão de benefícios por incapacidade em São Luís. O resultado define se o benefício será concedido ou negado.</p><h2>O que o perito avalia?</h2><p>O médico perito analisa laudos, exames, histórico clínico e a capacidade laboral do segurado. A decisão pode ser questionada.</p><h2>Perito Assistente</h2><p>Você tem direito de levar um médico de sua confiança (perito assistente). A Bione Advocacia pode indicar um profissional para te acompanhar na perícia em São Luís.</p>',
                excerpt: 'Saiba como funciona a perícia médica do INSS em São Luís, o que o perito avalia e como se preparar. Resultado desfavorável? A Bione Advocacia analisa seu caso.',
                category: 'Direito Previdenciário',
                status: 'published',
                published_at: new Date().toISOString(),
                reading_time: 9,
                generation_source: 'article-engine-v2',
            },
            {
                id: '64a0ac9d-3030-4686-a4ad-dd19d61d9eef',
                blog_id: BLOG_ID,
                title: 'Revisão de Benefício Previdenciário em São Luís: Quando Vale a Pena',
                slug: 'revisao-beneficio-previdenciario-sao-luis',
                content: '<h1>Revisão de Benefício Previdenciário em São Luís</h1><p>Muitos segurados do INSS em São Luís têm benefícios calculados a menor. A revisão pode resultar em aumento do valor mensal e pagamento de retroativos em até 5 anos.</p><h2>Prazo para revisão</h2><p>10 anos da concessão (prazo decadencial). Retroativos prescrevem em 5 anos. Não perca o prazo.</p><h2>A revisão pode reduzir meu benefício?</h2><p>Não. Se reconhecido o erro, o valor aumenta e os retroativos são pagos. O benefício nunca é reduzido por revisão.</p><h2>Avaliação gratuita</h2><p>A Bione Advocacia avalia gratuitamente se você tem direito à revisão. Entre em contato pelo WhatsApp.</p>',
                excerpt: 'Saiba quando revisar seu benefício do INSS em São Luís, os prazos e como um advogado previdenciário pode recuperar valores pagos a menor.',
                category: 'Direito Previdenciário',
                status: 'published',
                published_at: new Date().toISOString(),
                reading_time: 8,
                generation_source: 'article-engine-v2',
            },
            {
                id: '0943fa2a-6396-4192-83ae-5eaa151bce78',
                blog_id: BLOG_ID,
                title: 'Advogado Previdenciário em São Luís: Quando Contratar e Como Funciona',
                slug: 'advogado-previdenciario-sao-luis',
                content: '<h1>Advogado Previdenciário em São Luís</h1><p>Um advogado previdenciário especializado em São Luís pode aumentar suas chances de aprovação do benefício em até 70% e garantir o pagamento de retroativos.</p><h2>Quando contratar?</h2><ul><li>Benefício negado pelo INSS</li><li>Benefício cessado indevidamente</li><li>Necessidade de ação judicial nos JEFs</li><li>Revisão de benefício calculado a menor</li></ul><h2>Honorário de êxito</h2><p>Na Bione Advocacia, você só paga se ganhar. O honorário é debitado dos retroativos devidos pelo INSS, sem custo antecipado.</p>',
                excerpt: 'Descubra quando contratar um advogado previdenciário em São Luís, o que ele faz em cada tipo de benefício e como funciona o honorário de êxito.',
                category: 'Direito Previdenciário',
                status: 'published',
                published_at: new Date().toISOString(),
                reading_time: 8,
                generation_source: 'article-engine-v2',
            },
        ];

        const { data: arts, error: artsErr } = await supabaseAdmin
            .from('articles')
            .upsert(articles, { onConflict: 'id' })
            .select('id, slug, status');

        if (artsErr) log.push(`  ERRO artigos: ${artsErr.message}`);
        else log.push(`  OK: ${arts?.length} artigos upserted`);

        // 3. Garantir published_at preenchido
        await supabaseAdmin
            .from('articles')
            .update({ published_at: new Date().toISOString() })
            .eq('blog_id', BLOG_ID)
            .is('published_at', null);

        // 4. VERIFICAR RLS POLICIES (via exec SQL)
        log.push('[3] Verificando policies RLS...');
        // Nota: Edge Functions com service_role ainda precisam do Supabase SQL API para CREATE POLICY
        // As políticas são verificadas via leitura anon abaixo

        // 5. VERIFICAÇÃO FINAL
        log.push('[4] Verificação final...');

        // Verificar blog via anon (sem auth)
        const supabaseAnon = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        );

        const { data: blogAnon, error: blogAnonErr } = await supabaseAnon
            .from('blogs')
            .select('id, name, slug')
            .eq('slug', 'bione-advocacia')
            .single();

        const { data: artsAnon, error: artsAnonErr } = await supabaseAnon
            .from('articles')
            .select('id, slug, status')
            .eq('blog_id', BLOG_ID)
            .eq('status', 'published');

        const blogPublicVisible = !blogAnonErr && !!blogAnon;
        const artsPublicCount = artsAnon?.length ?? 0;

        log.push(`  Blog via anon: ${blogPublicVisible ? '✅ VISÍVEL' : '❌ BLOQUEADO por RLS (execute policy SQL)'}`);
        log.push(`  Artigos via anon: ${artsPublicCount} artigos publicados visíveis`);

        const successState = blogPublicVisible && artsPublicCount >= 6;

        const result = {
            success: successState,
            successState: successState ? 'TRUE' : 'PARTIAL',
            blog_id: BLOG_ID,
            blog_slug: 'bione-advocacia',
            articles_upserted: arts?.length ?? 0,
            blog_public_visible: blogPublicVisible,
            articles_public_visible: artsPublicCount,
            log,
            nextSteps: successState ? [] : [
                'Execute o SQL abaixo no Supabase Studio para criar policies RLS públicas:',
                'https://supabase.com/dashboard/project/oxbrvyinmpbkllicaxqk/sql/new',
                '',
                'CREATE POLICY "Public blogs viewable" ON public.blogs FOR SELECT USING (true);',
                'CREATE POLICY "Published articles viewable" ON public.articles FOR SELECT USING (status = \'published\');',
            ]
        };

        return new Response(JSON.stringify(result, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
