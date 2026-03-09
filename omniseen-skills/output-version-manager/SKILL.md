# SKILL: output-version-manager

## Finalidade
Gerencia o versionamento de conteúdo publicado. Ao publicar ou atualizar um artigo ou super page, cria uma nova versão snapshot em super_page_versions (ou article_versions). Permite rollback, comparação entre versões e histórico completo de publicações. Garante que nenhuma publicação sobrescreve sem rastro.

## Motor
MOTOR 5 — OBSERVABILIDADE

## Agentes que usam esta skill
- longform-article-orchestrator (ao publicar artigo)
- superpage-orchestrator (ao publicar super page)
- content-refresh-agent (ao publicar refresh)

## Inputs
```json
{
  "content_id": "uuid",
  "content_type": "blog | super_page",
  "tenant_id": "uuid",
  "content_json": "object",
  "content_html": "string",
  "meta_title": "string",
  "meta_description": "string",
  "schema_json": "object | null",
  "publish_event": "first_publish | refresh | manual_edit",
  "published_by": "agent_key | user_id",
  "ai_run_id": "uuid | null",
  "job_id": "uuid | null"
}
```

## Outputs
```json
{
  "version_id": "uuid",
  "version_number": "int",
  "previous_version_id": "uuid | null",
  "versioned": "boolean",
  "changelog": "string — resumo do que mudou vs versão anterior"
}
```

## Regras de execução
1. Buscar version_number atual do conteúdo e incrementar +1.
2. Primeira publicação: version_number = 1.
3. Salvar snapshot COMPLETO: content_json, content_html, meta_title, meta_description, schema_json.
4. changelog gerado automaticamente:
   - first_publish: "Primeira publicação"
   - refresh: "Refresh automático — tipo: [refresh_type]. Mudanças em: [seções]"
   - manual_edit: "Edição manual via Admin"
5. Para super_page: INSERT em `super_page_versions`.
6. Para blog: INSERT em `article_versions` (tabela existente).
7. Não modificar o conteúdo ativo — apenas criar snapshot.
8. previous_version_id: ID da versão imediatamente anterior.
9. Manter máximo de 20 versões por conteúdo — ao exceder, deletar a mais antiga.

## Validações obrigatórias
- [ ] version_number > 0
- [ ] versioned=true antes de retornar
- [ ] changelog não vazio

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "output-version-manager",
  "agent_key": "longform-article-orchestrator | superpage-orchestrator | content-refresh-agent",
  "input_json": { "content_id": "...", "publish_event": "...", "content_type": "..." },
  "output_json": { "version_number": "int", "version_id": "uuid" },
  "status": "done"
}
```

## Persistência no Supabase
- INSERT em `super_page_versions` ou `article_versions`
- UPDATE `articles` ou `landing_pages` SET version_number = version_number + 1
- Emitir job_event: `{ event_type: "log", message: "output-version-manager: versão 3 criada para content_id=uuid (refresh)" }`
