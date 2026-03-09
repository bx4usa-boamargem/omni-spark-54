# SKILL: mix-policy-engine

## Finalidade
Aplica a mix_policy configurada no automation_schedule para decidir se o próximo job deve ser blog ou super_page. Lê o histórico recente do tenant para evitar desequilíbrio entre tipos de conteúdo. Garante que a automação respeita a estratégia definida pelo usuário.

## Motor
MOTOR 1 — DECISÃO

## Agentes que usam esta skill
- content-planner-agent (chamada obrigatória antes de criar qualquer job)

## Inputs
```json
{
  "tenant_id": "uuid",
  "mix_policy": {
    "blog": "float 0-1 — ex: 0.7",
    "super_page": "float 0-1 — ex: 0.3"
  },
  "market_policy": {
    "cities": ["string"],
    "regions": ["string"],
    "priority_geo": "string | null"
  },
  "recent_jobs": [
    {
      "job_type": "generate_blog | generate_super_page",
      "created_at": "timestamptz",
      "status": "done | failed"
    }
  ],
  "backlog_available": {
    "blog_items": "int — clusters com recommended_asset_type=blog",
    "super_page_items": "int — clusters com recommended_asset_type=super_page"
  }
}
```

## Outputs
```json
{
  "next_job_type": "generate_blog | generate_super_page",
  "reason": "string",
  "current_ratio": {
    "blog": "float",
    "super_page": "float"
  },
  "target_ratio": {
    "blog": "float",
    "super_page": "float"
  },
  "geo_focus": "string | null — cidade/região prioritária se market_policy ativo"
}
```

## Regras de execução
1. Calcular ratio atual dos últimos N jobs (N = 10 ou todos os jobs do último ciclo).
2. Se ratio atual de blog > mix_policy.blog × 1.2: forçar super_page.
3. Se ratio atual de super_page > mix_policy.super_page × 1.2: forçar blog.
4. Se backlog de um tipo está vazio: forçar o tipo disponível independente do ratio.
5. Se market_policy.cities não vazio: preferir super_page para cidade prioritária.
6. mix_policy.blog + mix_policy.super_page DEVE somar 1.0 — validar antes de aplicar.
7. Fallback padrão se mix_policy não definida: blog=0.6, super_page=0.4.
8. Nunca criar job de tipo para o qual não há backlog disponível.

## Validações obrigatórias
- [ ] mix_policy.blog + mix_policy.super_page == 1.0 (±0.01)
- [ ] backlog_available tem ao menos 1 item do tipo escolhido
- [ ] next_job_type é "generate_blog" ou "generate_super_page" — sem outros valores
- [ ] reason não vazio

## Riscos
- **Starvation**: se backlog de super_page esgota, automação só gera blog. Mitigação: emitir job_event warning quando backlog de qualquer tipo < 3 itens.
- **Policy ignorada**: se tenant não configurou mix_policy, usar fallback e logar warning.

## Step-level logging
```json
{
  "step_key": "mix-policy-engine",
  "agent_key": "content-planner-agent",
  "input_json": "<mix_policy + recent_jobs + backlog>",
  "output_json": "<next_job_type + reason + ratios>",
  "status": "done | failed"
}
```

## Persistência no Supabase
- Não persiste diretamente — output vai para content-planner-agent montar o job payload
- Emitir job_event: `{ event_type: "log", message: "mix-policy-engine: next=generate_blog, ratio_atual=0.6/0.4, target=0.7/0.3" }`

## Exemplo de payload
```json
{
  "tenant_id": "uuid-001",
  "mix_policy": { "blog": 0.7, "super_page": 0.3 },
  "market_policy": { "cities": ["São Paulo", "Campinas"], "priority_geo": "São Paulo" },
  "recent_jobs": [
    { "job_type": "generate_blog", "created_at": "2026-03-01", "status": "done" },
    { "job_type": "generate_blog", "created_at": "2026-03-03", "status": "done" },
    { "job_type": "generate_super_page", "created_at": "2026-03-05", "status": "done" },
    { "job_type": "generate_blog", "created_at": "2026-03-07", "status": "done" }
  ],
  "backlog_available": { "blog_items": 12, "super_page_items": 5 }
}
```

## Exemplo de output
```json
{
  "next_job_type": "generate_super_page",
  "reason": "Ratio atual blog=0.75/super_page=0.25 está acima do target blog=0.70. Forçar super_page para reequilibrar. Geo-focus: São Paulo.",
  "current_ratio": { "blog": 0.75, "super_page": 0.25 },
  "target_ratio": { "blog": 0.70, "super_page": 0.30 },
  "geo_focus": "São Paulo"
}
```
