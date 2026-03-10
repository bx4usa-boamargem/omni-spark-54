# Workflow: Novo Agent

## Comando: /new-agent

Cria um novo agent seguindo os padrões da arquitetura OmniSeen.

## Conceito

- **Skills** = funções puras (sem I/O externo)
- **Agents** = orquestram skills + IA + Supabase
- **Edge Functions** = entry points HTTP que invocam agents

## Inputs necessários

1. **ID do agent** (ex: AG-03, AG-16)
2. **Nome** (ex: `TrendAnalyst`, `WordPressPublisher`)
3. **Arquivo destino** (ex: `agents/contentAgents.ts`)
4. **Inputs** (campos do `AgentContext`)
5. **Outputs** (campos retornados)
6. **Steps do pipeline** (lista de etapas)
7. **Skills necessárias** (existentes ou novas)

## Template de Agent

```typescript
// src/agents/{arquivo}.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { callGeminiTracked } from "../lib/ai/aiRouter.ts"
import { AgentContext, AgentRun } from "../types/agents.ts"

export async function run{NomeAgent}(
  ctx: AgentContext,
  supabase: ReturnType<typeof createClient>
): Promise<{ resultado: TipoOutput }> {

  const runId = crypto.randomUUID()

  // Step 1
  await logStep(supabase, ctx.jobId, ctx.tenantId, 'step_1_nome', 'started')
  const step1Result = await skill1(ctx.input)
  await logStep(supabase, ctx.jobId, ctx.tenantId, 'step_1_nome', 'completed', step1Result)

  // Step 2 (com IA)
  const step2Result = await callGeminiTracked(supabase, ctx.tenantId, {
    runId,
    stepKey: 'step_2_nome',
    model: 'flash', // ou 'pro'
    prompt: `...`,
  })

  // Persistir resultado
  await supabase.from('tabela').insert({
    tenant_id: ctx.tenantId,
    // ...
  })

  return { resultado: step2Result }
}

async function logStep(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  tenantId: string,
  stepKey: string,
  status: 'started' | 'completed' | 'error',
  data?: unknown
) {
  await supabase.from('job_events').insert({
    job_id: jobId,
    tenant_id: tenantId,
    event_type: status === 'error' ? 'error' : `step_${status}`,
    message: `${stepKey} ${status}`,
    data_json: data ?? null,
  })
}
```

## Regras do Agent

- **Modelo Flash** para: research, parsing, links, validation, scoring
- **Modelo Pro** para: outline, write, SEO pack, schema generation
- Sempre usar `callGeminiTracked()` — nunca chamada direta
- Sempre emitir `job_events` em cada step (started + completed/error)
- Sempre filtrar por `tenant_id` em todas as queries Supabase
- Retornar tipos fortemente tipados (sem `any`)

## Checklist final

- [ ] Tipos de input/output adicionados em `types/agents.ts`
- [ ] `logStep()` em cada step
- [ ] Modelo correto (flash vs pro) por step
- [ ] `tenant_id` em todas as queries
- [ ] Exportar a função do arquivo
- [ ] Importar e invocar na Edge Function correspondente
- [ ] Testar com `supabase functions serve`
