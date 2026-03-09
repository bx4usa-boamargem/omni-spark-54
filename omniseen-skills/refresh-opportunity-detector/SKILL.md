# SKILL: refresh-opportunity-detector

## Finalidade
Identifica quais conteúdos publicados precisam ser atualizados e qual tipo de refresh aplicar. Combina sinais de performance, drift de SERP e idade do conteúdo para priorizar a fila de refresh. Output direto para omnisim_refresh_queue.

## Motor
MOTOR 4 — REFRESH

## Agentes que usam esta skill
- content-refresh-agent (após performance-feedback-loop)

## Inputs
```json
{
  "tenant_id": "uuid",
  "performance_scores": "<output completo do performance-feedback-loop>",
  "serp_drift_results": "<output do serp-drift-detector, se disponível>",
  "competitor_alerts": "<output do competitor-change-monitor, se disponível>",
  "content_ages": [
    {
      "content_id": "uuid",
      "published_at": "timestamptz",
      "last_refreshed_at": "timestamptz | null",
      "content_type": "blog | super_page",
      "word_count": "int"
    }
  ],
  "max_refresh_queue_size": "int — default 5 por ciclo"
}
```

## Outputs
```json
{
  "refresh_candidates": [
    {
      "content_id": "uuid",
      "content_type": "blog | super_page",
      "refresh_type": "partial_update | full_rewrite | schema_only | data_update | cta_improvement",
      "priority_score": "int 0-100",
      "triggers": ["string — ex: 'serp_drift', 'performance_decline', 'content_age_180d', 'competitor_alert'"],
      "estimated_effort": "low | medium | high",
      "recommended_skills": ["string — skills do Motor 3 a chamar no refresh"],
      "refresh_notes": "string"
    }
  ],
  "skipped_content": [
    {
      "content_id": "uuid",
      "reason": "string"
    }
  ],
  "total_queued": "int"
}
```

## Tipos de refresh e quando aplicar
| Tipo | Gatilho | Skills recomendadas |
|---|---|---|
| partial_update | performance declining, SERP drift médio | research-step + outline-step (seções específicas) + seo-enrichment-step |
| full_rewrite | performance critical, SERP drift alto | pipeline completo blog.generate.v1 |
| schema_only | schemas desatualizados, FAQPage ausente | schema-builder |
| data_update | conteúdo > 6 meses, dados numéricos desatualizados | article-draft-composer (seções específicas) |
| cta_improvement | conversion_score < 20, leads=0 por 60d | conversion-copy-chief |

## Regras de execução
1. Priorizar por: (1) refresh_urgency=critical, (2) competitor_alert, (3) serp_drift alto, (4) age.
2. max_refresh_queue_size: não enfileirar mais que N itens por ciclo — respeitar budget de IA.
3. Conteúdo com < 30 dias de publicação: skip automático (muito cedo para avaliar).
4. Se full_rewrite E word_count > 4000: estimated_effort=high — alertar antes de criar job.
5. schema_only tem custo baixo — pode ser executado mesmo sem urgência alta.
6. Não enfileirar o mesmo conteúdo duas vezes em menos de 30 dias.
7. Para cada candidato: especificar exatamente quais seções atualizar em partial_update.

## Validações obrigatórias
- [ ] total_queued <= max_refresh_queue_size
- [ ] Cada candidato tem refresh_type definido
- [ ] Nenhum conteúdo com < 30 dias publicado enfileirado
- [ ] recommended_skills listadas para cada candidato

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "refresh-opportunity-detector",
  "agent_key": "content-refresh-agent",
  "input_json": { "performance_items": "int", "serp_drift_items": "int" },
  "output_json": { "total_queued": "int", "full_rewrites": "int", "schema_only": "int" },
  "status": "done"
}
```

## Persistência no Supabase
- INSERT em `omnisim_refresh_queue` (uma row por candidato)
- Campos: content_id, content_type, refresh_type, priority_score, triggers[], recommended_skills[], status='queued', scheduled_at
- Emitir job_event: `{ event_type: "step_completed", message: "refresh-detector: N candidatos enfileirados — X partial, Y full_rewrite, Z schema_only" }`
