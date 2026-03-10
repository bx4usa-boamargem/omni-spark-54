# OmniSeen AI — Antigravity Rules

## Contexto do Projeto

OmniSeen é uma plataforma SaaS multi-tenant de automação de SEO e geração de conteúdo para PMEs brasileiras. O runtime de produção é **Supabase Edge Functions (Deno)**. Todo o código gerado deve ser compatível com esse ambiente.

---

## Regras Obrigatórias (SEMPRE seguir)

### Runtime e Imports

- **NUNCA** usar `import` de pacotes Node.js (fs, path, crypto, etc.)
- **SEMPRE** usar imports Deno/ESM com URL: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"`
- Para Supabase: `import { createClient } from "https://esm.sh/@supabase/supabase-js@2"`
- Para variáveis de ambiente: `Deno.env.get("NOME_DA_VAR")` — nunca `process.env`
- Cada Edge Function é um arquivo `index.ts` em `supabase/functions/{nome}/index.ts`

### Multi-tenant

- **TODO** dado de produto tem `tenant_id` — nunca omitir em queries
- **NUNCA** fazer SELECT direto em tabela pública sem filtro `tenant_id`
- RLS está habilitado: usar `service_role` key apenas em Edge Functions server-side
- Portal nunca acessa Supabase diretamente — sempre via `content-api` Edge Function

### TypeScript e Estrutura

- Todos os tipos vivem em `types/agents.ts` e `types/pipeline.ts` — não duplicar
- Skills são funções puras: sem side effects, sem chamadas a Supabase, sem chamadas de IA
- Agents orquestram: chamam skills + IA + persistem em Supabase
- Edge Functions são entry points: validam input, invocam agents, retornam resposta HTTP

### IA (Gemini via Lovable AI Gateway)

- Usar `callGeminiTracked()` de `lib/ai/aiRouter.ts` — NUNCA chamar a API diretamente
- `callGeminiTracked()` verifica kill-switch de custo ANTES de chamar
- Flash para steps rápidos (research, parsing, links, validation)
- Pro para steps críticos (outline, write, SEO pack)
- Sempre registrar `ai_run_steps` por step de pipeline

### Tratamento de Erros

- Edge Functions retornam sempre `{ error: string }` com status HTTP correto em caso de falha
- Nunca expor stack trace ou mensagens internas para o cliente
- Logar erros em `job_events` com `event_type: 'error'` + `data_json` com detalhes

### Segurança

- Nunca logar API keys, tokens ou dados de usuário
- Validar `tenant_id` em TODA operação — não confiar no payload do cliente
- Credenciais WordPress: nunca retornar em responses, nunca logar

---

## Estrutura de Pastas

```
supabase/
  functions/
    {nome}/
      index.ts          ← Entry point (Deno serve)
  migrations/
    {timestamp}_{desc}.sql

src/
  types/
    agents.ts           ← Todos os tipos compartilhados
    pipeline.ts         ← Definições de pipelines
  lib/
    ai/
      aiRouter.ts       ← callGemini, callGeminiTracked
    google/
      customSearch.ts   ← SERP com cache Supabase
      places.ts         ← Places API com cache
      indexing.ts       ← Google Indexing + IndexNow
  skills/
    serpParser.ts       ← Funções puras de parsing
    outlineBuilder.ts   ← Geração de outline
    contentSkills.ts    ← SEO, schema, anti-alucinação
    conversionSkills.ts ← Links internos, lead scoring
  agents/
    serpScout.ts        ← AG-01, AG-02
    contentAgents.ts    ← AG-05, AG-07
    seoAgents.ts        ← AG-10, AG-11
    orchestrator.ts     ← AG-13, pipeline principal
```

---

## Fluxo Padrão de uma Edge Function

```typescript
// supabase/functions/{nome}/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const body = await req.json()
    // validar tenant_id, invocar agent, retornar resultado
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

---

## Variáveis de Ambiente (obrigatórias)

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GOOGLE_CSE_KEY
GOOGLE_CSE_ID
GOOGLE_PLACES_KEY
GOOGLE_INDEXING_SA_KEY    ← JSON da service account (stringified)
INDEXNOW_KEY
```

---

## O que NÃO fazer

- ❌ Não criar novas abstrações de provider de IA — usar `aiRouter.ts`
- ❌ Não fazer fetch para APIs externas sem cache quando há wrapper em `lib/`
- ❌ Não criar tabelas sem `tenant_id` e sem RLS
- ❌ Não hardcodar IDs de tenant, templates ou pipelines
- ❌ Não usar `console.log` em produção — usar `job_events` para auditoria
- ❌ Não retornar dados de outros tenants — sempre filtrar por `tenant_id`
