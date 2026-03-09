# SKILL: article-draft-composer

## Finalidade
Step 3 do pipeline de artigos. Escreve o conteúdo completo seção por seção baseado no outline aprovado. Controla consistência de voz, densidade de keyword e profundidade por seção. Suporta PT-BR e EN-US. Target: 2.000 a 5.000 palavras conforme word_count_target.

## Motor
MOTOR 3 — GERAÇÃO

## Agentes que usam esta skill
- longform-article-orchestrator (step 3 do blog.generate.v1)
- content-refresh-agent (para reescrita de seções no refresh loop)

## Inputs
```json
{
  "outline": "<output completo do outline-step>",
  "research_json": "<output do research-step>",
  "keyword": "string",
  "locale": "pt-BR | en-US",
  "tone": "professional | conversational | authoritative — default: professional",
  "word_count_target": "int",
  "entity_hints": ["string — do research_json"],
  "tenant_context": {
    "brand_name": "string",
    "industry": "string",
    "avoid_topics": ["string — tópicos que o tenant não quer mencionar"]
  },
  "ai_run_id": "uuid",
  "chunk_mode": "boolean — default true: escrever por seção, não tudo de uma vez"
}
```

## Outputs
```json
{
  "content_json": {
    "title": "string",
    "intro": "string",
    "sections": [
      {
        "heading": "string",
        "level": "h2 | h3",
        "content": "string — HTML ou markdown por seção",
        "word_count": "int"
      }
    ],
    "conclusion": "string",
    "total_word_count": "int"
  },
  "content_html": "string — artigo completo renderizado em HTML",
  "locale_used": "pt-BR | en-US",
  "keyword_density": "float — % de ocorrência do keyword primário no texto"
}
```

## Regras de execução
1. **Chunk mode obrigatório**: gerar seção por seção — não tentar escrever tudo em um único prompt.
2. Cada seção deve cumprir o `objective` definido no outline.
3. keyword_density alvo: 0.5% a 1.5% — abaixo disso subotimizado, acima disso keyword stuffing.
4. `entity_hints` devem ser mencionados naturalmente — não forçar toda lista em todo parágrafo.
5. Em PT-BR: não usar gerundismo excessivo. Preferir construções diretas.
6. Em EN-US: não usar passive voice desnecessariamente.
7. Intro DEVE: conter keyword primária na primeira ou segunda frase, definir o problema e prometer solução.
8. Conclusão DEVE: resumir os pontos principais e incluir CTA natural (para intent local/commercial/transactional).
9. Seções de FAQ: cada pergunta-resposta em bloco — compatível com schema FAQPage.
10. Não inventar dados numéricos, estatísticas ou datas sem fonte confirmada no research.
11. Se avoid_topics definido: nunca mencionar os tópicos listados.
12. total_word_count deve estar entre word_count_target × 0.85 e word_count_target × 1.20.

## Validações obrigatórias
- [ ] total_word_count dentro do range aceitável
- [ ] keyword_density entre 0.3% e 2.0%
- [ ] content_html não vazio
- [ ] Nenhuma seção do outline foi pulada sem registro em job_events
- [ ] Nenhum dado numérico inventado (verificado pelo quality-gate posterior)

## Riscos
- **Alucinação estatística**: o draft-composer NÃO deve inventar percentuais, estudos ou datas. O quality-gate pega isso — mas o composer deve ser instruído explicitamente a não fazê-lo.
- **Repetição de parágrafo**: em chunk mode, seções podem repetir pontos. Validar antes de montar o HTML final.
- **Locale drift**: começar PT-BR e migrar para EN-US no meio. Verificar locale consistente ao longo do texto.

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "article-draft-composer",
  "agent_key": "longform-article-orchestrator",
  "input_json": { "keyword": "...", "outline_sections": "N seções", "word_count_target": "int" },
  "output_json": { "total_word_count": "int", "keyword_density": "float", "sections_count": "int" },
  "status": "done | failed",
  "tokens_in": "int",
  "tokens_out": "int",
  "cost_estimate": "decimal"
}
```

## Persistência no Supabase
- UPDATE `articles` SET content_json, content_html, status='draft'
- INSERT em `ai_run_steps`
- INSERT em `omnisim_artifacts`: artifact_type="article_draft"
- Emitir job_event: `{ event_type: "step_completed", message: "article-draft-composer: total=X palavras, density=Y%, locale=pt-BR" }`
