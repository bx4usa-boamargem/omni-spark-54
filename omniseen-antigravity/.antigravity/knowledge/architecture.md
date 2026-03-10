# OmniSeen AI — Arquitetura e Contexto do Projeto

## O que é o OmniSeen

Plataforma SaaS multi-tenant de automação de SEO e geração de conteúdo com IA para PMEs brasileiras. Clientes são agências de marketing e empresas de serviços locais (telhados, clínicas, dedetização, etc.).

**Diferencial central**: "nada oculto" — cada geração de conteúdo é uma sequência auditável de steps com logs persistidos.

---

## Stack Técnica

| Componente | Tecnologia |
|------------|------------|
| Admin App | React 18 + Vite + TypeScript (Lovable) |
| Portal Público | SPA atual → migrar para Next.js SSR |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Edge Functions | Deno runtime |
| IA principal | Gemini 2.5 Flash/Pro via Lovable AI Gateway |
| Busca SERP | Google Custom Search JSON API (cache 24h) |
| Geolocalização | Google Places API (cache 30d) |
| Indexação | Google Indexing API + IndexNow |

---

## Módulos do Produto

### 1. Radar
Gera backlog acionável de conteúdo para o tenant.
- Input: seed_topic, market, web_research_enabled
- Output: `radar_items` com strategic_value, intent, recommended_asset_type

### 2. Blog
Geração automatizada de artigos SEO.
- Pipeline: SERP Scout → Entity Mapper → Blueprint Architect → Section Writer → Interlink → SEO Pack → Quality Gate

### 3. Super Páginas
Páginas de serviço local (LocalBusiness SEO).
- Templates executáveis com inputs mínimos (empresa, serviço, cidade, telefone)
- Schema.org: LocalBusiness, Service, FAQPage, BreadcrumbList

### 4. Sales Agent
Chat de qualificação de leads embutido no portal.
- Lê contexto da página atual
- Qualifica visitante com perguntas
- Captura lead e entrega via webhook + WhatsApp

### 5. Automação
- `automation_schedules`: define quando gerar (timezone, dias, horário)
- Planner: escolhe o quê gerar (mix_policy: blog vs super_page)
- Jobs runner: claim/lock atômico, 1 job/tenant, retry com backoff

---

## Agentes Implementados

| ID | Nome | Arquivo | Propósito |
|----|------|---------|-----------|
| AG-01 | SerpScout | `agents/serpScout.ts` | SERP + Places paralelo |
| AG-02 | EntityMapper | `agents/serpScout.ts` | Entidades semânticas |
| AG-05 | BlueprintArchitect | `agents/contentAgents.ts` | Gera outline/ContentBlueprint |
| AG-07 | SectionWriter | `agents/contentAgents.ts` | Escreve H2 por H2 |
| AG-10 | SEOPackFinalizer | `agents/seoAgents.ts` | Meta + canonical + JSON-LD |
| AG-11 | QualityGate | `agents/seoAgents.ts` | Score 0-100, retry se < 70 |
| AG-13 | SalesAgentChat | `agents/orchestrator.ts` | Chat + lead scoring |

## Agentes Pendentes

| ID | Nome | Propósito |
|----|------|-----------|
| AG-03 | TrendAnalyst | Google Trends + cache 7d |
| AG-04 | CompetitorGap | PageSpeed + análise gaps |
| AG-06 | RadarPlanner | mix_policy + market_policy |
| AG-16 | WordPressPublisher | REST API publish |
| AG-17 | MultiChannelDistributor | Distribuição multi-canal |
| AG-20 | PerformanceMonitor | GSC + métricas |
| AG-21 | ContentRefreshAdvisor | Recomendação de refresh |
| AG-22 | AICostAuditor | Kill-switch integrado |

---

## Skills Implementadas

| Skill | Arquivo | O que faz |
|-------|---------|-----------|
| `parseSerp()` | `skills/serpParser.ts` | Extrai gaps, formatos, domínios |
| `buildOutline()` | `skills/outlineBuilder.ts` | ContentBlueprint via Gemini Pro |
| `injectLocalSignals()` | `skills/contentSkills.ts` | Injeta cidade/serviço em headings |
| `buildLocalBusinessSchema()` | `skills/contentSkills.ts` | JSON-LD LocalBusiness |
| `buildFAQSchema()` | `skills/contentSkills.ts` | JSON-LD FAQPage |
| `buildBreadcrumbSchema()` | `skills/contentSkills.ts` | JSON-LD BreadcrumbList |
| `checkClaims()` | `skills/contentSkills.ts` | Anti-alucinação (7 padrões regex) |
| `suggestLinks()` | `skills/conversionSkills.ts` | Links internos por relevância |
| `applyLinks()` | `skills/conversionSkills.ts` | Aplica links no HTML |
| `detectDuplication()` | `skills/conversionSkills.ts` | Similaridade Jaccard |
| `scoreLead()` | `skills/conversionSkills.ts` | Score de intenção |

---

## Edge Functions Implementadas

| Função | Propósito |
|--------|-----------|
| `generate-article` | Pipeline completo de artigo |
| `generate-super-page` | Pipeline de super página local |
| `sales-agent-chat` | Chat + lead capture |
| `index-url` | Google Indexing + IndexNow |

## Edge Functions Pendentes

| Função | Propósito |
|--------|-----------|
| `content-api` | API pública do portal (service role) |
| `scheduler-tick` | Cria jobs conforme automation_schedules |
| `planner` | Decide o que gerar (mix_policy) |
| `jobs-runner` | Claim/lock + executa job por tipo |
| `radar-generate` | Pipeline do Radar |
| `robots-generate` | robots.txt dinâmico por tenant |
| `domain-verify` | Verificação DNS de domínio custom |
| `wordpress-publish-post` | Publica artigo no WordPress |
| `wordpress-publish-page` | Publica super page no WordPress |

---

## Modelo de Custos de IA

| Modelo | Input | Output | Uso |
|--------|-------|--------|-----|
| Gemini Flash | $0.075/1M | $0.30/1M | Steps rápidos |
| Gemini Pro | $1.25/1M | $5.00/1M | Steps críticos |

- Custo estimado por artigo: ~$0.02–0.03
- Kill-switch por tenant via `ai_cost_limits` tabela
- `callGeminiTracked()` verifica limite ANTES de chamar

---

## Tabelas Principais do Banco

```
tenants, tenant_members, tenant_settings, tenant_domains
blog_posts (= articles), landing_pages (= super_pages)
article_opportunities (= radar_items)
blog_automation (= automation_schedules)
article_queue (= jobs, parcial)
brand_agent_config, brand_agent_conversations, brand_agent_leads
ai_usage_logs, cms_publish_logs
```

**Gaps pendentes (não existem ainda):**
- `job_events` — auditoria step-a-step de jobs
- `ai_run_steps` — logging por etapa de pipeline
- `ai_pipelines` — definição versionada de pipelines
- `super_page_templates` — catálogo executável de templates
- `super_page_versions` — histórico de versões
- `radar_runs` — runs do radar com seed+market
- `automation_schedules` (com mix_policy, market_policy, timezone)
