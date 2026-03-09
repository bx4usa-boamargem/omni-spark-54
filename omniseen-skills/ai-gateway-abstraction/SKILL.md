# SKILL: ai-gateway-abstraction

## Finalidade
Camada de abstração unificada para todas as chamadas a modelos de IA (OpenAI GPT, Anthropic Claude, Google Gemini). Padroniza inputs/outputs, roteia para o provider correto, aplica retry com backoff, controla quotas por tenant e registra tokens/custo em cada chamada. Nenhum agente chama o provider diretamente — tudo passa por aqui.

## Motor
MOTOR 5 — OBSERVABILIDADE

## Agentes que usam esta skill
- Todos os agentes sem exceção
- Centraliza 100% das chamadas de IA da plataforma

## Inputs
```json
{
  "provider": "openai | anthropic | google | auto",
  "model": "string — ex: 'gpt-4o', 'claude-sonnet-4-6', 'gemini-2.5-flash'",
  "call_type": "generate_text | generate_structured_json | generate_image",
  "system_prompt": "string | null",
  "user_prompt": "string",
  "response_schema": "object | null — JSON Schema para structured output",
  "max_tokens": "int — default 4096",
  "temperature": "float — default 0.7",
  "tenant_id": "uuid",
  "ai_run_id": "uuid",
  "step_key": "string — step que está fazendo a chamada",
  "fallback_provider": "string | null — se provider principal falha",
  "locale": "pt-BR | en-US | null"
}
```

## Outputs
```json
{
  "output": "string | object — texto gerado ou JSON estruturado",
  "provider_used": "string",
  "model_used": "string",
  "tokens_in": "int",
  "tokens_out": "int",
  "cost_usd": "decimal",
  "latency_ms": "int",
  "finish_reason": "stop | length | content_filter | error",
  "fallback_used": "boolean",
  "quota_remaining_today": "int | null"
}
```

## Roteamento de provider
| Caso de uso | Provider preferencial | Fallback |
|---|---|---|
| Geração de artigos longos | claude-sonnet-4-6 | gpt-4o |
| Structured JSON (outlines, schemas) | gpt-4o | claude-sonnet-4-6 |
| Research e análise rápida | gemini-2.5-flash | gpt-4o-mini |
| Geração de super pages | gemini-2.5-pro | claude-sonnet-4-6 |
| Validação e quality gate | gpt-4o-mini | gemini-2.5-flash |
| provider=auto | Selecionar por call_type acima | — |

## Regras de execução
1. **provider=auto**: selecionar provider baseado em call_type + cost optimization.
2. **Retry com backoff**: rate limit → esperar 2s, 4s, 8s (máx 3 tentativas).
3. **Fallback automático**: se provider principal retorna erro 500+ após 3 tentativas → usar fallback_provider.
4. **Quota check**: antes de chamar, verificar se tenant não excedeu `max_tokens_per_day`. Se excedido: retornar erro estruturado, NÃO chamar API.
5. **generate_structured_json**: se response_schema fornecido, usar function calling / JSON mode do provider. Validar output contra o schema antes de retornar.
6. **Locale no system_prompt**: injetar automaticamente "Responda em Português do Brasil." quando locale=pt-BR se não presente no system_prompt.
7. **Sanitização de prompts**: remover chaves de API, senhas ou dados sensíveis que possam ter vazado no prompt antes de enviar.
8. **Logging automático**: chamar run-step-logger ao iniciar e ao concluir TODA chamada.
9. **Timeout**: 60 segundos por chamada — se exceder, retry com fallback.
10. **finish_reason=content_filter**: logar como warning e retornar erro estruturado sem retry.

## Modelo de quotas por tenant
```json
{
  "tokens_used_today": "int",
  "max_tokens_per_day": "int — configurado em agent_settings",
  "reset_at": "timestamptz — meia-noite do timezone do tenant",
  "kill_switch": "boolean — se true, bloquear todas as chamadas do tenant"
}
```

## Estrutura de cost_estimate
| Modelo | Input ($/1M) | Output ($/1M) |
|---|---|---|
| gpt-4o | 2.50 | 10.00 |
| gpt-4o-mini | 0.15 | 0.60 |
| claude-sonnet-4-6 | 3.00 | 15.00 |
| claude-haiku-4-5 | 0.25 | 1.25 |
| gemini-2.5-pro | 1.25 | 5.00 |
| gemini-2.5-flash | 0.30 | 1.00 |

## Validações obrigatórias
- [ ] tenant_id válido antes de chamar
- [ ] Quota verificada antes de chamar provider
- [ ] ai_run_id presente — toda chamada tem run pai
- [ ] output validado contra response_schema quando call_type=generate_structured_json
- [ ] tokens_in e tokens_out preenchidos sempre

## Riscos
- **Provider indisponível**: se todos os providers falham, retornar erro estruturado com `{ "error": "all_providers_failed", "job_should_retry": true }`.
- **Prompt injection via user content**: conteúdo de terceiros pode tentar injetar instruções no prompt. Envolver conteúdo externo em delimitadores explícitos.
- **Custo explosivo**: sem quota, um bug de loop pode gerar custo ilimitado. kill_switch por tenant e alerta quando custo_dia > threshold.

## Persistência no Supabase
- Atualizar `ai_usage_logs`: tokens_in, tokens_out, cost_estimate, provider, model, step_key, tenant_id
- Atualizar quota diária em `agent_settings` ou tabela de quotas
- Emitir job_event: `{ event_type: "log", message: "ai-gateway: provider=claude, step=article-draft, tokens=4200in/3800out, cost=$0.0048" }`

## Exemplo de chamada (generate_structured_json)
```json
{
  "provider": "auto",
  "call_type": "generate_structured_json",
  "system_prompt": "Você é um especialista em SEO local para o Brasil.",
  "user_prompt": "Gere um outline para o keyword: dedetização residencial São Paulo. Retorne no schema JSON fornecido.",
  "response_schema": {
    "type": "object",
    "properties": {
      "title_suggestion": { "type": "string" },
      "sections": { "type": "array" }
    }
  },
  "max_tokens": 2000,
  "temperature": 0.5,
  "tenant_id": "uuid-001",
  "ai_run_id": "uuid-run-042",
  "step_key": "outline-step",
  "locale": "pt-BR"
}
```
