# OmniSeen — Backlog de Implementação Pendente

## Status atual

O motor de IA base está implementado (AG-01, 02, 05, 07, 10, 11, 13).
As Edge Functions `generate-article`, `generate-super-page`, `sales-agent-chat` e `index-url` existem.

Faltam os agentes de suporte, a infraestrutura de automação e as Edge Functions de orquestração.

---

## Agentes Pendentes (em ordem de prioridade)

### AG-06 — RadarPlanner
**Arquivo**: `agents/radarAgents.ts`
**Propósito**: Seleciona próximo conteúdo a gerar baseado em backlog + mix_policy

```typescript
export async function runRadarPlanner(
  tenantId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ jobType: 'generate_blog' | 'generate_super_page', itemId: string }>
```

Steps:
1. Ler `automation_schedules.mix_policy` do tenant
2. Contar blog vs super_page gerados no período
3. Selecionar `radar_items` com maior `strategic_value` e status `backlog`
4. Respeitar `mix_policy` ({blog: 0.7, super_page: 0.3})
5. Marcar item como `picked` ao enfileirar
6. Retornar job type e item ID

---

### AG-03 — TrendAnalyst
**Arquivo**: `agents/radarAgents.ts`
**Propósito**: Enriquece radar_items com dados de tendência

Steps:
1. Buscar trends por keyword via Google Trends (pytrends proxy ou Serpstat)
2. Cache 7 dias por keyword+market em tabela `trends_cache`
3. Calcular trend_score (0-100)
4. Atualizar `radar_items.strategic_value` com peso de trend

---

### AG-16 — WordPressPublisher
**Arquivo**: `agents/publishAgents.ts`
**Propósito**: Publica artigo/página no WordPress via REST API

```typescript
export async function runWordPressPublisher(
  tenantId: string,
  contentType: 'post' | 'page',
  contentId: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ wpId: number, wpUrl: string }>
```

Steps:
1. Carregar `cms_integrations` do tenant (WordPress)
2. Buscar credenciais (Application Password — nunca Basic Auth)
3. Mapear `content_html` + `meta_title` + `meta_description` para WP REST format
4. POST para `{base_url}/wp-json/wp/v2/posts` ou `/pages`
5. Salvar `wp_post_id` no registro do conteúdo
6. Logar em `cms_publish_logs`

---

### AG-20 — PerformanceMonitor
**Arquivo**: `agents/analyticsAgents.ts`
**Propósito**: Coleta dados de Google Search Console

Steps:
1. OAuth GSC via `gsc-callback` existente
2. Buscar clicks/impressions/CTR/position por URL do tenant
3. Persistir em `article_analytics` ou tabela dedicada
4. Identificar conteúdo com queda de performance (input para AG-21)

---

### AG-21 — ContentRefreshAdvisor
**Arquivo**: `agents/analyticsAgents.ts`
**Propósito**: Recomenda artigos para atualização

Steps:
1. Ler performance dos últimos 90 dias (via AG-20)
2. Identificar artigos com: impressões altas + CTR baixo OU posição 5-20
3. Gerar recomendação: update título/meta vs reescrever vs expandir
4. Criar `radar_items` com `recommended_asset_type: 'refresh'`

---

## Edge Functions Pendentes

### `content-api` (P0)
**Propósito**: API pública do portal com service_role. Portal nunca acessa Supabase diretamente.

Input: `{ host: string, route: string, params?: object }`
Output: `{ tenant: {...}, data: any }`

Routes a implementar:
- `blog.home` — listagem de posts publicados
- `blog.article` — artigo por slug
- `blog.category` — posts por categoria
- `blog.search` — FTS em artigos
- `page.landing` — super page por slug
- `sitemap.urls` — URLs para sitemap.xml
- `agent.config` — configuração do Sales Agent
- `robots.txt` — robots.txt dinâmico

---

### `scheduler-tick` (P0)
**Propósito**: Cron job que cria jobs quando chega o horário do tenant

Lógica:
1. Buscar todos `automation_schedules` com `enabled = true`
2. Para cada schedule, calcular se está "due" no timezone do tenant
3. Se due e sem job recente: criar job `generate_blog` ou `generate_super_page`
4. Emitir `job_events` de criação

---

### `jobs-runner` (P0)
**Propósito**: Processa fila de jobs com claim/lock atômico

Lógica:
1. Claim job com `FOR UPDATE SKIP LOCKED` (1 por tenant por vez)
2. Despachar para handler correto por `job_type`
3. Emitir `job_events` em cada step
4. Atualizar status para `done` ou `failed`
5. Retry automático (máx 3x) com backoff

Job types:
- `radar_run` → `runRadarGenerate()`
- `generate_blog` → `generate-article` function
- `generate_super_page` → `generate-super-page` function
- `sitemap_refresh` → rebuild sitemap
- `wordpress_publish` → `runWordPressPublisher()`

---

### `planner` (P1)
**Propósito**: Decide o que gerar baseado no backlog

Integra: `runRadarPlanner()` (AG-06) chamado pelo scheduler-tick

---

### `robots-generate` (P1)
**Propósito**: Serve `/robots.txt` dinâmico por tenant

Output:
```
User-agent: *
Allow: /
Sitemap: https://{host}/sitemap.xml
```

---

### `domain-verify` (P1)
**Propósito**: Verifica TXT DNS de domínio custom

Lógica:
1. Buscar `tenant_domains` com status `pending`
2. Resolver TXT record do domínio
3. Verificar se TXT contém token esperado
4. Atualizar status para `active` ou manter `pending`

---

### `wordpress-test-connection` (P2)
Input: `{ tenant_id, site_url, credentials }`
Output: `{ ok: boolean, wp_version?: string }`

---

## Migrations Pendentes

### `job_events` (P0)
Tabela de auditoria step-a-step de jobs. Ver `types/pipeline.ts` para campos.

### `ai_run_steps` (P0)
Logging por etapa de pipeline. Essencial para "nada oculto".

### `automation_schedules` (P0)
Adicionar campos: `mix_policy jsonb`, `market_policy jsonb`, `timezone text`, `days_of_week int[]`

### `super_page_templates` (P1)
Catálogo executável. Seed de 5 templates: Telhados, Dedetização, Clínica, Limpeza, Reforma.

### `super_page_versions` (P1)
Histórico de versões de super pages publicadas.

### `radar_runs` (P1)
Runs do Radar com seed_topic, market, status. Diferente de `market_intel_weekly`.
