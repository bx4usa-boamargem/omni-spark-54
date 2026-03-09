# SKILL: service-page-validator

## Finalidade
Valida se uma super page de serviço local está completa, coerente e publicável. Verifica presença de elementos obrigatórios por template, consistência de informações entre seções, ausência de contradições internas e conformidade com o schema gerado. É a porta final antes da publicação de super pages.

## Motor
MOTOR 3 — GERAÇÃO (Super Page)

## Agentes que usam esta skill
- superpage-orchestrator (step 9, junto com quality-gate)

## Inputs
```json
{
  "super_page_id": "uuid",
  "template_key": "string",
  "content_json": "object",
  "content_html": "string",
  "schema_json": "object",
  "inputs_json": {
    "empresa": "string",
    "servico": "string",
    "cidade": "string",
    "telefone": "string",
    "endereco": "string | null"
  },
  "sections_generated": ["string — lista de block_types gerados"],
  "section_count_target": "5 | 10 | 15",
  "locale": "pt-BR | en-US",
  "ai_run_id": "uuid"
}
```

## Outputs
```json
{
  "valid": "boolean",
  "checks": {
    "required_sections_present": {
      "passed": "boolean",
      "missing": ["string"]
    },
    "cta_present": {
      "passed": "boolean",
      "cta_count": "int",
      "cta_types_found": ["phone | whatsapp | form"]
    },
    "city_mentions": {
      "passed": "boolean",
      "count": "int",
      "min_required": 5
    },
    "phone_present": {
      "passed": "boolean",
      "phone_clickable": "boolean"
    },
    "schema_consistency": {
      "passed": "boolean",
      "issues": ["string — ex: 'LocalBusiness.name difere do inputs_json.empresa'"]
    },
    "no_placeholder_text": {
      "passed": "boolean",
      "found": ["string — trechos com placeholder detectados"]
    },
    "faq_minimum": {
      "passed": "boolean",
      "faq_count": "int",
      "min_required": 3
    }
  },
  "blocker_count": "int",
  "warning_count": "int",
  "publish_approved": "boolean",
  "fix_suggestions": ["string"]
}
```

## Regras de execução
1. **required_sections_present**: verificar que todos os block_types com `required=true` do template estão em sections_generated.
2. **cta_present**: obrigatório pelo menos 2 CTAs no conteúdo total — hero e cta_final. Se cta_count < 2: BLOCKER.
3. **city_mentions**: cidade do inputs_json deve aparecer >= 5 vezes no content_html. Se < 5: BLOCKER para páginas locais.
4. **phone_present**: telefone do inputs_json deve estar no HTML. Se ausente: BLOCKER. Se presente mas não em formato tel: WARN.
5. **schema_consistency**: verificar que nome da empresa no schema == inputs_json.empresa. Verificar que cidade no schema == inputs_json.cidade.
6. **no_placeholder_text**: buscar strings como "[INSERIR]", "{{", "TODO", "PLACEHOLDER", "Nome da Empresa", "Telefone aqui". Se encontrado: BLOCKER.
7. **faq_minimum**: se template tem bloco FAQ (required=true), verificar >= 3 pares Q&A.
8. Se valid=false E blocker_count > 0: job vai para status=failed.
9. Se valid=false E apenas warning_count > 0: job continua mas emite job_events de warning.
10. fix_suggestions: para cada blocker, gerar instrução clara do que corrigir.

## Validações obrigatórias
- [ ] Todos os 7 checks executados
- [ ] publish_approved = (blocker_count == 0)
- [ ] Schema name/city consistentes com inputs_json
- [ ] Nenhum placeholder no conteúdo final

## Riscos
- **Template desatualizado**: se template mudou depois que o job foi criado, os required_sections podem não bater. Verificar template_key atual vs template usado na geração.
- **Phone format PT-BR vs EN-US**: formatos diferentes. Para PT-BR aceitar (11) 99999-9999 e +55-11-99999-9999.

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "service-page-validator",
  "agent_key": "superpage-orchestrator",
  "input_json": { "template_key": "...", "sections_generated": [], "section_count": "int" },
  "output_json": { "valid": "bool", "blocker_count": "int", "warning_count": "int" },
  "status": "done | failed"
}
```

## Persistência no Supabase
- INSERT em `ai_run_steps`
- Se blocker: UPDATE `jobs` SET status='failed', error_json=<fix_suggestions>
- Emitir job_event por BLOCKER: `{ event_type: "error", message: "service-page-validator: BLOCKER=city_mentions(count=2,min=5)" }`
- Emitir job_event por WARNING: `{ event_type: "warn", message: "service-page-validator: WARN=phone_not_clickable" }`
