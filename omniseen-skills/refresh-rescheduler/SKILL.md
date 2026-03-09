# SKILL: refresh-rescheduler

## Finalidade
Define quando cada conteúdo deve ser reavaliado para refresh. Calcula a próxima data de avaliação baseada no tipo de conteúdo, performance atual e resultados do último refresh. Garante que o ciclo de refresh não seja nem muito frequente (desperdício de IA) nem muito raro (conteúdo desatualizado).

## Motor
MOTOR 4 — REFRESH

## Agentes que usam esta skill
- content-refresh-agent (ao concluir um refresh ou ao avaliar portfólio)
- longform-article-orchestrator (pós-publicação — agendar primeiro refresh)
- superpage-orchestrator (pós-publicação)

## Inputs
```json
{
  "content_id": "uuid",
  "content_type": "blog | super_page",
  "event": "post_publish | post_refresh | evaluation_cycle",
  "performance_score": "int 0-100 | null",
  "refresh_type_last": "string | null",
  "days_since_last_refresh": "int | null",
  "serp_volatility": "low | medium | high | unknown",
  "intent": "informational | commercial | local | transactional",
  "tenant_id": "uuid"
}
```

## Outputs
```json
{
  "content_id": "uuid",
  "next_evaluation_date": "date",
  "next_evaluation_in_days": "int",
  "schedule_reason": "string",
  "evaluation_type": "performance_check | serp_check | full_audit",
  "priority_at_evaluation": "low | medium | high"
}
```

## Tabela de intervalos padrão
| Evento / Contexto | Intervalo |
|---|---|
| Pós-publicação (primeiro check) | 30 dias |
| Performance score > 70 (saudável) | 90 dias |
| Performance score 50-70 (estável) | 60 dias |
| Performance score 30-49 (declining) | 30 dias |
| Performance score < 30 (critical) | 14 dias |
| Pós-refresh com melhora > 20% | 60 dias |
| Pós-refresh sem melhora | 30 dias |
| SERP volatility = high | 30 dias (independente de performance) |
| Intent = local + super_page | 45 dias (local muda mais rápido) |
| Intent = informational + blog | 90 dias |

## Regras de execução
1. event=post_publish: sempre agendar 30 dias — primeiro check de performance.
2. Nunca agendar próxima avaliação em < 14 dias.
3. Nunca agendar próxima avaliação em > 180 dias.
4. serp_volatility=high sobrescreve qualquer intervalo maior que 30 dias.
5. evaluation_type=full_audit: apenas para conteúdos com > 180 dias sem refresh + performance < 40.
6. Retornar data absoluta (date) e dias relativos para clareza.
7. schedule_reason deve ser legível por humano — aparece no Admin UI.

## Validações obrigatórias
- [ ] next_evaluation_in_days entre 14 e 180
- [ ] next_evaluation_date >= hoje
- [ ] schedule_reason não vazio

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "refresh-rescheduler",
  "agent_key": "content-refresh-agent | longform-article-orchestrator | superpage-orchestrator",
  "input_json": { "content_id": "...", "event": "...", "performance_score": "int" },
  "output_json": { "next_evaluation_date": "date", "next_evaluation_in_days": "int" },
  "status": "done"
}
```

## Persistência no Supabase
- UPDATE `articles` ou `landing_pages` SET refresh_scheduled_at = next_evaluation_date
- Emitir job_event: `{ event_type: "log", message: "refresh-rescheduler: próxima avaliação em N dias (YYYY-MM-DD) — razão: X" }`
