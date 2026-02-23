# OMNISEEN SUPER PAGE ENGINE V2 — Full Refactor Plan

**Objetivo:** Transformar o projeto omniseeblog (Lovable) em um motor dual (Super Pages + Articles) com pipeline unificado, SEO estruturado ao estilo SEOwriting.ai, e geração de imagens via Gemini Nano Banana.

**Status:** Diagnóstico e roadmap — sem código ainda.

---

## PARTE 1 — DIAGNÓSTICO DA ARQUITETURA ATUAL

### 1.1 Fluxo de geração de artigos (estado atual)

| Etapa | Onde | O que faz |
|-------|------|-----------|
| **Entrada** | `create-generation-job` | Recebe keyword, blog_id, niche, city, etc.; insere em `generation_jobs`; invoca `orchestrate-generation` (fire-and-forget). |
| **1. INPUT_VALIDATION** | `orchestrate-generation` | Valida keyword (min 2 chars), niche. Programático. |
| **2. SERP_SUMMARY** | `orchestrate-generation` → `ai-router` (task `serp_summary`) | Resumo competitivo em texto (~300 palavras). Não usa SERP real (DataForSEO/SerpAPI); é simulado por LLM. |
| **3. ARTICLE_GEN_SINGLE_PASS** | `orchestrate-generation` → `ai-router` (task `article_gen_single_pass`) | Uma única chamada LLM que devolve JSON: title, meta_description, html_article, faq, image_prompt. **Alvo atual: 900–1500 palavras.** |
| **4. SAVE_ARTICLE** | `orchestrate-generation` | Slug, excerpt, CTA (blog/job), insert em `articles` (status draft), atualiza job com article_id. |
| **5. IMAGE_GEN_ASYNC** | `orchestrate-generation` | Gera **só a capa** (hero). Lovable Gateway `google/gemini-2.5-flash-image` ou fallback picsum.photos; upload em bucket `article-images`. |

**Outros pontos de entrada para o mesmo motor:**  
`process-queue` (filas `article_queue`), `convert-opportunity-to-article`, `article-chat` (quando `generateArticle: true`), UIs (ArticleGenerator, NewArticle, ClientArticleEditor, GenerationNew).

**Conclusão:** Existe um único pipeline “article” (single-pass, 900–1500 palavras, 1 imagem hero). Não há distinção de tipo de conteúdo (article vs super page) no fluxo nem no schema de `articles`.

---

### 1.2 Supabase — tabelas relevantes

| Tabela | Papel no motor |
|--------|-----------------|
| **articles** | Conteúdo final: title, slug, content (HTML), meta_description, faq (JSONB), featured_image_url, content_images (JSONB), keywords, status, reading_time, cta, generation_source, engine_version, source_payload, etc. **Sem coluna `content_type` (article vs super_page).** |
| **generation_jobs** | Job type enum `article` \| `super_page`; status; current_step; input/output JSONB; article_id; cost/tokens. **Pipeline atual ignora `job_type` e trata tudo como article.** |
| **generation_steps** | Log por passo (job_id, step_name, status, input, output, model_used, cost_usd, latency_ms). `step_name` foi migrado para TEXT (regex `^[A-Z0-9_]+$`); enum antigo não inclui os passos v2 (INPUT_VALIDATION, SERP_SUMMARY, ARTICLE_GEN_SINGLE_PASS, SAVE_ARTICLE, IMAGE_GEN_ASYNC). |
| **generation_queue** | Fila alternativa (batch); não é a principal para o fluxo atual. |
| **article_queue** | Fila de temas (suggested_theme, status); consumida por `process-queue` que chama `create-generation-job`. |
| **article_opportunities** | Oportunidades do Radar; convertidas via `convert-opportunity-to-article`. |
| **editorial_templates** | Template por blog (company_name, target_niche, mandatory_structure, title_guidelines, tone_rules, cta_template, image_guidelines). Usado em process-queue e contexto de geração. |
| **business_profile** | Nome, telefone, nicho, etc.; usado para CTA e contexto. |
| **content_preferences** | Preferências e `ai_model_text`. |
| **ai_content_cache** | Cache de conteúdo (article/image/seo) por hash. |
| **article_content_scores** | Scores de conteúdo/SEO. |
| **article_internal_links**, **cluster_articles** | Links internos e clusters (existentes; não integrados ao pipeline de geração atual). |
| **serp_analysis_cache** | Cache de análise SERP (usado por seo-enhancer-job / analyze-serp). |

**Schema:**  
- `articles`: não tem `content_type` nem `word_count_target`; tem `content_images` (JSONB) e `source_payload`.  
- `generation_jobs`: tem `job_type` mas não é usado no orchestrate-generation.

---

### 1.3 API routes (Edge Functions) — resumo

| Função | Propósito |
|--------|-----------|
| **create-generation-job** | Entrada do motor; cria job e invoca orchestrate-generation. |
| **orchestrate-generation** | Pipeline em 5 passos (validação → SERP summary → artigo single-pass → save → imagem hero). |
| **process-queue** | Lê `article_queue`, chama create-generation-job. |
| **convert-opportunity-to-article** | Cria placeholder em articles, chama create-generation-job. |
| **ai-router** | Única camada de chamadas LLM (Lovable AI Gateway); tasks: serp_summary, article_gen_single_pass, title_gen, outline_gen, content_gen, etc. |
| **generate-image** | Geração genérica de imagem (prompt, context hero/cover/problem/solution/result); perfis por nicho; cache; upload em article-images. |
| **regenerate-article-images** | Regenera hero + N imagens de seção; usa `imageInjector` para injetar no HTML. |
| **regenerate-single-image** | Regenera uma imagem (capa ou interna por índice). |
| **build-article-outline** | Gera outline (h1, h2[], h3[]) por opportunityId/blogId; não usado no pipeline principal. |
| **analyze-serp** | Análise SERP (Firecrawl/LLM); usado por seo-enhancer-job. |
| **seo-enhancer-job** | Pós-geração: SERP profundo, FAQs, content gaps; não bloqueia UI. |
| **calculate-content-score** | Score de conteúdo. |
| **suggest-themes**, **suggest-keywords**, **suggest-niche-keywords** | Sugestões de tema/keyword. |
| **translate-article** | Tradução. |
| **improve-article-complete**, **improve-seo-item**, **polish-article-final** | Melhorias de texto/SEO. |
| **quality-gate** | Validação antes de publicar. |
| **publish-to-cms**, **schedule-articles**, **publish-scheduled-articles** | Publicação e agendamento. |
| **track-analytics**, **track-link-click** | Analytics. |
| Outras | send-email, weekly-market-intel, article-chat, support-chat, check-limits, check-cache, save-cache, Stripe, etc. |

---

### 1.4 Lógica de criação de conteúdo (texto)

- **Conteúdo principal:** Gerado em **uma única passada** em `orchestrate-generation` → `executeArticleGenSinglePass` → `ai-router` task `article_gen_single_pass`.  
- **Prompt:** Fixo no código; inclui keyword, city, niche, language, serp_summary, CTA; pede 900–1500 palavras, H1/H2/H3, intro answer-first, FAQ 3–5, HTML com `<style>`, image_prompt.  
- **Sem:** outline prévio obrigatório, entidades semânticas explícitas, clusters de topical authority, internal linking automático no pipeline, FAQ schema pronto (JSON-LD), alvo por tipo (super_page vs article).  
- **Outlines:** `build-article-outline` existe mas é usado noutro fluxo (opportunityId/blogId); não está no pipeline create-generation-job → orchestrate-generation.  
- **SERP:** Resumo por LLM (serp_summary); análise SERP “real” (Firecrawl) só no **seo-enhancer-job** em background, depois do artigo salvo.

---

### 1.5 Lógica de geração de imagens

- **Hero (capa):** No pipeline principal, só no passo **IMAGE_GEN_ASYNC**: prompt via JSON do ARTICLE_GEN_SINGLE_PASS; Lovable Gateway `google/gemini-2.5-flash-image`; fallback picsum.photos; upload em `article-images`; atualiza `articles.featured_image_url` e `featured_image_alt`.  
- **Imagens de seção:** Não são geradas no pipeline principal. São geradas **depois**, por **regenerate-article-images** (ou pela UI), que usa `generate-image` por contexto (problem/pain/solution/result) e **imageInjector** para injetar no HTML (exige mínimo 5 H2).  
- **generate-image:** Perfis visuais por nicho (NICHE_VISUAL_PROFILES), cache em `ai_content_cache`, upload em `article-images`, opcionalmente atualiza `articles.featured_image_url` ou `content_images`.  
- **Provedor atual:** Lovable AI Gateway (Gemini 2.5 Flash Image). **Não há integração com “Gemini Nano Banana”** (nome a confirmar; pode ser Imagen ou outro produto Google).

---

## PARTE 2 — PARTES QUEBRADAS / INCONSISTÊNCIAS

1. **`job_type` ignorado**  
   `generation_jobs.job_type` existe (`article` \| `super_page`) mas `orchestrate-generation` não bifurca por tipo: tudo é gerado como artigo curto (900–1500 palavras) e uma única imagem hero.

2. **Enum de passos desatualizado**  
   O enum `generation_step_name` no SQL tinha passos do motor v1 (SERP_ANALYSIS, NLP_KEYWORDS, TITLE_GEN, OUTLINE_GEN, CONTENT_GEN, IMAGE_GEN, SEO_SCORE, META_GEN, OUTPUT). O código v2 usa strings (INPUT_VALIDATION, SERP_SUMMARY, ARTICLE_GEN_SINGLE_PASS, SAVE_ARTICLE, IMAGE_GEN_ASYNC). A migração que converteu `step_name` para TEXT com regex resolve o armazenamento, mas o enum em migrações antigas fica órfão.

3. **Super Pages inexistentes**  
   Não há fluxo nem schema para “Super Page” (3000–6000 palavras, clusters, entidades, internal linking, FAQ schema). O mesmo vale para diferenciação de “Article” (1500–3000 palavras, SEO local, NLP keywords).

4. **Pipeline não segue o desenho desejado**  
   O desenho alvo é:  
   `keyword → serp analysis → outline → entities → content → images → seo score → publish`.  
   O atual é:  
   `keyword → serp summary (LLM) → article single pass (content + 1 image_prompt) → save → hero image`.  
   Faltam: SERP real, outline obrigatório, etapa de entidades, geração de imagens de seção no pipeline principal, passo de SEO score antes de publish, e integração explícita de internal linking.

5. **Imagens de seção fora do pipeline**  
   Imagens de seção são opcionais e feitas depois (regenerate-article-images), com requisito de ≥5 H2. No V2 desejado, hero + section images + ilustrações contextuais devem fazer parte do fluxo principal.

6. **SERP “real” só em background**  
   `seo-enhancer-job` e `analyze-serp` fazem análise SERP mais profunda (Firecrawl) depois do artigo estar salvo. No V2, a análise SERP deve ser passo de entrada (keyword → serp analysis) para outline e conteúdo.

7. **Sem distinção de conteúdo em `articles`**  
   A tabela `articles` não tem `content_type` (article vs super_page). Listagens e regras de negócio não podem diferenciar.

8. **Internal linking e clusters não integrados**  
   `article_internal_links` e `cluster_articles` existem mas não são alimentados pelo pipeline de geração atual.

---

## PARTE 3 — MÓDULOS QUE FALTAM (PARA V2)

1. **Tipagem de conteúdo (Super Page vs Article)**  
   - Schema: `content_type` em `articles` (e/ou uso consistente de `generation_jobs.job_type`).  
   - Regras de palavra: Super Page 3000–6000; Article 1500–3000.  
   - UI: seleção de tipo ao criar job.

2. **SERP como passo de entrada**  
   - Módulo de análise SERP (real: API DataForSEO/SerpAPI/Firecrawl ou híbrido) que alimente outline e entidades.  
   - Integração no pipeline antes de outline (não só em background).

3. **Outline obrigatório no pipeline**  
   - Geração de outline (H1/H2/H3) como passo explícito após SERP, com formato estável (ex.: JSON) para o passo de conteúdo.  
   - Reutilizar/expandir `build-article-outline` e integrar em `orchestrate-generation`.

4. **Entidades semânticas**  
   - Passo que extrai/gera entidades (tópicos, termos, pessoas, lugares) a partir de keyword + SERP + outline.  
   - Armazenamento: nova tabela ou JSONB em job/artigo para uso em conteúdo e internal linking.

5. **Clusters de autoridade e internal linking**  
   - Definição de clusters (pillar + clusters) por blog/niche.  
   - Passo que sugere/insere links internos no conteúdo (usando `article_internal_links` e `cluster_articles`).  
   - Dados de entidades e outline como entrada.

6. **Conteúdo estilo SEOwriting.ai (Super Page)**  
   - Estrutura fixa: introdução, seções por H2/H3, FAQ, schema-ready.  
   - Tamanho 3000–6000 palavras; uso de entidades e clusters no prompt.  
   - Article: 1500–3000 palavras, SEO local, expansão de keywords (NLP).

7. **FAQ + schema pronto**  
   - Geração de FAQ no conteúdo e gravação em campo estruturado (já existe `articles.faq`).  
   - Geração de JSON-LD (FAQPage, Article) e armazenamento (ex.: campo `schema_json` ou similar) para publicação.

8. **Pipeline de imagens unificado (Gemini Nano Banana)**  
   - Substituir/abstrair o uso atual de Lovable Gateway para imagens por **Gemini Nano Banana** (API exata a confirmar).  
   - No pipeline: hero + imagens por seção + ilustrações contextuais, no mesmo fluxo (não só “regenerate” depois).  
   - Módulo de geração que receba outline/seções e devolva lista de imagens (hero + section + contextual) e upload em `article-images`, atualizando `articles.featured_image_url` e `content_images`.

9. **Passo de SEO score antes de publish**  
   - Cálculo de score (reutilizar/estender `calculate-content-score`) como passo do pipeline.  
   - Opcional: quality-gate que exige score mínimo para permitir publish.

10. **Orquestração dual (Super Page vs Article)**  
    - Um único orquestrador que, a partir de `job_type` (e/ou `content_type`), escolhe:  
      - tamanho e prompts (Super Page vs Article),  
      - passos de outline/entidades/clusters,  
      - número e tipo de imagens (hero + section + contextuais).  

---

## PARTE 4 — ROADMAP DE REFATORAÇÃO

### Fase 0 — Preparação (schema e contratos)

- **0.1** Adicionar em `articles`: `content_type` (`article` \| `super_page`), opcionalmente `word_count_target`, `schema_json` (JSONB) para FAQ/Article schema.  
- **0.2** Garantir que `create-generation-job` e UIs aceitem e persistam `job_type` (e que seja lido no orchestrate).  
- **0.3** Documentar contrato do pipeline V2 (passos, nomes, input/output por passo) e decidir se `generation_step_name` fica só como TEXT.

### Fase 1 — Pipeline linear único (article atual melhorado)

- **1.1** Introduzir passo **SERP_ANALYSIS** real (ou híbrido) no início: keyword → análise SERP → output usado em outline e conteúdo.  
- **1.2** Incluir passo **OUTLINE_GEN** obrigatório após SERP: chamar `build-article-outline` ou equivalente com output SERP; output estável (JSON) para o próximo passo.  
- **1.3** Alterar **ARTICLE_GEN** para ser “outline-driven”: receber outline + SERP + entidades (fase 2); manter article 1500–3000 palavras como primeiro alvo.  
- **1.4** Adicionar passo **SEO_SCORE** após SAVE_ARTICLE (e antes ou depois de imagens); persistir em `article_content_scores` e opcionalmente em job.

### Fase 2 — Super Pages e entidades

- **2.1** Implementar ramo **Super Page** no orquestrador: mesmo pipeline mas com passo de conteúdo 3000–6000 palavras, estrutura SEOwriting.ai, FAQ + schema.  
- **2.2** Módulo de **entidades semânticas**: passo que recebe keyword + SERP + outline e devolve entidades (JSON); armazenar em job ou em novo campo em `articles`.  
- **2.3** Integrar entidades nos prompts de conteúdo (Super Page e Article).  
- **2.4** Módulo de **internal linking**: usar clusters + entidades + artigos existentes para sugerir/inserir links; persistir em `article_internal_links` / `cluster_articles`.

### Fase 3 — Imagens (Gemini Nano Banana)

- **3.1** Definir API “Gemini Nano Banana” (ou Imagen/outro) e criar cliente/Edge Function para geração de imagem.  
- **3.2** Abstrair camada de imagens: interface única (ex.: “ImageProvider”) com implementação Lovable atual e implementação Gemini Nano Banana; config por env ou por blog.  
- **3.3** No pipeline: passo **IMAGE_GEN** que gera hero + N imagens de seção (a partir do outline) + ilustrações contextuais; upload e atualização de `featured_image_url` e `content_images`; usar `imageInjector` para injetar no HTML.  
- **3.4** Remover dependência de “regenerate-article-images” para o fluxo principal (manter como fallback/regeneração manual).

### Fase 4 — SEO avançado e publish

- **4.1** FAQ e JSON-LD: gerar e guardar `schema_json` (FAQPage + Article) em `articles`.  
- **4.2** Quality gate: opcionalmente bloquear publish se SEO score &lt; threshold.  
- **4.3** Passo **PUBLISH** (opcional no pipeline): marcar publicado, notificar, IndexNow, etc.

### Fase 5 — Limpeza e observabilidade

- **5.1** Deprecar/remover passos e enums órfãos; alinhar nomes de passos em código e em relatórios.  
- **5.2** Logs e métricas por passo (latência, custo, tipo de conteúdo).  
- **5.3** Documentação da arquitetura V2 e runbook de deploy (incl. Vercel).

---

## RESUMO EXECUTIVO

| Aspecto | Atual | Alvo V2 |
|--------|--------|--------|
| **Tipos de conteúdo** | Só artigo (900–1500 palavras) | Super Page (3000–6000) + Article (1500–3000) |
| **SERP** | Resumo LLM; análise real só em background | Análise SERP como passo de entrada |
| **Outline** | Não no pipeline principal | Passo obrigatório (outline-driven content) |
| **Entidades / clusters** | Não integrados | Passo de entidades + internal linking |
| **Imagens** | Hero no pipeline; seção só em “regenerate” | Hero + section + contextuais no pipeline (Gemini Nano Banana) |
| **FAQ / schema** | FAQ no conteúdo; sem JSON-LD persistido | FAQ + schema JSON-LD em BD |
| **Pipeline** | keyword → serp summary → single-pass → save → hero | keyword → serp → outline → entities → content → images → seo score → publish |

**Próximo passo recomendado:** Fase 0 (schema + contratos) e Fase 1.1–1.2 (SERP real + outline no pipeline), sem alterar ainda o tamanho do artigo nem introduzir Super Pages. Em seguida, Fase 3 (imagens) e 2 (Super Pages + entidades) em paralelo ou sequencial conforme prioridade de produto.
