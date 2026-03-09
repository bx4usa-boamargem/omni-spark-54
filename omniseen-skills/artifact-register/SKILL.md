# SKILL: artifact-register

## Finalidade
Registra no banco todos os artefatos intermediários e finais produzidos durante pipelines de geração: outlines, drafts, schemas, research JSONs, versões de super pages. Cria o histórico auditável de o que foi produzido, por qual agente, em qual step e com qual versão. Sem esta skill, os artefatos são transitórios e invisíveis.

## Motor
MOTOR 5 — OBSERVABILIDADE

## Agentes que usam esta skill
- Todos os agentes que geram artefatos persistíveis
- longform-article-orchestrator, superpage-orchestrator, market-radar-agent

## Inputs
```json
{
  "tenant_id": "uuid",
  "artifact_type": "research | outline | article_draft | super_page_draft | schema | serp_diff | paa_research | seo_pack | interlink_suggestions | validation_report",
  "content_id": "uuid — ID do artigo, super_page ou job ao qual pertence",
  "content_type": "blog | super_page | radar_run | job",
  "version": "int — incrementar por conteúdo",
  "agent_key": "string",
  "ai_run_step_id": "uuid | null",
  "data": "object — o artefato em si (JSON estruturado)",
  "storage_mode": "inline | storage_ref",
  "job_id": "uuid"
}
```

## Outputs
```json
{
  "artifact_id": "uuid",
  "version": "int",
  "storage_url": "string | null — se storage_mode=storage_ref",
  "registered": "boolean"
}
```

## Regras de execução
1. **storage_mode=inline**: artefatos < 50KB são salvos diretamente em `omnisim_artifacts.data_json`.
2. **storage_mode=storage_ref**: artefatos >= 50KB são salvos no Supabase Storage e apenas a URL fica no banco.
3. version: buscar a versão mais alta do artifact_type+content_id e incrementar +1.
4. Se content_id não existe ainda (job em andamento): usar job_id como content_id temporário.
5. Artefatos de research e outline são versão 1 por job — não há histórico de versões deles.
6. Artefatos de article_draft e super_page_draft: versionar a cada regeneração ou refresh.
7. Nunca sobrescrever artefato existente — sempre criar nova versão.
8. artifact_type deve ser um dos valores permitidos — rejeitar tipos não listados.

## Artefatos obrigatórios por pipeline
| Pipeline | Artefatos obrigatórios |
|---|---|
| blog.generate.v1 | research, outline, article_draft, seo_pack, interlink_suggestions, validation_report |
| superpage.local.generate.v1 | research (opt), super_page_draft, schema, interlink_suggestions, validation_report |
| radar.generate.v1 | serp_diff (opt), paa_research (opt) |

## Validações obrigatórias
- [ ] artifact_type é um dos tipos permitidos
- [ ] registered=true antes de retornar
- [ ] version >= 1

## Riscos
- **Artefatos órfãos**: se o job falha após criar artefatos, eles ficam sem conteúdo associado. Limpar periodicamente artefatos com content_id sem job correspondente > 7 dias.
- **Storage costs**: não salvar artefatos de baixo valor (ex: logs de debug) como storage_ref — apenas data_json inline.

## Persistência no Supabase
- INSERT em `omnisim_artifacts`: id, tenant_id, artifact_type, content_id, content_type, version, agent_key, ai_run_step_id, data_json (ou storage_url), created_at
- Emitir job_event: `{ event_type: "log", message: "artifact-register: tipo=article_draft, versão=2, content_id=uuid" }`
