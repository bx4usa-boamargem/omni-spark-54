# OmniSeen — Padrões de Código e Decisões Arquiteturais

## Decisões fixas (não questionar, não alterar)

### D-01: Section Writer em loop por H2
AG-07 escreve cada seção (H2) em chamada separada ao Gemini. Evita deriva em artigos longos.
```typescript
for (const section of outline.sections) {
  const content = await callGeminiTracked(supabase, tenantId, {
    stepKey: `write_section_${section.order}`,
    model: 'flash',
    prompt: buildSectionPrompt(section, prevSections, ctx),
  })
  sections.push(content)
}
```

### D-02: Quality Gate com retry
AG-11 score < 70 → reinvoca AG-07 com warnings no contexto. Máximo 1 retry por artigo.
```typescript
if (qaResult.score < 70) {
  ctx.retryWarnings = qaResult.issues
  sections = await runSectionWriter(ctx, supabase) // retry com warnings
}
```

### D-03: Cache Places por cidade+serviço (30 dias)
Chave de cache: `${city.toLowerCase()}_${service.toLowerCase()}`. Reduz 60-70% das chamadas à API.

### D-04: Cache SERP por query+locale (24 horas)
Chave: `${query}_${locale}`. Cache em tabela `serp_cache` do Supabase.

### D-05: callGeminiTracked verifica kill-switch ANTES
Antes de qualquer chamada IA, verifica `ai_cost_limits` para o tenant. Se excedido, lança erro sem chamar a API.

### D-06: Portal não acessa Supabase diretamente
O portal público chama a Edge Function `content-api` com service_role. Nunca usa anon key para leitura de dados do tenant.

### D-07: Jobs com claim/lock atômico
```sql
-- Claim de job (PostgreSQL FOR UPDATE SKIP LOCKED)
UPDATE jobs SET status = 'running', locked_at = NOW(), locked_by = $runner_id
WHERE id = (
  SELECT id FROM jobs
  WHERE status = 'queued' AND tenant_id = $tenant_id
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

---

## Padrões de Response HTTP

```typescript
// Sucesso 200
return new Response(JSON.stringify({ ok: true, data: result }), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})

// Bad Request 400
return new Response(JSON.stringify({ error: 'tenant_id obrigatório' }), {
  status: 400,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})

// Não autorizado 403
return new Response(JSON.stringify({ error: 'Acesso negado' }), {
  status: 403,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})

// Erro interno 500
return new Response(JSON.stringify({ error: error.message }), {
  status: 500,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
})
```

---

## Padrão de Pipeline Run

```typescript
// Criar pipeline_run no início
const { data: pipelineRun } = await supabase
  .from('pipeline_runs')
  .insert({
    tenant_id: tenantId,
    pipeline_key: 'blog.generate.v1',
    status: 'running',
    source_type: 'radar_item',
    source_id: radarItemId,
  })
  .select('id').single()

// Logar cada step
await supabase.from('job_events').insert({
  job_id: jobId,
  tenant_id: tenantId,
  event_type: 'step_started',
  message: 'serpScout iniciado',
  data_json: { step: 'serp_scout' },
})

// Finalizar
await supabase
  .from('pipeline_runs')
  .update({ status: 'done', completed_at: new Date().toISOString() })
  .eq('id', pipelineRun.id)
```

---

## Anti-padrões a evitar

```typescript
// ❌ Import Node
import * as fs from 'fs'
import { join } from 'path'

// ✅ Import Deno
import { readTextFile } from "https://deno.land/std@0.168.0/fs/mod.ts"

// ❌ process.env
const key = process.env.GEMINI_API_KEY

// ✅ Deno.env
const key = Deno.env.get('GEMINI_API_KEY')!

// ❌ Query sem tenant_id
const { data } = await supabase.from('articles').select('*')

// ✅ Sempre filtrar por tenant_id
const { data } = await supabase
  .from('articles')
  .select('*')
  .eq('tenant_id', tenantId)

// ❌ Chamada direta à IA
const response = await fetch('https://generativelanguage.googleapis.com/...')

// ✅ Sempre via callGeminiTracked
const result = await callGeminiTracked(supabase, tenantId, { model: 'flash', ... })

// ❌ RLS permissiva
CREATE POLICY "..." ON tabela FOR ALL USING (true)

// ✅ RLS por tenant_member
CREATE POLICY "..." ON tabela FOR ALL
USING (
  EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND tenant_id = tabela.tenant_id)
)
```

---

## Nomenclatura

| Entidade | Padrão |
|----------|--------|
| Edge Functions | kebab-case: `generate-article`, `sales-agent-chat` |
| Agents | PascalCase com prefixo `run`: `runSerpScout()`, `runQualityGate()` |
| Skills | camelCase: `parseSerp()`, `buildOutline()`, `checkClaims()` |
| Tabelas SQL | snake_case: `blog_posts`, `job_events`, `ai_run_steps` |
| Tipos TypeScript | PascalCase: `AgentContext`, `ContentBlueprint`, `LeadData` |
| Constantes | SCREAMING_SNAKE: `PIPELINE_GENERATE_ARTICLE` |
| Variáveis de env | SCREAMING_SNAKE: `GEMINI_API_KEY`, `SUPABASE_URL` |

---

## Modelo de Dados Resumido

```
tenants (1) ──< tenant_members (N) ── auth.users
tenants (1) ──< tenant_domains (N)
tenants (1) ──< articles / landing_pages (N)
tenants (1) ──< article_opportunities / radar_items (N)
tenants (1) ──< automation_schedules (N)
tenants (1) ──< jobs (N) ──< job_events (N)
tenants (1) ──< ai_usage_logs / ai_run_steps (N)
tenants (1) ──< brand_agent_conversations (N) ──< brand_agent_leads (N)
```
