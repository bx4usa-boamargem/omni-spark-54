# OmniSeen AI Engine — Deploy Guide

## Estrutura do Projeto

```
omniseen/
├── types/
│   ├── agents.ts          # Interfaces: AgentConfig, AgentRun, ContentBlueprint, etc.
│   └── pipeline.ts        # Interfaces: PipelineStep, PipelineRun + definições de pipelines
├── lib/
│   ├── ai/
│   │   └── aiRouter.ts    # Gemini 2.5 Flash/Pro + cost tracking + kill-switch
│   └── google/
│       ├── customSearch.ts # Google CSE + cache 24h
│       ├── places.ts       # Places API (New) + geocoding + cache 30d
│       └── indexing.ts     # Indexing API + IndexNow + Search Console
├── skills/
│   ├── serpParser.ts       # Parse SERP → gaps, formats, domains
│   ├── outlineBuilder.ts   # Blueprint: H1/H2/H3 + meta + local signals
│   ├── contentSkills.ts    # localSignalInjector + schemaBuilder + antiHallucinationGuard
│   └── conversionSkills.ts # internalLinkSuggester + duplicateDetector + leadScorer
├── agents/
│   ├── serpScout.ts        # AG-01: SERP Scout + AG-02: Entity Mapper
│   ├── contentAgents.ts    # AG-05: Blueprint Architect + AG-07: Section Writer
│   ├── seoAgents.ts        # AG-10: SEO Pack Finalizer + AG-11: Quality Gate
│   └── orchestrator.ts     # AG-13: Sales Agent Chat + Orchestrator (full pipeline)
├── supabase/functions/
│   ├── generate-article/index.ts    # POST → full article pipeline
│   ├── generate-super-page/index.ts # POST → super page pipeline
│   ├── sales-agent-chat/index.ts    # POST → real-time chat
│   └── index-url/index.ts           # POST → Google Indexing + IndexNow
└── migrations/
    └── 001_agent_tables.sql  # agent_runs, pipeline_runs, ai_cost_limits, caches
```

## Variáveis de Ambiente (Supabase Secrets)

```bash
# Supabase (auto-injetadas nas Edge Functions)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google APIs
GEMINI_API_KEY=AIza...
GOOGLE_CSE_KEY=AIza...        # Custom Search API Key
GOOGLE_CSE_ID=xxxxx:yyyy      # Custom Search Engine ID
GOOGLE_PLACES_KEY=AIza...     # Places + Geocoding API Key
GOOGLE_INDEXING_SA_KEY={"type":"service_account",...}  # JSON da service account

# IndexNow (Bing/Yandex)
INDEXNOW_KEY=xxxxxxxxxxxxxxxx
```

### Configurar via Supabase CLI:
```bash
supabase secrets set GEMINI_API_KEY=AIza...
supabase secrets set GOOGLE_CSE_KEY=AIza...
supabase secrets set GOOGLE_CSE_ID=xxxxx:yyyy
supabase secrets set GOOGLE_PLACES_KEY=AIza...
supabase secrets set GOOGLE_INDEXING_SA_KEY='{"type":"service_account",...}'
supabase secrets set INDEXNOW_KEY=xxxxxxxxxxxxxxxx
```

## Deploy das Edge Functions

```bash
# Deploy todas as functions de uma vez
supabase functions deploy generate-article
supabase functions deploy generate-super-page
supabase functions deploy sales-agent-chat
supabase functions deploy index-url
```

## Rodar Migrations

```bash
supabase db push
# ou aplicar manualmente:
psql $DATABASE_URL < migrations/001_agent_tables.sql
```

## Exemplo: Gerar Artigo

```bash
curl -X POST https://xxxx.supabase.co/functions/v1/generate-article \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "uuid-do-tenant",
    "publish_mode": "draft",
    "web_research_enabled": false,
    "business": {
      "empresa":  "Dedetizadora Limpa Tudo",
      "servico":  "dedetização",
      "cidade":   "Campinas",
      "estado":   "SP",
      "telefone": "(19) 99999-0000"
    }
  }'
```

## Exemplo: Gerar Super Página

```bash
curl -X POST https://xxxx.supabase.co/functions/v1/generate-super-page \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id":   "uuid-do-tenant",
    "template_id": "uuid-do-template",
    "publish_mode": "publish",
    "inputs": {
      "empresa":  "Telhados Bras",
      "servico":  "conserto de telhado",
      "cidade":   "São Paulo",
      "estado":   "SP",
      "telefone": "(11) 98888-0000",
      "endereco": "Rua das Flores, 123"
    }
  }'
```

## Exemplo: Sales Agent Chat

```bash
curl -X POST https://xxxx.supabase.co/functions/v1/sales-agent-chat \
  -H "Content-Type: application/json" \
  -d '{
    "host":        "dedetizadora.app.omniseen.app",
    "session_id":  "sess_abc123",
    "page_url":    "https://dedetizadora.app.omniseen.app/p/dedetizacao-campinas",
    "page_type":   "super_page",
    "message":     "Quanto custa uma dedetização para apartamento?"
  }'
```

## Pipeline de Geração de Artigo (16 etapas)

```
[1] serpScout      → SERP top10 + local pack (Google CSE + Places)
[2] entityMapper   → Entidades semânticas (Gemini Flash)
[3] blueprint      → Outline completo H1/H2/H3 + meta (Gemini Pro)
[4] sectionWriter  → Escrita por H2 em loop (Gemini Flash × N seções)
[5] qualityGate    → Score ≥ 70? → continua | < 70 → retry sectionWriter
[6] interlink      → 3-8 links internos injetados (Gemini Flash)
[7] seoPack        → meta + canonical + JSON-LD schemas
[8] qualityGate    → Validação final
[9] save           → articles table (status conforme publish_mode)
[10] indexUrl      → Google Indexing API + IndexNow
```

## Custo Estimado por Artigo

| Componente        | Custo       |
|-------------------|-------------|
| Gemini Flash      | ~$0.003     |
| Gemini Pro        | ~$0.015     |
| Google CSE        | $0.005/query |
| Places API        | ~$0 (cached)|
| **Total**         | **~$0.02–0.03 por artigo** |

Para 1.000 clientes × 20 artigos/mês = 20.000 artigos → **~$400–600/mês em IA**.
