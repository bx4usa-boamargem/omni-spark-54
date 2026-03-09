# SKILL: geo-keyword-expander

## Finalidade
Expande um keyword de serviço genérico em variações geográficas por cidade, bairro e região. Suporta mercado BR (estados, capitais, bairros) e US (states, cities, neighborhoods). Alimenta clustering local.

## Motor
MOTOR 2 — RADAR

## Agentes que usam esta skill
- market-radar-agent (após intent-cluster-builder quando expand_geo=true)
- content-planner-agent (ao criar jobs com market_policy.cities)

## Inputs
\`\`\`json
{
  "service_keyword": "string — ex: 'dedetização', 'pest control'",
  "locale": "pt-BR | en-US",
  "cities": ["string"],
  "include_neighborhoods": "boolean — default false",
  "include_regions": "boolean — default true",
  "max_variations": "int — default 50"
}
\`\`\`

## Outputs
\`\`\`json
{
  "service_keyword": "string",
  "geo_variations": [
    {
      "keyword": "string",
      "city": "string",
      "region": "string | null",
      "neighborhood": "string | null",
      "volume_proxy": "low | medium | high",
      "intent": "local"
    }
  ],
  "total_variations": "int",
  "locale": "pt-BR | en-US"
}
\`\`\`

## Regras de execução
1. Para PT-BR: expandir por estado (SP, RJ, MG) + capital + cidades principais.
2. Para EN-US: expandir por state + city + "near me" variation.
3. Não criar variações sem cidade explícita no keyword — geo deve ser específico.
4. Se include_neighborhoods = true: criar variações só para cidades com > 500k habitantes.
5. Limitar a max_variations — não criar variações redundantes.
6. Marcar todas as variações com intent = "local".

## Validações obrigatórias
- [ ] Inputs não vazios
- [ ] Locale validado (pt-BR | en-US)
- [ ] Output estruturado conforme schema acima
- [ ] Logar step em ai_run_steps com tokens e custo

## Step-level logging
```json
{
  "step_key": "geo-keyword-expander",
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
- Variações adicionadas ao omnisim_clusters como novos itens com intent=local
- Associadas ao radar_run_id pai
