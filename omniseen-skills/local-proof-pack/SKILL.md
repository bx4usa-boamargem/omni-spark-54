# SKILL: local-proof-pack

## Finalidade
Compila elementos de prova verificáveis para super pages locais. Extrai do business profile do tenant, do brand_agent_config e dos inputs_json os dados reais disponíveis para usar como prova social e diferenciais. Retorna o que pode ser usado com segurança e o que deve ser omitido. Previne que o section-stack-builder invente prova.

## Motor
MOTOR 3 — GERAÇÃO (Super Page)

## Agentes que usam esta skill
- superpage-orchestrator (step 3 — antes de gerar seções)
- entity-and-proof-agent

## Inputs
```json
{
  "tenant_id": "uuid",
  "inputs_json": {
    "empresa": "string",
    "servico": "string",
    "cidade": "string",
    "telefone": "string",
    "years_experience_verified": "int | null",
    "certifications_verified": ["string"],
    "bairros_atendidos": ["string"],
    "garantia": "string | null"
  },
  "brand_profile": {
    "about_text": "string | null",
    "service_description": "string | null"
  }
}
```

## Outputs
```json
{
  "proof_available": {
    "years_experience": "int | null",
    "certifications": ["string"],
    "guarantee_text": "string | null",
    "service_areas": ["string"],
    "phone_verified": "boolean"
  },
  "proof_denied": ["string — o que não pode ser inventado"],
  "safe_language_alternatives": {
    "no_years": "string — ex: 'com anos de experiência no mercado'",
    "no_certifications": "string — ex: 'produtos registrados e seguros'",
    "no_reviews": "string — ex: 'satisfação garantida ou retorno gratuito'"
  }
}
```

## Regras de execução
1. Só incluir em proof_available o que está em inputs_json ou brand_profile — NUNCA inferir.
2. Se years_experience_verified = null: colocar em proof_denied e retornar safe_language_alternatives.no_years.
3. Se certifications_verified = []: proof_denied inclui "certificações" + retornar alternativa segura.
4. garantia: usar se fornecida e verificável. Não inventar garantias específicas.
5. safe_language_alternatives: SEMPRE preencher — são as fallbacks obrigatórias para o section-stack-builder.

## Persistência no Supabase
- Não persiste diretamente — output vai para superpage-orchestrator
- Emitir job_event: `{ event_type: "log", message: "local-proof-pack: proof_available=[garantia, areas], proof_denied=[years, certifications]" }`
