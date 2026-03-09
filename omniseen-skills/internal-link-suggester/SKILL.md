# SKILL: internal-link-suggester

## Finalidade
Step 5 dos pipelines de blog e super page. Identifica oportunidades de links internos dentro do conteúdo do tenant. Sugere anchors naturais e URLs relevantes. Aplica os links automaticamente respeitando limites por conteúdo. Fortalece a estrutura de siloing semântico do site.

## Motor
MOTOR 3 — GERAÇÃO

## Agentes que usam esta skill
- longform-article-orchestrator (step 5)
- superpage-orchestrator (step 8)
- content-refresh-agent (ao atualizar conteúdo existente)

## Inputs
```json
{
  "content_html": "string — HTML do artigo/super page sendo gerado",
  "content_type": "blog | super_page",
  "keyword": "string",
  "tenant_id": "uuid",
  "locale": "pt-BR | en-US",
  "published_content": [
    {
      "id": "uuid",
      "title": "string",
      "slug": "string",
      "url": "string",
      "content_type": "blog | super_page",
      "keywords": ["string"],
      "excerpt": "string"
    }
  ],
  "max_links": "int — default 6, range 3-8",
  "ai_run_id": "uuid"
}
```

## Outputs
```json
{
  "links_applied": [
    {
      "anchor_text": "string",
      "target_url": "string",
      "target_title": "string",
      "relevance_score": "float 0-1",
      "position_in_content": "string — ex: 'seção 2, parágrafo 3'"
    }
  ],
  "content_html_with_links": "string — HTML atualizado com os links inseridos",
  "links_suggested_not_applied": [
    {
      "anchor_text": "string",
      "target_url": "string",
      "reason_skipped": "string"
    }
  ],
  "total_links_applied": "int"
}
```

## Regras de execução
1. Nunca linkar para o próprio conteúdo (self-link).
2. Nunca linkar para conteúdo com status != published.
3. Máximo de `max_links` links por conteúdo — excedente vai para `links_suggested_not_applied`.
4. Anchors DEVEM ser naturais no contexto da frase — não forçar keyword exato como anchor sempre.
5. Não linkar mais de 1x para o mesmo destino no mesmo conteúdo.
6. Priorizar: super_pages sobre blogs (link de blog → super_page fortalece a página de conversão).
7. Relevance_score < 0.4: não aplicar link automaticamente — mover para suggested.
8. Distribuir links ao longo do conteúdo — não agrupar todos na mesma seção.
9. Não inserir link na primeira frase e não inserir link na última frase.
10. Em PT-BR: anchors devem ser gramaticalmente corretos no contexto da frase.
11. Não inserir link em headings (H1, H2, H3).

## Validações obrigatórias
- [ ] total_links_applied <= max_links
- [ ] Nenhum self-link
- [ ] Nenhum link para conteúdo não publicado
- [ ] content_html_with_links é HTML válido
- [ ] Anchors são texto natural (não listas de keywords)

## Riscos
- **Links quebrados**: se URL do tenant muda, links ficam quebrados. Usar slugs relativos quando possível.
- **Over-linking**: > 8 links internos em artigos curtos parece spam. Verificar densidade.
- **Anchor manipulation**: repetir o mesmo anchor exato para o mesmo destino across muitos artigos pode parecer manipulativo para o Google.

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "internal-link-suggester",
  "agent_key": "longform-article-orchestrator | superpage-orchestrator",
  "input_json": { "keyword": "...", "published_content_count": "int", "max_links": "int" },
  "output_json": { "links_applied": "int", "links_skipped": "int" },
  "status": "done | failed",
  "tokens_in": "int",
  "tokens_out": "int"
}
```

## Persistência no Supabase
- UPDATE `articles` ou `landing_pages`: content_html (com links inseridos), internal_links_json
- INSERT em `ai_run_steps`
- Emitir job_event: `{ event_type: "step_completed", message: "internal-link-suggester: N links aplicados, M sugeridos não aplicados" }`
