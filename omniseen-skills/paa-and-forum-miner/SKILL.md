# SKILL: paa-and-forum-miner

## Finalidade
Extrai perguntas reais de People Also Ask (PAA) e fóruns relevantes (Reddit, Quora, fóruns PT-BR) para um keyword. Alimenta FAQ, outline e seções de dúvida com perguntas genuínas dos usuários.

## Motor
MOTOR 2 — RADAR

## Agentes que usam esta skill
- serp-intelligence-agent
- longform-article-orchestrator (step research)
- superpage-orchestrator (step research)

## Inputs
\`\`\`json
{
  "keyword": "string",
  "locale": "pt-BR | en-US",
  "max_questions": "int — default 15",
  "include_forums": "boolean — default true"
}
\`\`\`

## Outputs
\`\`\`json
{
  "keyword": "string",
  "paa_questions": ["string"],
  "forum_questions": [
    {
      "question": "string",
      "source": "string",
      "upvotes_proxy": "int"
    }
  ],
  "top_questions": ["string — top 5 consolidadas para usar em FAQ"],
  "locale": "pt-BR | en-US"
}
\`\`\`

## Regras de execução
1. Dedupliar perguntas semanticamente similares.
2. Priorizar perguntas específicas sobre genéricas.
3. Excluir perguntas com teor spam ou irrelevante.
4. top_questions: consolidar as 5 mais relevantes para uso direto em FAQ.
5. Se locale = pt-BR: incluir fóruns brasileiros (Quora PT, Reddit br, fóruns de nicho).
6. Se web_research_enabled = false: usar banco de perguntas heurísticas por intent.

## Validações obrigatórias
- [ ] Inputs não vazios
- [ ] Locale validado (pt-BR | en-US)
- [ ] Output estruturado conforme schema acima
- [ ] Logar step em ai_run_steps com tokens e custo

## Step-level logging
```json
{
  "step_key": "paa-and-forum-miner",
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
- Output salvo em omnisim_artifacts (artifact_type=paa_research)
- Usado downstream pelos steps de outline e section-stack-builder
