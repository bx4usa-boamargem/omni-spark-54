# SKILL: research-step

## Finalidade
Step 1 obrigatório de todo pipeline de geração (blog e super page). Agrega dados de SERP, PAA, fóruns e entidades para construir o contexto de pesquisa que guia todos os steps subsequentes. Sem este step, o conteúdo é gerado às cegas.

## Motor
MOTOR 3 — GERAÇÃO

## Agentes que usam esta skill
- longform-article-orchestrator (step 1 do blog.generate.v1)
- superpage-orchestrator (step 1 opcional do superpage.local.generate.v1)

## Inputs
```json
{
  "keyword": "string",
  "intent": "informational | commercial | local | transactional",
  "locale": "pt-BR | en-US",
  "market": "string — ex: 'São Paulo, BR'",
  "web_research_enabled": "boolean",
  "content_type": "blog | super_page",
  "tenant_id": "uuid",
  "ai_run_id": "uuid — para logar ai_run_step"
}
```

## Outputs
```json
{
  "research_json": {
    "keyword": "string",
    "top_formats": ["string — ex: 'listicle', 'how-to', 'comparison', 'local-service'"],
    "headings_map": [
      {
        "heading": "string",
        "frequency": "int — quantos dos top resultados têm este heading",
        "recommended": "boolean"
      }
    ],
    "paa_questions": ["string"],
    "entity_hints": ["string — entidades relevantes: marcas, lugares, técnicas, organismos"],
    "word_count_target": "int — baseado na média dos top resultados",
    "schema_recommended": ["Article | LocalBusiness | Service | FAQPage | BreadcrumbList"],
    "competitor_angles": ["string — ângulos usados pelos top ranqueados"],
    "content_gaps": ["string — o que ninguém cobre bem ainda"],
    "locale": "pt-BR | en-US",
    "research_mode": "web | heuristic"
  }
}
```

## Regras de execução
1. Se `web_research_enabled = true`: chamar serp-intelligence-agent + paa-and-forum-miner ativamente.
2. Se `web_research_enabled = false`: usar heurística por intent + industry + locale — NUNCA bloquear execução.
3. `research_mode` reflete qual modo foi usado — logar no ai_run_step.
4. word_count_target:
   - intent=informational: 2000–3500 palavras
   - intent=commercial: 1500–3000 palavras
   - intent=local: 1200–2500 palavras (super page)
   - intent=transactional: 800–1500 palavras
5. Em PT-BR: detectar regionalismos e inclui-los em entity_hints.
6. headings_map: incluir apenas headings com frequency >= 2 nos top resultados.
7. content_gaps: identificar pelo menos 1 gap — o que o tenant pode cobrir melhor.
8. schema_recommended: obrigatório ter ao menos 1 schema sugerido.
9. Este step NÃO escreve conteúdo — apenas prepara contexto.
10. Output salvo como artefato em omnisim_artifacts antes de prosseguir.

## Validações obrigatórias
- [ ] research_json não vazio
- [ ] paa_questions com ao menos 3 perguntas
- [ ] word_count_target > 0
- [ ] schema_recommended não vazio
- [ ] research_mode registrado ("web" ou "heuristic")
- [ ] ai_run_step criado antes de retornar

## Riscos
- **Research bloqueante**: se SERP API falha com web=true, degradar para heuristic e logar warning — nunca bloquear pipeline.
- **Contexto irrelevante**: se o keyword retorna resultados muito genéricos, forçar especificidade via intent + market.
- **Over-engineering do contexto**: research_json deve ser conciso — não um dump completo do SERP. Curar os dados.

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "research-step",
  "agent_key": "longform-article-orchestrator | superpage-orchestrator",
  "input_json": { "keyword": "...", "intent": "...", "locale": "..." },
  "output_json": { "research_json": "..." },
  "status": "done | failed | warn",
  "tokens_in": "int",
  "tokens_out": "int",
  "cost_estimate": "decimal"
}
```

## Persistência no Supabase
- INSERT em `ai_run_steps` (obrigatório)
- INSERT em `omnisim_artifacts`: artifact_type="research", content_id=<job_id>, agent_key, ai_run_step_id
- Emitir job_event: `{ event_type: "step_completed", message: "research-step: modo=web, word_count_target=2500, gaps=3" }`

## Exemplo de payload
```json
{
  "keyword": "dedetização residencial São Paulo",
  "intent": "local",
  "locale": "pt-BR",
  "market": "São Paulo, BR",
  "web_research_enabled": true,
  "content_type": "super_page",
  "tenant_id": "uuid-001",
  "ai_run_id": "uuid-run-042"
}
```

## Exemplo de output (resumido)
```json
{
  "research_json": {
    "keyword": "dedetização residencial São Paulo",
    "top_formats": ["local-service", "how-to"],
    "headings_map": [
      { "heading": "Como funciona a dedetização residencial", "frequency": 4, "recommended": true },
      { "heading": "Preço da dedetização em SP", "frequency": 3, "recommended": true },
      { "heading": "Áreas atendidas em São Paulo", "frequency": 5, "recommended": true }
    ],
    "paa_questions": [
      "Quanto tempo dura o efeito da dedetização?",
      "Preciso sair de casa durante a dedetização?",
      "Com que frequência devo dedetizar?"
    ],
    "word_count_target": 1800,
    "schema_recommended": ["LocalBusiness", "Service", "FAQPage", "BreadcrumbList"],
    "content_gaps": ["Nenhum concorrente cobre protocolo de segurança para crianças e pets"],
    "research_mode": "web"
  }
}
```
