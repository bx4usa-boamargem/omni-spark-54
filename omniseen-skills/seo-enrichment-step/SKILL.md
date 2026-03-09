# SKILL: seo-enrichment-step

## Finalidade
Step 4 do pipeline de artigos e super pages. Gera todos os elementos técnicos de SEO on-page: meta_title, meta_description, slug único, canonical URL e sugestões de heading otimização. Garante que o conteúdo está tecnicamente preparado para indexação antes de publicar.

## Motor
MOTOR 3 — GERAÇÃO

## Agentes que usam esta skill
- longform-article-orchestrator (step 4)
- superpage-orchestrator (step 7)
- schema-and-technical-seo-agent

## Inputs
```json
{
  "content_type": "blog | super_page",
  "title": "string",
  "keyword": "string",
  "secondary_keywords": ["string"],
  "content_html": "string",
  "locale": "pt-BR | en-US",
  "tenant_id": "uuid",
  "existing_slugs": ["string — slugs já usados no tenant para garantir unicidade"],
  "canonical_base_url": "string — ex: 'https://cliente.omniseen.app'",
  "ai_run_id": "uuid"
}
```

## Outputs
```json
{
  "meta_title": "string — max 60 chars, contém keyword primária",
  "meta_description": "string — max 160 chars, contém keyword + proposta de valor",
  "slug": "string — único no tenant, lowercase, hifenizado, max 60 chars",
  "canonical_url": "string — URL canônica completa",
  "og_title": "string — pode ser diferente do meta_title",
  "og_description": "string",
  "heading_suggestions": [
    {
      "original": "string",
      "optimized": "string",
      "reason": "string"
    }
  ],
  "seo_warnings": ["string — ex: 'meta_title muito curto', 'keyword ausente no H1'"]
}
```

## Regras de execução
1. meta_title: obrigatório ter keyword primária. Max 60 caracteres. Não truncar no meio de palavra.
2. meta_description: keyword primária + benefício + CTA suave. Max 160 chars.
3. slug: gerar a partir do keyword principal → lowercase → remover acentos → substituir espaços por hífen → verificar unicidade contra existing_slugs.
4. Se slug já existe: adicionar sufixo numérico (-2, -3) — NUNCA duplicar slug.
5. canonical_url = canonical_base_url + "/" + slug (para blog) ou canonical_base_url + "/p/" + slug (para super_page).
6. heading_suggestions: otimizar H2s que não contêm keyword nem secondary_keywords.
7. seo_warnings: emitir warning se keyword ausente no H1 ou meta_title > 60 chars.
8. Em PT-BR: remover cedilhas e acentos no slug (dedetização → dedetizacao).
9. Em EN-US: remover stop words do slug (the, a, in, of).
10. og_title pode ser mais "clickbait" que meta_title — para social sharing.

## Validações obrigatórias
- [ ] meta_title entre 40 e 60 chars
- [ ] meta_description entre 120 e 160 chars
- [ ] slug único no tenant (verificado contra existing_slugs)
- [ ] canonical_url é URL válida
- [ ] keyword primária presente em meta_title

## Riscos
- **Slug duplicado**: se não verificar existing_slugs, dois conteúdos no mesmo tenant podem ter o mesmo URL. Bloqueante.
- **Meta muito curto**: meta_title < 40 chars não aproveita o espaço de indexação. Emitir warning.
- **Over-optimization**: keyword no title + description + H1 + alt + URL. Verificar se não está em todas as posições de forma forçada.

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "seo-enrichment-step",
  "agent_key": "longform-article-orchestrator | superpage-orchestrator",
  "input_json": { "keyword": "...", "title": "...", "existing_slugs_count": "int" },
  "output_json": { "meta_title": "...", "slug": "...", "seo_warnings": [] },
  "status": "done | failed",
  "tokens_in": "int",
  "tokens_out": "int"
}
```

## Persistência no Supabase
- UPDATE `articles` ou `landing_pages`: meta_title, meta_description, slug, canonical_url
- INSERT em `ai_run_steps`
- Emitir job_event: `{ event_type: "step_completed", message: "seo-enrichment: slug=X, meta_title=Y chars, warnings=Z" }`

## Exemplo de output
```json
{
  "meta_title": "Dedetização Residencial em São Paulo | Serviço Profissional",
  "meta_description": "Dedetização residencial em São Paulo com garantia de 90 dias. Atendimento em 24h, produtos certificados. Solicite orçamento gratuito.",
  "slug": "dedetizacao-residencial-sao-paulo",
  "canonical_url": "https://dedetizadora-sp.omniseen.app/p/dedetizacao-residencial-sao-paulo",
  "og_title": "Chega de Pragas em Casa: Dedetização em SP com Garantia",
  "heading_suggestions": [
    {
      "original": "Nossos serviços",
      "optimized": "Serviços de Dedetização Residencial que Oferecemos",
      "reason": "H2 genérico sem keyword — otimizar para busca"
    }
  ],
  "seo_warnings": []
}
```
