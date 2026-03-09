# SKILL: run-step-logger

## Finalidade
Utilitário central de logging de steps de IA. Toda skill do Motor 3, 4 e 5 que chama um modelo de IA DEVE chamar esta skill para registrar o step em ai_run_steps e emitir o job_event correspondente. Garante que nenhum step passa sem rastro. É a implementação do princípio "nada oculto".

## Motor
MOTOR 5 — OBSERVABILIDADE

## Agentes que usam esta skill
- Todos os agentes que executam steps de IA (obrigatório)
- longform-article-orchestrator, superpage-orchestrator, market-radar-agent, content-refresh-agent, content-planner-agent

## Inputs
```json
{
  "ai_run_id": "uuid — run pai (criado pelo ai-gateway-abstraction)",
  "job_id": "uuid",
  "tenant_id": "uuid",
  "step_key": "string — nome da skill executada",
  "agent_key": "string — nome do agente chamador",
  "step_status": "started | done | failed | warn",
  "input_json": "object — inputs resumidos (sem dados sensíveis)",
  "output_json": "object | null — output da skill",
  "tokens_in": "int | null",
  "tokens_out": "int | null",
  "cost_estimate": "decimal | null",
  "error_message": "string | null",
  "duration_ms": "int | null"
}
```

## Outputs
```json
{
  "ai_run_step_id": "uuid — ID criado no banco",
  "job_event_id": "uuid — ID do job_event emitido",
  "logged": "boolean"
}
```

## Regras de execução
1. SEMPRE chamar com step_status="started" ao INICIAR uma skill de IA.
2. SEMPRE chamar com step_status="done" | "failed" | "warn" ao CONCLUIR.
3. Se step_status="started": INSERT em ai_run_steps (status=running).
4. Se step_status="done": UPDATE ai_run_steps SET status=done, output_json, tokens, cost, duration.
5. Se step_status="failed": UPDATE ai_run_steps SET status=failed, error_message.
6. Emitir job_event para CADA chamada:
   - started → event_type="step_started"
   - done → event_type="step_completed"
   - failed → event_type="error"
   - warn → event_type="warn"
7. input_json: remover campos com dados pessoais (email, telefone, nome de usuário).
8. output_json: se output for muito grande (> 10KB), salvar referência ao artifact em vez do JSON completo.
9. cost_estimate: calcular em USD com 6 casas decimais.
10. duration_ms: calculado como timestamp_now - timestamp_started.
11. Esta skill é SÍNCRONA — não pode falhar silenciosamente. Se o INSERT falhar: logar no stderr do Edge Function.

## Cálculo de cost_estimate
- GPT-4o: $2.50/1M tokens_in, $10.00/1M tokens_out
- Claude Sonnet: $3.00/1M tokens_in, $15.00/1M tokens_out
- Gemini 2.5 Flash: $0.30/1M tokens_in, $1.00/1M tokens_out (estimativas)
- Usar tabela interna atualizada via `ai_pipelines` settings

## Validações obrigatórias
- [ ] ai_run_id não nulo — toda step tem run pai
- [ ] step_key corresponde ao nome da skill
- [ ] logged=true antes de retornar
- [ ] job_event emitido sempre que step_status muda

## Riscos
- **Logging bloqueante**: se o INSERT em ai_run_steps falha, NÃO deve bloquear o pipeline. Logar erro mas deixar a geração continuar.
- **Dados sensíveis em input_json**: nunca logar senhas, chaves de API, tokens de auth. Sanitizar antes de persistir.

## Persistência no Supabase
- INSERT/UPDATE em `ai_run_steps` (tabela principal)
- INSERT em `job_events` (auditoria de jobs)
- Ambas as operações em transação quando possível

## Exemplo de uso pelo agente
```typescript
// Ao iniciar o step
const { ai_run_step_id } = await runStepLogger.log({
  ai_run_id: runId,
  job_id: jobId,
  tenant_id: tenantId,
  step_key: "research-step",
  agent_key: "longform-article-orchestrator",
  step_status: "started",
  input_json: { keyword, intent, locale }
});

// Ao concluir
await runStepLogger.log({
  ai_run_id: runId,
  job_id: jobId,
  tenant_id: tenantId,
  step_key: "research-step",
  agent_key: "longform-article-orchestrator",
  step_status: "done",
  output_json: { research_mode, word_count_target },
  tokens_in: 1200,
  tokens_out: 850,
  cost_estimate: 0.000045,
  duration_ms: 3400
});
```
