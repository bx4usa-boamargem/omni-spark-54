# SKILL: competitor-change-monitor

## Finalidade
Detecta mudanças no ranqueamento de concorrentes para keywords monitoradas. Alerta quando um concorrente supera conteúdo do tenant ou surge um novo competidor na SERP. Gatilho primário do refresh loop.

## Motor
MOTOR 2 — RADAR

## Agentes que usam esta skill
- market-radar-agent (ciclo semanal)
- content-refresh-agent (trigger de drift)

## Inputs
\`\`\`json
{
  "tenant_id": "uuid",
  "keywords": ["string"],
  "competitor_domains": ["string"],
  "previous_snapshot": {
    "date": "date",
    "rankings": [{"keyword": "string", "competitor": "string", "position_proxy": "int"}]
  },
  "locale": "pt-BR | en-US"
}
\`\`\`

## Outputs
\`\`\`json
{
  "changes_detected": "boolean",
  "alerts": [
    {
      "keyword": "string",
      "type": "new_competitor | ranking_drop | featured_snippet_lost",
      "competitor": "string",
      "severity": "high | medium | low",
      "recommended_action": "refresh | new_content | monitor"
    }
  ],
  "content_ids_at_risk": ["uuid — IDs de artigos/páginas do tenant afetados"]
}
\`\`\`

## Regras de execução
1. Comparar snapshot atual com previous_snapshot por keyword.
2. Severity HIGH: concorrente novo entrou top-3 para keyword do tenant.
3. Severity MEDIUM: concorrente subiu 3+ posições para keyword monitorada.
4. Severity LOW: mudança menor de 3 posições.
5. Alimentar omnisim_refresh_queue para cada conteúdo em risco com severity >= medium.
6. Salvar novo snapshot em omnisim_performance_snapshots.

## Validações obrigatórias
- [ ] Inputs não vazios
- [ ] Locale validado (pt-BR | en-US)
- [ ] Output estruturado conforme schema acima
- [ ] Logar step em ai_run_steps com tokens e custo

## Step-level logging
```json
{
  "step_key": "competitor-change-monitor",
  "agent_key": "market-radar-agent | serp-intelligence-agent",
  "input_json": "<inputs>",
  "output_json": "<outputs>",
  "status": "done | failed | warn",
  "tokens_in": "int",
  "tokens_out": "int",
  "cost_estimate": "decimal"
}
```

## Persistência no Supabase
- Salvar snapshot em omnisim_performance_snapshots
- Atualizar omnisim_competitors.last_analyzed_at
- Se changes_detected: criar jobs de refresh em omnisim_refresh_queue
