# SKILL: top-serp-diff

## Finalidade
Analisa estruturalmente o conteúdo do tenant versus o top-3 SERP para o mesmo keyword. Identifica seções ausentes, headings fracos e gaps de formato. Usado pelo refresh e pela geração para garantir cobertura SERP-fit.

## Motor
MOTOR 2 — RADAR

## Agentes que usam esta skill
- serp-intelligence-agent
- content-refresh-agent (serp_drift_detector chama esta skill)

## Inputs
\`\`\`json
{
  "keyword": "string",
  "tenant_content_url": "string | null",
  "tenant_content_html": "string | null",
  "locale": "pt-BR | en-US",
  "top_n": "int — default 3"
}
\`\`\`

## Outputs
\`\`\`json
{
  "keyword": "string",
  "missing_sections": ["string"],
  "weak_headings": ["string"],
  "format_gaps": ["string — ex: falta FAQ, falta tabela comparativa"],
  "word_count_gap": "int — diferença de palavras vs top ranqueado",
  "schema_gaps": ["string — schemas que concorrentes têm e tenant não"],
  "action_recommended": "add_sections | rewrite | schema_only | no_action"
}
\`\`\`

## Regras de execução
1. Se tenant_content_url = null (conteúdo não publicado ainda): comparar apenas top SERP entre si para extrair padrão.
2. missing_sections: seções que aparecem em 2+ dos top-3 e estão ausentes no tenant.
3. format_gaps: identificar elementos recorrentes (FAQ, tabela, lista, schema) ausentes.
4. word_count_gap: se gap > 500 palavras, recomendar expansão.
5. Nunca recomendar reescrita total se action_recommended pode ser add_sections.
6. schema_gaps: comparar JSON-LD do tenant vs concorrentes.

## Validações obrigatórias
- [ ] Inputs não vazios
- [ ] Locale validado (pt-BR | en-US)
- [ ] Output estruturado conforme schema acima
- [ ] Logar step em ai_run_steps com tokens e custo

## Step-level logging
```json
{
  "step_key": "top-serp-diff",
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
- Output salvo em omnisim_artifacts (artifact_type=serp_diff)
- Se action_recommended != no_action: adicionar a omnisim_refresh_queue
