# SKILL: strategic-value-scorer

## Finalidade
Atribui um score de 0 a 100 para cada cluster/radar_item com base em múltiplos sinais: intenção comercial, gap de cobertura, dificuldade estimada, ausência no backlog do tenant e potencial de conversão. Alimenta o backlog-prioritizer com dados objetivos.

## Motor
MOTOR 1 — DECISÃO

## Agentes que usam esta skill
- market-radar-agent (após intent-cluster-builder)
- content-planner-agent (re-score quando backlog envelhece > 14 dias)

## Inputs
```json
{
  "cluster": {
    "cluster_label": "string",
    "primary_keyword": "string",
    "secondary_keywords": ["string"],
    "intent": "informational | commercial | local | transactional",
    "estimated_volume_proxy": "low | medium | high",
    "recommended_asset_type": "blog | super_page"
  },
  "tenant_context": {
    "tenant_id": "uuid",
    "existing_content_slugs": ["string"],
    "industry": "string",
    "target_cities": ["string"]
  },
  "competitor_data": {
    "competitors_ranking_this_keyword": "int",
    "has_featured_snippet": "boolean",
    "top_result_domain_authority_proxy": "low | medium | high"
  }
}
```

## Outputs
```json
{
  "cluster_label": "string",
  "strategic_value": "int 0-100",
  "score_breakdown": {
    "intent_score": "int 0-30 — local/transactional=30, commercial=20, informational=10",
    "gap_score": "int 0-25 — ausente no tenant=25, parcialmente coberto=10, coberto=0",
    "difficulty_score": "int 0-20 — baixa dificuldade=20, média=12, alta=5",
    "volume_score": "int 0-15 — high=15, medium=8, low=3",
    "freshness_score": "int 0-10 — cluster novo=10, visto há 30d=5, visto há 90d=0"
  },
  "priority_label": "critical | high | medium | low",
  "reason": "string — explicação em linguagem natural"
}
```

## Regras de execução
1. Intent LOCAL + ausente no tenant = score mínimo 70 (critical por padrão).
2. Keyword já coberta pelo tenant (slug existente com 80%+ de match) = gap_score = 0.
3. Se competidor ranqueando com DA alto = difficulty_score reduzido.
4. Score 80-100 = critical (gerar imediatamente).
5. Score 60-79 = high (próximo ciclo de automação).
6. Score 40-59 = medium (backlog normal).
7. Score 0-39 = low (skip ou manual).
8. Freshness: recalcular score de clusters com > 30 dias sem ser picked.
9. Nunca atribuir score > 50 para conteúdo que o tenant já tem publicado.
10. Logar score_breakdown no ai_run_steps para auditoria.

## Validações obrigatórias
- [ ] strategic_value entre 0 e 100
- [ ] score_breakdown soma deve bater com strategic_value (±2 tolerância por arredondamento)
- [ ] reason não vazio — explicação obrigatória
- [ ] priority_label gerado automaticamente a partir do score

## Riscos
- **Inflação de score**: se todos os clusters ficam acima de 80, o prioritizer perde capacidade de diferenciação. Regra: max 30% dos clusters podem ser "critical" em um único radar_run.
- **Dados de competidor ausentes**: se competitor_data não disponível, usar valores padrão (medium) — não bloquear execução.

## Step-level logging
```json
{
  "step_key": "strategic-value-scorer",
  "agent_key": "market-radar-agent",
  "input_json": "<cluster + tenant_context + competitor_data>",
  "output_json": "<strategic_value + breakdown>",
  "status": "done | failed",
  "tokens_in": "int",
  "tokens_out": "int"
}
```

## Persistência no Supabase
- Atualizar `omnisim_clusters`: campos strategic_value, priority_label, score_breakdown (jsonb)
- Atualizar `article_opportunities` (tabela existente): campo strategic_value
- Emitir job_event: `{ event_type: "step_completed", message: "strategic-value-scorer: cluster X scored N" }`

## Exemplo de payload
```json
{
  "cluster": {
    "cluster_label": "dedetização-residencial-sp",
    "primary_keyword": "dedetização residencial São Paulo",
    "intent": "local",
    "estimated_volume_proxy": "high",
    "recommended_asset_type": "super_page"
  },
  "tenant_context": {
    "tenant_id": "uuid-001",
    "existing_content_slugs": ["servicos-gerais", "contato"],
    "industry": "pest_control",
    "target_cities": ["São Paulo", "Guarulhos"]
  },
  "competitor_data": {
    "competitors_ranking_this_keyword": 3,
    "has_featured_snippet": false,
    "top_result_domain_authority_proxy": "medium"
  }
}
```

## Exemplo de output
```json
{
  "cluster_label": "dedetização-residencial-sp",
  "strategic_value": 88,
  "score_breakdown": {
    "intent_score": 30,
    "gap_score": 25,
    "difficulty_score": 15,
    "volume_score": 15,
    "freshness_score": 10
  },
  "priority_label": "critical",
  "reason": "Keyword local de alto volume, ausente no tenant, dificuldade média. Gerar super_page imediatamente."
}
```
