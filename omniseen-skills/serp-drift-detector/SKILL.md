# SKILL: serp-drift-detector

## Finalidade
Detecta quando o conteúdo do tenant está sendo superado na SERP por mudanças de algoritmo ou novos concorrentes. Compara o perfil atual do top-3 com o perfil que o conteúdo do tenant foi criado para cobrir. Gera um "drift score" por conteúdo — quanto o SERP se afastou do que o tenant tem publicado.

## Motor
MOTOR 4 — REFRESH

## Agentes que usam esta skill
- content-refresh-agent (ciclo semanal, após performance-feedback-loop)

## Inputs
```json
{
  "tenant_id": "uuid",
  "content_items": [
    {
      "content_id": "uuid",
      "keyword": "string",
      "locale": "pt-BR | en-US",
      "current_headings": ["string"],
      "current_schema_types": ["string"],
      "current_word_count": "int",
      "published_at": "timestamptz"
    }
  ],
  "web_research_enabled": "boolean"
}
```

## Outputs
```json
{
  "drift_results": [
    {
      "content_id": "uuid",
      "keyword": "string",
      "drift_score": "float 0-1",
      "drift_level": "none | low | medium | high | critical",
      "changes_detected": {
        "new_dominant_format": "string | null — ex: 'listicle substituiu how-to'",
        "new_required_sections": ["string"],
        "new_schema_expectations": ["string"],
        "word_count_gap": "int",
        "featured_snippet_format_change": "string | null"
      },
      "action_recommended": "no_action | monitor | partial_update | full_rewrite",
      "urgency": "low | medium | high"
    }
  ],
  "high_drift_count": "int",
  "critical_drift_count": "int"
}
```

## Regras de execução
1. Se web_research_enabled = false: usar heurística de age-based drift — conteúdo > 6 meses tem drift assumido medium.
2. Se web_research_enabled = true: chamar top-serp-diff para cada conteúdo (limitar a top 5 por ciclo para controlar custo).
3. drift_score calculado por:
   - format_match: top formato atual == formato do tenant? (0 ou 0.3)
   - sections_coverage: % das seções dominantes presentes no tenant (0 a 0.4)
   - schema_match: schemas do tenant == schemas do top-3? (0 a 0.2)
   - word_count_proximity: abs(tenant - top) / top (0 a 0.1)
4. drift_level: none=0.0-0.15, low=0.16-0.30, medium=0.31-0.50, high=0.51-0.70, critical > 0.70.
5. action_recommended por nível: none=no_action, low=monitor, medium=partial_update, high/critical=full_rewrite.
6. Limitar análise a conteúdos com > 60 dias de publicação.
7. Priorizar keywords com maior strategic_value no omnisim_clusters.

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "serp-drift-detector",
  "agent_key": "content-refresh-agent",
  "input_json": { "content_items_count": "int", "web_research": "bool" },
  "output_json": { "high_drift": "int", "critical_drift": "int", "avg_drift_score": "float" },
  "status": "done"
}
```

## Persistência no Supabase
- UPDATE `omnisim_performance_snapshots`: campo drift_score por conteúdo
- Para critical/high: INSERT em `omnisim_refresh_queue` diretamente (não esperar refresh-opportunity-detector)
- Emitir job_event: `{ event_type: "step_completed", message: "serp-drift: N analisados, X high/critical drift detectados" }`
