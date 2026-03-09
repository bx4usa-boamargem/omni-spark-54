# SKILL: backlog-prioritizer

## Finalidade
Ordena os radar_items disponíveis no backlog por prioridade de execução. Combina strategic_value, recência do cluster, market_policy e histórico do tenant para selecionar o item exato a ser gerado no próximo job. Marca o item como "picked" ao enfileirar.

## Motor
MOTOR 1 — DECISÃO

## Agentes que usam esta skill
- content-planner-agent (chamada final antes de criar o job)

## Inputs
```json
{
  "tenant_id": "uuid",
  "next_job_type": "generate_blog | generate_super_page",
  "market_policy": {
    "cities": ["string"],
    "priority_geo": "string | null"
  },
  "backlog_items": [
    {
      "id": "uuid",
      "cluster_label": "string",
      "primary_keyword": "string",
      "intent": "string",
      "strategic_value": "int 0-100",
      "recommended_asset_type": "blog | super_page",
      "recommended_template_id": "uuid | null",
      "angle": "string",
      "next_step": "string",
      "created_at": "timestamptz",
      "status": "backlog"
    }
  ],
  "recently_produced_keywords": ["string"],
  "locale": "pt-BR | en-US"
}
```

## Outputs
```json
{
  "selected_item": {
    "id": "uuid",
    "cluster_label": "string",
    "primary_keyword": "string",
    "recommended_template_id": "uuid | null",
    "angle": "string",
    "next_step": "string",
    "final_priority_score": "int",
    "selection_reason": "string"
  },
  "skipped_items": [
    {
      "id": "uuid",
      "reason": "string"
    }
  ]
}
```

## Regras de execução
1. Filtrar apenas itens com `status = backlog` e `recommended_asset_type` compatível com `next_job_type`.
2. Excluir itens cujo `primary_keyword` está em `recently_produced_keywords` (últimos 90 dias).
3. Ordenar por: strategic_value DESC, depois por created_at ASC (mais antigo primeiro em empate).
4. Se market_policy.priority_geo definido: booster de +15 para itens que contêm a cidade prioritária.
5. Selecionar o primeiro item da lista ordenada.
6. Marcar item selecionado como `status = picked` no banco ANTES de retornar.
7. Máximo de 1 item selecionado por execução.
8. Se nenhum item disponível: retornar `selected_item = null` + job_event warning.
9. Nunca selecionar item sem `primary_keyword` definido.
10. Logar todos os itens saltados com reason.

## Validações obrigatórias
- [ ] backlog_items não vazio antes de executar
- [ ] selected_item tem id, primary_keyword e angle preenchidos
- [ ] Status do item foi atualizado para "picked" no Supabase antes de retornar
- [ ] recently_produced_keywords checado — sem repetição de keyword em 90 dias

## Riscos
- **Keyword recente repetida**: se o mesmo keyword foi gerado há 89 dias, a exclusão por 90 dias evita duplicata semântica.
- **Backlog vazio**: emitir job_event warning com level "warn" para o tenant saber que precisa rodar Radar.
- **Picked mas job falha**: se o job falhar, resetar o item para `status = backlog`. Responsabilidade do jobs-runner.

## Step-level logging
```json
{
  "step_key": "backlog-prioritizer",
  "agent_key": "content-planner-agent",
  "input_json": "<backlog_items + filters>",
  "output_json": "<selected_item + skipped_items>",
  "status": "done | failed | warn"
}
```

## Persistência no Supabase
- UPDATE `omnisim_clusters` SET status = 'picked' WHERE id = selected_item.id
- UPDATE `article_opportunities` SET status = 'in_progress' WHERE id = selected_item.id (tabela existente)
- Emitir job_event: `{ event_type: "step_completed", message: "backlog-prioritizer: selecionado cluster X (score: 88)", data_json: { selected_id, skipped_count } }`

## Exemplo de output
```json
{
  "selected_item": {
    "id": "uuid-cluster-042",
    "cluster_label": "dedetização-residencial-sp",
    "primary_keyword": "dedetização residencial São Paulo",
    "recommended_template_id": "uuid-template-local-service",
    "angle": "Serviço profissional com garantia em 24h na capital paulista",
    "next_step": "Gerar super_page com template local_service, focar em urgência e cobertura geográfica",
    "final_priority_score": 103,
    "selection_reason": "strategic_value=88 + geo_boost=15 por São Paulo ser priority_geo"
  },
  "skipped_items": [
    { "id": "uuid-cluster-011", "reason": "keyword já produzida em 2025-12-15" },
    { "id": "uuid-cluster-033", "reason": "recommended_asset_type=blog, incompatível com next_job_type=generate_super_page" }
  ]
}
```
