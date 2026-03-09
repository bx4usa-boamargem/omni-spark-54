# SKILL: keyword-gap-analyzer

## Finalidade
Compara as keywords/tópicos do tenant com os top concorrentes identificados. Descobre termos que concorrentes ranqueiam e o tenant ainda não cobre. Alimenta o Radar com oportunidades de gap reais.

## Motor
MOTOR 2 — RADAR

## Agentes que usam esta skill
- market-radar-agent
- content-refresh-agent (ao avaliar oportunidades de expansão)

## Inputs
\`\`\`json
{
  "tenant_id": "uuid",
  "tenant_keywords": ["string — keywords que tenant já cobre"],
  "competitor_urls": ["string — domínios dos concorrentes"],
  "industry": "string",
  "locale": "pt-BR | en-US",
  "top_n_gaps": "int — default 20"
}
\`\`\`

## Outputs
\`\`\`json
{
  "gaps": [
    {
      "keyword": "string",
      "competitor_ranking": "string",
      "opportunity_score": "int 0-100",
      "intent": "string",
      "recommended_asset_type": "blog | super_page"
    }
  ],
  "total_gaps": "int"
}
\`\`\`

## Regras de execução
1. Não incluir keywords já cobertas pelo tenant (match exato ou 90%+ similares).
2. Ordenar gaps por opportunity_score DESC.
3. Se competitor_urls vazio: usar heurística de mercado para estimar gaps.
4. Limitar a top_n_gaps resultados — não retornar lista ilimitada.
5. Cada gap deve ter intent classificado.
6. Não chamar SERP API se web_research_enabled = false — usar heurística.

## Validações obrigatórias
- [ ] Inputs não vazios
- [ ] Locale validado (pt-BR | en-US)
- [ ] Output estruturado conforme schema acima
- [ ] Logar step em ai_run_steps com tokens e custo

## Step-level logging
```json
{
  "step_key": "keyword-gap-analyzer",
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
- Gaps salvos como novos clusters em omnisim_clusters com status=backlog
- Emitir job_event ao concluir
