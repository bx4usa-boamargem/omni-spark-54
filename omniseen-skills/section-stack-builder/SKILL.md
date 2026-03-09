# SKILL: section-stack-builder

## Finalidade
Monta a sequência de seções da super page conforme o template e gera o conteúdo de cada bloco. É o equivalente do article-draft-composer para super pages — gera conteúdo por bloco (hero, proposta, processo, diferenciais, FAQ, CTA) respeitando a estrutura do template.

## Motor
MOTOR 3 — GERAÇÃO (Super Page)

## Agentes que usam esta skill
- superpage-orchestrator (step 5-6)

## Inputs
```json
{
  "template_blocks": "<blocks do super-page-template-engine>",
  "inputs_json": {
    "empresa": "string",
    "servico": "string",
    "cidade": "string",
    "telefone": "string",
    "endereco": "string | null",
    "bairros_atendidos": ["string"],
    "years_experience_verified": "int | null",
    "certifications_verified": ["string"]
  },
  "research_json": "<output do research-step, se disponível>",
  "proof_pack": "<output do local-proof-pack>",
  "copy_pack": "<output do conversion-copy-chief>",
  "locale": "pt-BR | en-US",
  "section_count": "5 | 10 | 15",
  "ai_run_id": "uuid"
}
```

## Outputs
```json
{
  "sections": [
    {
      "block_type": "hero | value_prop | problem_solution | process | differentials | proof | service_areas | faq | map | cta_final",
      "heading": "string",
      "content_html": "string",
      "cta": {
        "type": "phone | whatsapp | form",
        "label": "string",
        "value": "string"
      },
      "order": "int"
    }
  ],
  "faq_items": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "total_word_count": "int",
  "city_mentioned_count": "int — verificar presença da cidade"
}
```

## Regras de execução por bloco

### HERO
- Heading: "{serviço} em {cidade}" + variação de benefício
- Subheading: proposta de valor em 1 frase
- CTA primário: telefone ou WhatsApp
- Cidade DEVE aparecer no heading

### VALUE_PROP / PROBLEM_SOLUTION
- Descrever o problema que o serviço resolve
- Não inventar cenários específicos sem dados

### PROCESS
- Descrever como o serviço funciona em 3-5 etapas
- Genérico e verificável — sem inventar especificidades do tenant

### DIFFERENTIALS
- Se certifications_verified disponível: usar
- Se anos_experience_verified disponível: usar
- Se NÃO disponível: usar linguagem genérica ("serviço profissional", "equipe treinada") — NUNCA inventar

### PROOF
- Se proof_pack tem dados reais: usar
- Se sem dados: usar bloco de garantia verificável ("satisfação garantida ou retorno gratuito") — NUNCA inventar reviews ou depoimentos

### SERVICE_AREAS
- Usar bairros_atendidos se disponível
- Se vazio: gerar lista de bairros/regiões comuns para a cidade — marcar como "atendemos {cidade} e região"

### FAQ
- Usar paa_questions do research como base
- Mínimo 5 pares pergunta-resposta
- Compatível com schema FAQPage

### MAP
- Renderizar somente se endereco disponível
- Se sem endereço: não gerar bloco de mapa — NUNCA inventar endereço

### CTA_FINAL
- Repetir CTA primário
- Adicionar elemento de urgência ou risco-zero ("orçamento grátis", "sem compromisso")

## Regras globais
1. Cidade DEVE aparecer em pelo menos 5 posições estratégicas no conteúdo total.
2. Telefone DEVE estar clicável (tel:) nos CTAs mobile.
3. Nenhum bloco pode ser gerado com informação inventada.
4. section_count=5: hero + value_prop + differentials + faq + cta_final
5. section_count=10: todos os blocos padrão
6. section_count=15: padrão + sections adicionais de autoridade (casos de uso, comparação, área de cobertura expandida)

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "section-stack-builder",
  "agent_key": "superpage-orchestrator",
  "input_json": { "template_key": "...", "section_count": "int", "inputs": "empresa/servico/cidade" },
  "output_json": { "sections_count": "int", "city_mentioned": "int", "faq_items": "int" },
  "status": "done | failed"
}
```

## Persistência no Supabase
- UPDATE `landing_pages`: content_json, content_html
- INSERT em `ai_run_steps`
- INSERT em `omnisim_artifacts`: artifact_type="super_page_draft"
