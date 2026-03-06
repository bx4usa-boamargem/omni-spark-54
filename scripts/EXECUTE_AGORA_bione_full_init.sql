-- =========================================================================
-- OMNISEEN — UPSERT COMPLETO BIONE ADVOCACIA (sem substituição de variáveis)
-- Cole TUDO no Supabase Studio:
-- https://supabase.com/dashboard/project/oxbrvyinmpbkllicaxqk/editor
-- =========================================================================

BEGIN;

-- 1. BLOG (sem user_id — será vinculado após criar o operador)
INSERT INTO public.blogs (
  id, name, slug, description,
  primary_color, secondary_color,
  cta_type, cta_text,
  author_name, author_bio,
  platform_subdomain, onboarding_completed,
  brand_description, footer_text, show_powered_by
) VALUES (
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
  'Bione Advocacia',
  'bione-advocacia',
  'Escritório de Direito Previdenciário em São Luís, Maranhão. OAB ativa.',
  '#1e3a5f', '#b8922a',
  'whatsapp', 'Consulta gratuita',
  'Bione Advocacia',
  'Especialistas em Direito Previdenciário em São Luís, MA. OAB ativa. Consulta gratuita.',
  'bione-advocacia',
  true,
  'Escritório de advocacia especializado exclusivamente em Direito Previdenciário com OAB ativa na Seccional Maranhão.',
  '© 2026 Bione Advocacia — Direito Previdenciário em São Luís, MA',
  false
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  platform_subdomain = EXCLUDED.platform_subdomain;

-- 2. ARTIGOS (status = 'published' para aparecer no blog público imediatamente)
INSERT INTO public.articles (
  id, blog_id, title, slug, content, excerpt, category, status, reading_time
) VALUES
  (
    '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679',
    '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
    'Aposentadoria por Invalidez em São Luís: tudo o que você precisa saber para garantir seu direito em 2026',
    'aposentadoria-por-invalidez-em-sao-luis',
    '<h1>Aposentadoria por Invalidez em São Luís</h1><p>A aposentadoria por invalidez é um benefício previdenciário concedido ao segurado do INSS que, após perícia médica, for declarado incapaz permanentemente de exercer atividade laboral que lhe garanta subsistência. Em São Luís, MA, a Bione Advocacia atende nos JEFs e Varas Federais para garantir esse direito.</p><h2>Requisitos</h2><ul><li>Qualidade de segurado ativa</li><li>Carência mínima de 12 meses (salvo acidente ou doenças listadas em lei)</li><li>Incapacidade permanente comprovada em perícia médica do INSS</li></ul><h2>Como funciona o processo?</h2><p>A Bione Advocacia atua desde a fase administrativa até eventuais recursos nos JEFs em São Luís.</p>',
    'Saiba como funciona a aposentadoria por invalidez em São Luís, quais são os requisitos e como a Bione Advocacia pode garantir seu direito.',
    'Direito Previdenciário',
    'published',
    12
  ),
  (
    'dbe957ec-5d3d-409a-b585-7cc0e2474139',
    '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
    'Auxílio-Doença em São Luís: Como Pedir, Requisitos e o que Fazer se Negado',
    'auxilio-doenca-em-sao-luis',
    '<h1>Auxílio-Doença em São Luís</h1><p>O auxílio-doença (benefício B31 ou B91) é concedido ao segurado do INSS temporariamente incapaz de trabalhar. Se o INSS negar, a Bione Advocacia pode recorrer administrativamente ou judicialmente nos JEFs em São Luís.</p>',
    'Saiba como pedir o auxílio-doença em São Luís e o que fazer quando o INSS nega.',
    'Direito Previdenciário',
    'published',
    8
  ),
  (
    '2256d1ee-2ed0-492c-a57a-c19ed911983e',
    '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
    'Benefício Negado pelo INSS em São Luís: Como Reverter a Decisão',
    'beneficio-negado-inss-sao-luis',
    '<h1>Benefício Negado pelo INSS em São Luís</h1><p>Se o INSS negou seu benefício em São Luís, você pode recorrer administrativamente (CRPS) ou judicialmente nos JEFs. A Bione Advocacia analisa seu caso gratuitamente.</p>',
    'Benefício negado pelo INSS em São Luís? Saiba como recorrer e quando acionar a Justiça Federal.',
    'Direito Previdenciário',
    'published',
    8
  ),
  (
    'c50e0ed1-aa46-430e-8afe-130b74217f25',
    '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
    'Perícia Médica do INSS em São Luís: Como Funciona e Como se Preparar',
    'pericia-medica-inss-sao-luis',
    '<h1>Perícia Médica do INSS em São Luís</h1><p>A perícia médica do INSS é uma etapa obrigatória para concessão de benefícios por incapacidade. Em São Luís, as perícias ocorrem na Agência da Previdência Social. A Bione Advocacia pode indicar um perito assistente para te acompanhar.</p>',
    'Saiba como funciona a perícia médica do INSS em São Luís e como se preparar para ela.',
    'Direito Previdenciário',
    'published',
    9
  ),
  (
    '64a0ac9d-3030-4686-a4ad-dd19d61d9eef',
    '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
    'Revisão de Benefício Previdenciário em São Luís: Quando Vale a Pena',
    'revisao-beneficio-previdenciario-sao-luis',
    '<h1>Revisão de Benefício Previdenciário em São Luís</h1><p>Muitos segurados do INSS em São Luís têm benefícios calculados a menor. A revisão pode resultar em aumento do valor mensal e pagamento de retroativos em até 5 anos. A Bione Advocacia avalia gratuitamente.</p>',
    'Saiba quando e como revisar seu benefício do INSS em São Luís para receber o que é seu por direito.',
    'Direito Previdenciário',
    'published',
    8
  ),
  (
    '0943fa2a-6396-4192-83ae-5eaa151bce78',
    '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
    'Advogado Previdenciário em São Luís: Quando Contratar e Como Funciona',
    'advogado-previdenciario-sao-luis',
    '<h1>Advogado Previdenciário em São Luís</h1><p>Um advogado previdenciário especializado em São Luís pode aumentar suas chances de aprovação do benefício em até 70%. A Bione Advocacia atua nos JEFs e Varas Federais com honorário de êxito — você só paga se ganhar.</p>',
    'Descubra quando contratar um advogado previdenciário em São Luís e como funciona o honorário de êxito.',
    'Direito Previdenciário',
    'published',
    8
  )
ON CONFLICT (id) DO UPDATE SET
  status = 'published',
  published_at = COALESCE(articles.published_at, NOW()),
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  content = EXCLUDED.content;

-- Garantir published_at preenchido
UPDATE articles
SET published_at = NOW()
WHERE blog_id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd'
  AND published_at IS NULL;

COMMIT;

-- VERIFICAÇÃO:
SELECT id, slug, title, status, published_at
FROM articles
WHERE blog_id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd'
ORDER BY created_at;
