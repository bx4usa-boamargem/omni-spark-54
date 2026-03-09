# SKILL: intent-cluster-builder

## Finalidade
Agrupa keywords de um seed_topic em clusters por intenção de busca (informacional, comercial, local, transacional). Produto final: lista de clusters prontos para o backlog-prioritizer e strategic-value-scorer consumirem. Suporta PT-BR e EN-US.

## Motor
MOTOR 1 — DECISÃO

## Agentes que usam esta skill
- market-radar-agent (chamada principal)
- content-planner-agent (re-clustering quando backlog está vazio)

## Inputs
```json
{
  "seed_topic": "string — ex: 'dedetização', 'pest control'",
  "locale": "pt-BR | en-US",
  "market": "string — ex: 'São Paulo, BR' | 'Miami, US'",
  "expand_geo": "boolean — se true, chama geo-keyword-expander",
  "tenant_id": "uuid",
  "web_research_enabled": "boolean"
}
```

## Outputs
```json
{
  "clusters": [
    {
      "cluster_label": "string",
      "primary_keyword": "string",
      "secondary_keywords": ["string"],
      "intent": "informational | commercial | local | transactional",
      "locale": "pt-BR | en-US",
      "estimated_volume_proxy": "low | medium | high",
      "recommended_asset_type": "blog | super_page",
      "notes": "string"
    }
  ],
  "total_clusters": "int",
  "locale_used": "pt-BR | en-US"
}
```

## Regras de execução
1. Cada keyword só pode pertencer a UM cluster (sem duplicação cross-cluster).
2. Intenção LOCAL sempre recomenda `recommended_asset_type = super_page`.
3. Intenção INFORMACIONAL sempre recomenda `recommended_asset_type = blog`.
4. Intenção COMERCIAL pode receber super_page ou blog — decidir por `mix_policy`.
5. Intenção TRANSACIONAL recomenda `super_page` com CTA primário de conversão.
6. Mínimo de 3 keywords por cluster para que o cluster seja válido.
7. Se `expand_geo = true`: chamar geo-keyword-expander antes do clustering.
8. Em PT-BR: detectar e incluir variações regionais (ex: "dedetizadora" vs "dedetização").
9. Em EN-US: detectar variações por estado/região quando `market` especificado.
10. Se `web_research_enabled = false`: usar heurística semântica — não chamar SERP API.

## Validações obrigatórias
- [ ] seed_topic não vazio
- [ ] locale é pt-BR ou en-US
- [ ] tenant_id válido
- [ ] Ao menos 1 cluster produzido — se zero, logar warning em job_events e retornar erro estruturado
- [ ] Nenhum cluster com intent = null

## Riscos
- **Clustering superficial**: keywords muito genéricas geram clusters sem distinção clara. Mitigação: forçar separação por intenção mesmo que keywords se sobreponham semanticamente.
- **Locale mixing**: não misturar keywords PT-BR e EN-US no mesmo cluster.
- **Over-clustering**: criar muitos clusters pequenos fragmenta o backlog. Limitar a max 20 clusters por seed_topic.

## Step-level logging
```json
{
  "ai_run_step": {
    "step_key": "intent-cluster-builder",
    "agent_key": "market-radar-agent",
    "input_json": "<inputs acima>",
    "output_json": "<clusters gerados>",
    "status": "done | failed",
    "tokens_in": "int",
    "tokens_out": "int",
    "cost_estimate": "decimal"
  }
}
```

## Persistência no Supabase
- Salvar output em `omnisim_clusters` (uma row por cluster)
- Campos: cluster_label, primary_keyword, secondary_keywords[], intent, strategic_value (null até scorer rodar), recommended_asset_type, tenant_id, radar_run_id
- Emitir job_event: `{ event_type: "step_completed", message: "intent-cluster-builder: N clusters gerados", data_json: { total: N, locale } }`

## Exemplo de payload
```json
{
  "seed_topic": "dedetização",
  "locale": "pt-BR",
  "market": "São Paulo, BR",
  "expand_geo": true,
  "tenant_id": "uuid-tenant-001",
  "web_research_enabled": true
}
```

## Exemplo de output
```json
{
  "clusters": [
    {
      "cluster_label": "dedetização-residencial-sp",
      "primary_keyword": "dedetização residencial São Paulo",
      "secondary_keywords": ["dedetizadora em SP", "dedetização casa SP", "empresa de dedetização São Paulo"],
      "intent": "local",
      "locale": "pt-BR",
      "estimated_volume_proxy": "high",
      "recommended_asset_type": "super_page",
      "notes": "Alta intenção local com cidade explícita"
    },
    {
      "cluster_label": "quanto-custa-dedetizacao",
      "primary_keyword": "quanto custa dedetização",
      "secondary_keywords": ["preço dedetização", "valor dedetização residencial", "dedetização barata"],
      "intent": "commercial",
      "locale": "pt-BR",
      "estimated_volume_proxy": "medium",
      "recommended_asset_type": "blog",
      "notes": "Intenção comercial com pesquisa de preço — blog com FAQ de preços"
    }
  ],
  "total_clusters": 2,
  "locale_used": "pt-BR"
}
```
