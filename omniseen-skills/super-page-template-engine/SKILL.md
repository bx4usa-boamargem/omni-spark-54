# SKILL: super-page-template-engine

## Finalidade
Lê um template persistido em super_page_templates por template_id e retorna a definição executável: blocos obrigatórios, SEO preset, schema preset e required_inputs. É a fonte de verdade sobre o que cada tipo de página deve conter. Sem esta skill, as super pages são formulários genéricos.

## Motor
MOTOR 3 — GERAÇÃO (Super Page)

## Agentes que usam esta skill
- superpage-orchestrator (step 1, OBRIGATÓRIO)
- content-planner-agent (ao montar job payload — verificar template válido)

## Inputs
```json
{
  "template_id": "uuid",
  "tenant_id": "uuid",
  "section_count": "5 | 10 | 15 — quantas seções gerar",
  "locale": "pt-BR | en-US"
}
```

## Outputs
```json
{
  "template": {
    "id": "uuid",
    "key": "string — ex: local_service_pest_control",
    "name": "string",
    "industry": "string",
    "page_type": "local_service | pillar | landing | comparison",
    "section_count_selected": "int",
    "blocks": [
      {
        "block_type": "hero | value_prop | problem_solution | process | differentials | proof | service_areas | faq | map | cta_final",
        "required": "boolean",
        "order": "int",
        "inputs_required": ["string — campos do inputs_json necessários para este bloco"],
        "default_content_hints": "string",
        "cta_type": "phone | whatsapp | form | link | null"
      }
    ],
    "seo_preset": {
      "title_template": "string — ex: '{service} em {city} | {brand_name}'",
      "meta_template": "string",
      "slug_template": "string — ex: '{service}-em-{city}'"
    },
    "schema_preset": {
      "types": ["LocalBusiness", "Service", "FAQPage", "BreadcrumbList"],
      "requires_address": "boolean",
      "requires_phone": "boolean"
    },
    "required_inputs": ["empresa", "servico", "cidade", "telefone"],
    "optional_inputs": ["endereco", "bairros_atendidos", "anos_experiencia_verificado", "certifications_verified"]
  },
  "validation_result": {
    "template_found": "boolean",
    "section_count_valid": "boolean"
  }
}
```

## Templates seed obrigatórios (inserir no banco)
O seed DEVE conter no mínimo:
1. `local_service_pest_control` — Dedetização / Pest Control
2. `local_service_roofing` — Telhados / Roofing
3. `local_service_clinic` — Clínica / Clinic
4. `local_service_cleaning` — Limpeza / Cleaning
5. `local_service_renovation` — Reforma / Renovation

Cada template seed DEVE ter:
- `section_count = 10` como padrão (com variações 5 e 15 derivadas)
- `schema_preset.types` completo
- `required_inputs` mínimos definidos
- `seo_preset` com templates parametrizados

## Regras de execução
1. Se template_id não encontrado: job FALHA com error_json "template_not_found".
2. Se section_count = 5: retornar apenas blocos com required=true.
3. Se section_count = 10: retornar todos os blocos padrão.
4. Se section_count = 15: retornar todos os blocos + blocos opcionais de autoridade.
5. Locale afeta apenas os hints de conteúdo — a estrutura de blocos é a mesma.
6. required_inputs devem ser verificados ANTES de iniciar o pipeline — se faltam, job falha.
7. optional_inputs sem data disponível: gerar com linguagem neutra, NÃO inventar.

## Validações obrigatórias
- [ ] template_id existe no banco
- [ ] section_count é 5, 10 ou 15
- [ ] required_inputs todos presentes no job payload
- [ ] blocks retornados estão ordenados por block_type.order

## Persistência no Supabase
- READ de `super_page_templates` (não escreve)
- Emitir job_event: `{ event_type: "step_completed", message: "template-engine: template=local_service_pest_control, sections=10, schema=LocalBusiness+Service+FAQPage" }`
