# SKILL: outline-step

## Finalidade
Step 2 do pipeline de artigos. Gera o outline estruturado do artigo baseado no research_json. Produz hierarquia H2/H3 com objetivo por seção e cobertura de gaps. É o esqueleto que guia o article-draft-composer — qualquer gap no outline se torna gap no artigo.

## Motor
MOTOR 3 — GERAÇÃO

## Agentes que usam esta skill
- longform-article-orchestrator (step 2 do blog.generate.v1)

## Inputs
```json
{
  "research_json": "<output completo do research-step>",
  "keyword": "string",
  "intent": "informational | commercial | local | transactional",
  "locale": "pt-BR | en-US",
  "word_count_target": "int",
  "tenant_context": {
    "industry": "string",
    "brand_name": "string",
    "target_audience": "string | null"
  },
  "ai_run_id": "uuid"
}
```

## Outputs
```json
{
  "outline": {
    "title_suggestion": "string — H1 sugerido",
    "intro_objective": "string — o que a intro deve cobrir",
    "sections": [
      {
        "heading": "string — H2",
        "level": "h2 | h3",
        "objective": "string — o que este bloco deve cobrir",
        "sub_sections": [
          {
            "heading": "string — H3",
            "objective": "string"
          }
        ],
        "must_include": ["string — elementos obrigatórios: FAQ, tabela, lista, CTA"],
        "word_count_estimate": "int"
      }
    ],
    "conclusion_objective": "string",
    "total_estimated_words": "int",
    "gaps_covered": ["string — quais gaps do research este outline cobre"],
    "gaps_not_covered": ["string — gaps que ficaram de fora e por quê"]
  }
}
```

## Regras de execução
1. Outline DEVE cobrir todos os headings com `frequency >= 3` do research_json.
2. Gaps identificados no research DEVEM ter ao menos 1 seção dedicada.
3. PAA questions do research DEVEM aparecer como H3 ou em seção FAQ.
4. Total de seções: 4–8 H2 para artigos até 3000 palavras; 6–12 H2 para artigos acima de 3000.
5. word_count_estimate por seção deve ser proporcional à importância — intro+conclusão = max 20% do total.
6. Para intent=local: incluir seção obrigatória "Áreas Atendidas" e "Perguntas Frequentes".
7. Para intent=informational: incluir seção "O que é" e pelo menos 1 subtópico de aprofundamento.
8. title_suggestion deve conter a keyword primária.
9. must_include: seção com FAQ obrigatória se paa_questions >= 5.
10. Não criar seções duplicadas semanticamente.
11. must_include: CTA obrigatório na última seção para intent commercial/transactional/local.
12. gaps_not_covered: documentar honestamente o que ficou de fora — isso vai para job_events.

## Validações obrigatórias
- [ ] sections não vazio (mínimo 4 H2)
- [ ] total_estimated_words >= word_count_target × 0.8
- [ ] gaps_covered não vazio
- [ ] title_suggestion contém keyword primária
- [ ] Outline salvo como artefato antes de prosseguir para draft

## Riscos
- **Outline genérico**: se o outline não usa os headings do research, o artigo vai ser genérico. Validar coverage obrigatoriamente.
- **Seções muito curtas**: se alguma seção tem word_count_estimate < 150, fundir com seção adjacente.
- **Intent ignorada**: outline de artigo informacional NÃO deve ter CTAs pesados de venda — verificar coerência de intent.

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "outline-step",
  "agent_key": "longform-article-orchestrator",
  "input_json": { "keyword": "...", "intent": "...", "research_summary": "..." },
  "output_json": { "outline": "..." },
  "status": "done | failed",
  "tokens_in": "int",
  "tokens_out": "int",
  "cost_estimate": "decimal"
}
```

## Persistência no Supabase
- INSERT em `ai_run_steps`
- INSERT em `omnisim_artifacts`: artifact_type="outline", content_id=<job_id>, ai_run_step_id
- Emitir job_event: `{ event_type: "step_completed", message: "outline-step: N seções, word_target=X, gaps_cobertos=Y" }`
