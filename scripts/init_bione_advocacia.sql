-- =============================================================================
-- OMNISEEN — TENANT PRODUCTION INITIALIZATION
-- Tenant: Bione Advocacia | CLU-BIONE-PREV-001
-- Generated: 2026-02-28T15:47:59-05:00
-- Mode: staged_supabase (status = 'draft' — publish_immediately = false)
-- =============================================================================
-- 
-- IDs ALOCADOS:
--   tenant_id / blog_id : 44c4f7cd-05b0-4229-9828-2eb822d38bfd
--   cluster_id          : 941159f4-8ff8-4c70-b39f-8eec0b453c45
--   article PILLAR      : 3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679
--   article S01         : dbe957ec-5d3d-409a-b585-7cc0e2474139
--   article S02         : 2256d1ee-2ed0-492c-a57a-c19ed911983e
--   article S03         : c50e0ed1-aa46-430e-8afe-130b74217f25
--   article S04         : 64a0ac9d-3030-4686-a4ad-dd19d61d9eef
--   article S05         : 0943fa2a-6396-4192-83ae-5eaa151bce78
--
-- ATENÇÃO: Substitua os valores de placeholder antes de executar:
--   <SUPABASE_USER_ID>  → UUID do usuário OmniSeen admin da Bione
--   <PHONE>             → Telefone real da Bione Advocacia
--   <WEBSITE>           → URL real do site da Bione Advocacia
--   <EMAIL>             → E-mail real da Bione Advocacia
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. BLOG (= tenant workspace)
-- -----------------------------------------------------------------------------
INSERT INTO public.blogs (
  id,
  user_id,
  name,
  slug,
  description,
  primary_color,
  secondary_color,
  cta_type,
  cta_url,
  cta_text,
  author_name,
  author_bio,
  integration_type,
  platform_subdomain,
  onboarding_completed,
  brand_description,
  footer_text,
  show_powered_by
) VALUES (
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',  -- blog_id = tenant_id
  '<SUPABASE_USER_ID>',                      -- ← substituir pelo user_id real
  'Bione Advocacia',
  'bione-advocacia',
  'Escritório de Direito Previdenciário em São Luís, Maranhão. OAB ativa.',
  '#1e3a5f',   -- azul escuro jurídico
  '#b8922a',   -- dourado
  'whatsapp',
  '<PHONE>',   -- ← substituir pelo telefone/WhatsApp real
  'Consulta gratuita',
  'Bione Advocacia',
  'Especialistas em Direito Previdenciário em São Luís, MA. OAB ativa. Consulta gratuita.',
  'subdomain',
  'bione-advocacia.omniseen.app',
  true,
  'Escritório de advocacia especializado em Direito Previdenciário, com OAB ativa, atuando nas Varas Federais Previdenciárias e Juizados Especiais Federais de São Luís, Maranhão.',
  '© 2026 Bione Advocacia — Direito Previdenciário em São Luís, MA',
  false
)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2. BUSINESS PROFILE (perfil visual + nicho para generate-image)
-- -----------------------------------------------------------------------------
INSERT INTO public.business_profile (
  blog_id,
  niche,
  target_audience,
  tone_of_voice,
  pain_points,
  desires,
  brand_keywords,
  company_name,
  project_name,
  language,
  country,
  long_description
) VALUES (
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
  'advogado advocacia jurídico direito previdenciário',
  'Trabalhadores em São Luís que tiveram benefícios previdenciários negados ou cessados pelo INSS',
  'authoritative',
  ARRAY[
    'Benefício negado ou cessado indevidamente pelo INSS',
    'Perícia médica desfavorável ao laudo do médico',
    'Dificuldade em comprovar tempo de trabalho rural ou informal',
    'Não saber quais documentos reunir para a perícia'
  ],
  ARRAY[
    'Ter o benefício aprovado e receber retroativos',
    'Contar com representação jurídica especializada e confiável',
    'Consulta gratuita sem burocracia',
    'Entender seus direitos previdenciários de forma clara'
  ],
  ARRAY[
    'advocacia previdenciária', 'INSS', 'aposentadoria por invalidez',
    'auxílio-doença', 'benefício negado', 'OAB', 'São Luís', 'Maranhão',
    'Direito Previdenciário', 'Varas Federais', 'JEF', 'consulta gratuita'
  ],
  'Bione Advocacia',
  'Bione Advocacia — Direito Previdenciário São Luís',
  'pt-BR',
  'Brasil',
  'A Bione Advocacia é um escritório especializado exclusivamente em Direito Previdenciário, com OAB ativa na Seccional Maranhão, atuando nas Varas Federais Previdenciárias e Juizados Especiais Federais de São Luís. Atendemos trabalhadores de São Luís e Região Metropolitana (São José de Ribamar, Paço do Lumiar, Raposa) em todos os tipos de benefícios: aposentadoria por invalidez, auxílio-doença, benefício negado, revisão de benefício e BPC-LOAS.'
)
ON CONFLICT (blog_id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 3. CONTENT CLUSTER — CLU-BIONE-PREV-001
-- -----------------------------------------------------------------------------
INSERT INTO public.content_clusters (
  id,
  blog_id,
  name,
  pillar_keyword,
  description,
  status
) VALUES (
  '941159f4-8ff8-4c70-b39f-8eec0b453c45',
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
  'Direito Previdenciário São Luís',
  'aposentadoria por invalidez em São Luís',
  'Cluster de autoridade local em Direito Previdenciário para São Luís, MA. PILLAR + 5 SUPPORTING pages.',
  'active'
)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 4. ARTIGOS — 6 páginas do cluster CLU-BIONE-PREV-001
-- -----------------------------------------------------------------------------

-- PILLAR: Aposentadoria por Invalidez em São Luís
INSERT INTO public.articles (
  id, blog_id, title, slug, content, excerpt, meta_description,
  category, keywords, tags, status, generation_source, faq, reading_time
) VALUES (
  '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679',
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
  'Aposentadoria por Invalidez em São Luís: tudo o que você precisa saber para garantir seu direito em 2026',
  'aposentadoria-por-invalidez-em-sao-luis',
  '<!-- SUPERPAGE PILLAR — Conteúdo completo no arquivo: superpage_aposentadoria_invalidez_sao_luis.md — aguardando injeção via pipeline -->',
  'Saiba como funciona a aposentadoria por invalidez em São Luís, quais são os requisitos, documentos necessários e como a Bione Advocacia pode garantir seu direito com OAB ativa.',
  'Saiba como funciona a aposentadoria por invalidez em São Luís. Veja os requisitos, documentos e como um advogado previdenciário pode garantir seu direito. Consulta gratuita.',
  'Direito Previdenciário',
  ARRAY['aposentadoria por invalidez em São Luís','aposentadoria por invalidez','INSS invalidez','advogado previdenciário São Luís','benefício por incapacidade Maranhão'],
  ARRAY['direito previdenciário','INSS','São Luís','aposentadoria por invalidez','Maranhão'],
  'draft',
  'article-engine-v2',
  '[
    {"question":"Quem tem direito à aposentadoria por invalidez?","answer":"Segurado do INSS com incapacidade permanente comprovada em perícia médica, qualidade de segurado e carência mínima."},
    {"question":"Qual o valor da aposentadoria por invalidez?","answer":"100% do salário de benefício, nunca inferior ao salário mínimo (R$ 1.518 em 2026)."},
    {"question":"O INSS pode cancelar a aposentadoria por invalidez?","answer":"Sim, até os 60 anos via revisão periódica. Após os 60 anos, o benefício se torna definitivo (Súmula 47 da TNU)."},
    {"question":"Quanto tempo demora o processo judicial em São Luís?","answer":"Nos JEFs, causas até 60 SM costumam ter sentença em 12 a 24 meses."}
  ]'::jsonb,
  25
)
ON CONFLICT (id) DO NOTHING;

-- S01: Auxílio-Doença em São Luís
INSERT INTO public.articles (
  id, blog_id, title, slug, content, excerpt, meta_description,
  category, keywords, tags, status, generation_source, faq, reading_time
) VALUES (
  'dbe957ec-5d3d-409a-b585-7cc0e2474139',
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
  'Auxílio-Doença em São Luís: Como Pedir, Requisitos e o que Fazer se Negado',
  'auxilio-doenca-em-sao-luis',
  '<!-- SUPPORTING S01 — Conteúdo completo no arquivo: s01_auxilio_doenca_sao_luis.md — aguardando injeção via pipeline -->',
  'Saiba como pedir o auxílio-doença em São Luís, quais documentos levar, o que fazer quando o INSS nega e como um advogado previdenciário pode ajudar.',
  'Saiba como pedir o auxílio-doença em São Luís, quais documentos levar, o que fazer quando o INSS nega e como um advogado previdenciário pode ajudar. Consulta gratuita.',
  'Direito Previdenciário',
  ARRAY['auxílio-doença São Luís','auxílio-doença INSS','benefício doença São Luís','advogado previdenciário','B31 B91'],
  ARRAY['direito previdenciário','auxílio-doença','INSS','São Luís','Maranhão'],
  'draft',
  'article-engine-v2',
  '[
    {"question":"Posso ser demitido enquanto recebo auxílio-doença?","answer":"No B91 (acidentário), há estabilidade de 12 meses após o retorno. No B31 (comum), não há estabilidade previdenciária garantida."},
    {"question":"Autônomo e MEI têm direito ao auxílio-doença?","answer":"Sim, desde que em dia com as contribuições ao INSS e com a carência cumprida."}
  ]'::jsonb,
  10
)
ON CONFLICT (id) DO NOTHING;

-- S02: Benefício Negado pelo INSS
INSERT INTO public.articles (
  id, blog_id, title, slug, content, excerpt, meta_description,
  category, keywords, tags, status, generation_source, faq, reading_time
) VALUES (
  '2256d1ee-2ed0-492c-a57a-c19ed911983e',
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
  'Benefício Negado pelo INSS em São Luís: Como Reverter a Decisão e Garantir seu Direito',
  'beneficio-negado-inss-sao-luis',
  '<!-- SUPPORTING S02 — Conteúdo completo no arquivo: s02_beneficio_negado_inss_sao_luis.md — aguardando injeção via pipeline -->',
  'Benefício negado pelo INSS em São Luís? Saiba os principais motivos das negativas, como recorrer e quando acionar a Justiça Federal.',
  'Benefício negado pelo INSS em São Luís? Saiba os principais motivos das negativas, como recorrer e quando acionar a Justiça Federal. Bione Advocacia — OAB ativa.',
  'Direito Previdenciário',
  ARRAY['benefício negado INSS São Luís','INSS negou benefício Maranhão','recurso INSS São Luís','JEF Maranhão'],
  ARRAY['direito previdenciário','benefício negado','INSS','São Luís','recurso'],
  'draft',
  'article-engine-v2',
  '[
    {"question":"Posso entrar com ação judicial sem ter tentado o recurso administrativo?","answer":"Sim, desde 2019 a exigência de exaurimento administrativo foi flexibilizada pelo STF."},
    {"question":"Posso pedir liminar para receber enquanto o processo tramita?","answer":"Sim, em casos de urgência comprovada. O juiz pode conceder tutela antecipada."}
  ]'::jsonb,
  9
)
ON CONFLICT (id) DO NOTHING;

-- S03: Perícia Médica do INSS
INSERT INTO public.articles (
  id, blog_id, title, slug, content, excerpt, meta_description,
  category, keywords, tags, status, generation_source, faq, reading_time
) VALUES (
  'c50e0ed1-aa46-430e-8afe-130b74217f25',
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
  'Perícia Médica do INSS em São Luís: Como Funciona, Como se Preparar e o que Fazer se for Desfavorável',
  'pericia-medica-inss-sao-luis',
  '<!-- SUPPORTING S03 — Conteúdo completo no arquivo: s03_pericia_medica_inss_sao_luis.md — aguardando injeção via pipeline -->',
  'Saiba como funciona a perícia médica do INSS em São Luís, o que o perito avalia, como se preparar e o que fazer se o resultado for desfavorável.',
  'Saiba como funciona a perícia médica do INSS em São Luís, o que o perito avalia, como se preparar e o que fazer se o resultado for desfavorável. Consulta gratuita.',
  'Direito Previdenciário',
  ARRAY['perícia médica INSS São Luís','perícia INSS Maranhão','como se preparar perícia INSS','resultado perícia desfavorável'],
  ARRAY['direito previdenciário','perícia médica','INSS','São Luís','Maranhão'],
  'draft',
  'article-engine-v2',
  '[
    {"question":"Posso levar meu médico para a perícia do INSS?","answer":"Sim. Você tem direito ao perito assistente — um médico de sua confiança que pode acompanhar a perícia."},
    {"question":"Quanto tempo dura a perícia do INSS?","answer":"Em média 15 a 20 minutos. O resultado aparece no Meu INSS no mesmo dia ou em até 2 dias úteis."}
  ]'::jsonb,
  10
)
ON CONFLICT (id) DO NOTHING;

-- S04: Revisão de Benefício
INSERT INTO public.articles (
  id, blog_id, title, slug, content, excerpt, meta_description,
  category, keywords, tags, status, generation_source, faq, reading_time
) VALUES (
  '64a0ac9d-3030-4686-a4ad-dd19d61d9eef',
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
  'Revisão de Benefício Previdenciário em São Luís: Quando Vale a Pena e Como Fazer',
  'revisao-beneficio-previdenciario-sao-luis',
  '<!-- SUPPORTING S04 — Conteúdo completo no arquivo: s04_revisao_beneficio_previdenciario_sao_luis.md — aguardando injeção via pipeline -->',
  'Saiba quando revisar seu benefício do INSS em São Luís, quais os prazos e como um advogado previdenciário pode recuperar valores pagos a menor.',
  'Saiba quando revisar seu benefício do INSS em São Luís, quais os prazos e como um advogado previdenciário pode recuperar valores pagos a menor. Consulta gratuita.',
  'Direito Previdenciário',
  ARRAY['revisão benefício INSS São Luís','revisão aposentadoria São Luís','benefício calculado errado INSS','revisão previdenciária Maranhão'],
  ARRAY['direito previdenciário','revisão de benefício','INSS','São Luís','retroativos'],
  'draft',
  'article-engine-v2',
  '[
    {"question":"A revisão reduz o benefício que estou recebendo?","answer":"Não. Se reconhecido o erro, o valor aumenta e os retroativos são pagos. O benefício nunca é reduzido por revisão."},
    {"question":"Qual o prazo para pedir revisão?","answer":"10 anos da concessão do benefício (prazo decadencial). Retroativos prescrevem em 5 anos."}
  ]'::jsonb,
  9
)
ON CONFLICT (id) DO NOTHING;

-- S05: Advogado Previdenciário em São Luís
INSERT INTO public.articles (
  id, blog_id, title, slug, content, excerpt, meta_description,
  category, keywords, tags, status, generation_source, faq, reading_time
) VALUES (
  '0943fa2a-6396-4192-83ae-5eaa151bce78',
  '44c4f7cd-05b0-4229-9828-2eb822d38bfd',
  'Advogado Previdenciário em São Luís: Quando Contratar, o que Ele Faz e Como Funciona',
  'advogado-previdenciario-sao-luis',
  '<!-- SUPPORTING S05 — Conteúdo completo no arquivo: s05_advogado_previdenciario_sao_luis.md — aguardando injeção via pipeline -->',
  'Descubra quando e por que contratar um advogado previdenciário em São Luís, o que ele faz em cada tipo de benefício e como funciona o honorário de êxito.',
  'Descubra quando e por que contratar um advogado previdenciário em São Luís. Saiba o que ele faz em cada tipo de benefício e como funciona o honorário de êxito.',
  'Direito Previdenciário',
  ARRAY['advogado previdenciário São Luís','advogado INSS São Luís','escritório previdenciário Maranhão','honorário êxito INSS'],
  ARRAY['direito previdenciário','advogado previdenciário','São Luís','OAB','Maranhão'],
  'draft',
  'article-engine-v2',
  '[
    {"question":"Preciso de advogado para dar entrada no INSS?","answer":"Não. O pedido administrativo pode ser feito pelo próprio segurado. O advogado é essencial quando há negativa, cessação ou necessidade de ação judicial."},
    {"question":"Os honorários são pagos mesmo se perder?","answer":"Não. No modelo de êxito, o honorário só é cobrado se o cliente ganhar a causa."}
  ]'::jsonb,
  10
)
ON CONFLICT (id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 5. CLUSTER ARTICLES — registrar artigos no cluster
-- -----------------------------------------------------------------------------

-- PILLAR
INSERT INTO public.cluster_articles (cluster_id, article_id, suggested_title, suggested_keywords, is_pillar, status)
VALUES
  ('941159f4-8ff8-4c70-b39f-8eec0b453c45', '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679',
   'Aposentadoria por Invalidez em São Luís',
   ARRAY['aposentadoria por invalidez em São Luís'], true, 'generated'),
  ('941159f4-8ff8-4c70-b39f-8eec0b453c45', 'dbe957ec-5d3d-409a-b585-7cc0e2474139',
   'Auxílio-Doença em São Luís',
   ARRAY['auxílio-doença São Luís'], false, 'generated'),
  ('941159f4-8ff8-4c70-b39f-8eec0b453c45', '2256d1ee-2ed0-492c-a57a-c19ed911983e',
   'Benefício Negado pelo INSS em São Luís',
   ARRAY['benefício negado INSS São Luís'], false, 'generated'),
  ('941159f4-8ff8-4c70-b39f-8eec0b453c45', 'c50e0ed1-aa46-430e-8afe-130b74217f25',
   'Perícia Médica do INSS em São Luís',
   ARRAY['perícia médica INSS São Luís'], false, 'generated'),
  ('941159f4-8ff8-4c70-b39f-8eec0b453c45', '64a0ac9d-3030-4686-a4ad-dd19d61d9eef',
   'Revisão de Benefício Previdenciário em São Luís',
   ARRAY['revisão benefício INSS São Luís'], false, 'generated'),
  ('941159f4-8ff8-4c70-b39f-8eec0b453c45', '0943fa2a-6396-4192-83ae-5eaa151bce78',
   'Advogado Previdenciário em São Luís',
   ARRAY['advogado previdenciário São Luís'], false, 'generated')
ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- 6. INTERNAL LINKS — grafo de links do cluster
-- -----------------------------------------------------------------------------

-- Todos os SUPPORTING apontam para o PILLAR
INSERT INTO public.article_internal_links (source_article_id, target_article_id, anchor_text)
VALUES
  ('dbe957ec-5d3d-409a-b585-7cc0e2474139', '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', 'aposentadoria por invalidez em São Luís'),
  ('2256d1ee-2ed0-492c-a57a-c19ed911983e', '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', 'aposentadoria por invalidez em São Luís'),
  ('c50e0ed1-aa46-430e-8afe-130b74217f25', '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', 'aposentadoria por invalidez em São Luís'),
  ('64a0ac9d-3030-4686-a4ad-dd19d61d9eef', '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', 'aposentadoria por invalidez'),
  ('0943fa2a-6396-4192-83ae-5eaa151bce78', '3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', 'aposentadoria por invalidez em São Luís'),
  -- PILLAR aponta para todos os SUPPORTING
  ('3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', 'dbe957ec-5d3d-409a-b585-7cc0e2474139', 'Auxílio-Doença em São Luís'),
  ('3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', '2256d1ee-2ed0-492c-a57a-c19ed911983e', 'Benefício Negado pelo INSS em São Luís'),
  ('3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', 'c50e0ed1-aa46-430e-8afe-130b74217f25', 'Perícia Médica do INSS em São Luís'),
  ('3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', '64a0ac9d-3030-4686-a4ad-dd19d61d9eef', 'Revisão de Benefício Previdenciário em São Luís'),
  ('3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679', '0943fa2a-6396-4192-83ae-5eaa151bce78', 'Advogado Previdenciário em São Luís'),
  -- S05 aponta para todos os outros
  ('0943fa2a-6396-4192-83ae-5eaa151bce78', 'dbe957ec-5d3d-409a-b585-7cc0e2474139', 'Auxílio-Doença em São Luís'),
  ('0943fa2a-6396-4192-83ae-5eaa151bce78', '2256d1ee-2ed0-492c-a57a-c19ed911983e', 'Benefício Negado pelo INSS em São Luís'),
  ('0943fa2a-6396-4192-83ae-5eaa151bce78', 'c50e0ed1-aa46-430e-8afe-130b74217f25', 'Perícia Médica do INSS em São Luís'),
  ('0943fa2a-6396-4192-83ae-5eaa151bce78', '64a0ac9d-3030-4686-a4ad-dd19d61d9eef', 'Revisão de Benefício Previdenciário em São Luís'),
  -- Cross-links entre SUPPORTING
  ('dbe957ec-5d3d-409a-b585-7cc0e2474139', '2256d1ee-2ed0-492c-a57a-c19ed911983e', 'Benefício Negado pelo INSS em São Luís'),
  ('dbe957ec-5d3d-409a-b585-7cc0e2474139', 'c50e0ed1-aa46-430e-8afe-130b74217f25', 'Perícia Médica do INSS em São Luís'),
  ('2256d1ee-2ed0-492c-a57a-c19ed911983e', 'dbe957ec-5d3d-409a-b585-7cc0e2474139', 'Auxílio-Doença em São Luís'),
  ('2256d1ee-2ed0-492c-a57a-c19ed911983e', 'c50e0ed1-aa46-430e-8afe-130b74217f25', 'Perícia Médica do INSS em São Luís'),
  ('c50e0ed1-aa46-430e-8afe-130b74217f25', 'dbe957ec-5d3d-409a-b585-7cc0e2474139', 'Auxílio-Doença em São Luís'),
  ('c50e0ed1-aa46-430e-8afe-130b74217f25', '2256d1ee-2ed0-492c-a57a-c19ed911983e', 'Benefício Negado pelo INSS em São Luís');

COMMIT;

-- =============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- =============================================================================
-- Rode os SELECTs abaixo após o COMMIT para confirmar que tudo foi inserido:
--
-- SELECT id, name, slug, platform_subdomain FROM blogs WHERE id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd';
-- SELECT company_name, niche FROM business_profile WHERE blog_id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd';
-- SELECT id, title, slug, status FROM articles WHERE blog_id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd' ORDER BY created_at;
-- SELECT ca.is_pillar, a.slug FROM cluster_articles ca JOIN articles a ON ca.article_id = a.id WHERE ca.cluster_id = '941159f4-8ff8-4c70-b39f-8eec0b453c45';
-- SELECT COUNT(*) as total_links FROM article_internal_links WHERE source_article_id IN (SELECT id FROM articles WHERE blog_id = '44c4f7cd-05b0-4229-9828-2eb822d38bfd');
