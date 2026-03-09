# SKILL: city-page-anti-duplication

## Finalidade
Impede a criação de super pages locais espelhadas — páginas para o mesmo serviço em cidades diferentes que são cópias quase idênticas com apenas o nome da cidade trocado. Detecta similaridade estrutural e semântica entre super pages do mesmo tenant. Se similaridade > threshold: BLOQUEIA publicação até diferenciar o conteúdo.

## Motor
MOTOR 3 — GERAÇÃO (Super Page)

## Agentes que usam esta skill
- superpage-orchestrator (step 9, ANTES do quality-gate)
- content-planner-agent (ao criar job — verificação preventiva)

## Inputs
```json
{
  "new_page": {
    "tenant_id": "uuid",
    "service": "string",
    "city": "string",
    "template_key": "string",
    "content_html": "string",
    "sections": [
      {
        "block_type": "string",
        "heading": "string",
        "content_preview": "string — primeiros 200 chars da seção"
      }
    ]
  },
  "existing_pages": [
    {
      "id": "uuid",
      "service": "string",
      "city": "string",
      "template_key": "string",
      "sections": [
        {
          "block_type": "string",
          "heading": "string",
          "content_preview": "string"
        }
      ],
      "url": "string"
    }
  ],
  "similarity_threshold_blocker": "float — default 0.80",
  "similarity_threshold_warn": "float — default 0.60",
  "ai_run_id": "uuid"
}
```

## Outputs
```json
{
  "passed": "boolean",
  "duplicate_risk": "none | low | medium | high | blocker",
  "comparisons": [
    {
      "existing_page_id": "uuid",
      "existing_city": "string",
      "similarity_score": "float 0-1",
      "similarity_level": "none | low | medium | high | blocker",
      "similar_sections": ["string — block_types com alta similaridade"],
      "differentiation_suggestions": ["string"]
    }
  ],
  "most_similar_page": {
    "id": "uuid | null",
    "city": "string | null",
    "score": "float | null"
  },
  "differentiation_required": "boolean",
  "differentiation_actions": [
    {
      "section": "string",
      "action": "string — ex: 'Adicionar especificidades de bairros de Campinas', 'Citar características climáticas locais que afetam o serviço'"
    }
  ]
}
```

## Algoritmo de similaridade
1. Comparar heading de cada bloco entre nova página e páginas existentes do mesmo serviço.
2. Remover o nome da cidade antes de comparar (pois cidades diferentes são esperadas — o problema é o restante ser idêntico).
3. Normalizar texto: lowercase, remover acentos, remover stop words.
4. Calcular similaridade por seção: score de 0 a 1.
5. Score total = média ponderada por seção (process e differentials têm peso maior que hero, pois hero naturalmente muda com a cidade).
6. Pesos: hero=0.1, value_prop=0.15, process=0.20, differentials=0.20, proof=0.15, faq=0.15, cta_final=0.05.

## Regras de execução
1. Comparar APENAS com páginas do mesmo tenant + mesmo serviço.
2. Ignorar páginas da mesma cidade (já bloqueadas pelo seo-enrichment-step por slug duplicado).
3. Se similarity_score >= 0.80: BLOCKER — não publicar.
4. Se similarity_score 0.60–0.79: WARNING + gerar differentiation_actions obrigatoriamente.
5. Se similarity_score < 0.60: PASS.
6. differentiation_actions DEVEM ser específicos e acionáveis — não "adicione conteúdo único".
7. Se existing_pages vazio: PASS automático (primeira página do serviço no tenant).
8. Executar ANTES do quality-gate para não desperdiçar tokens em conteúdo que vai ser bloqueado.
9. Em PT-BR: cidades com nomes similares (ex: São Paulo vs São Paulo do Potengi) não devem ser consideradas mesma cidade.

## O que diferencia páginas locais (guia para sugestões)
- Bairros e regiões específicas da cidade
- Particularidades climáticas ou geográficas que afetam o serviço
- Legislação ou normas locais específicas
- Datas/épocas do ano relevantes para aquela cidade
- Referências a landmarks ou pontos conhecidos da cidade
- Código DDD local no telefone
- Empresas/órgãos locais mencionados como contexto

## Validações obrigatórias
- [ ] Normalização de texto aplicada antes de comparar
- [ ] Nome da cidade removido antes da comparação
- [ ] differentiation_actions geradas sempre que score >= 0.60
- [ ] passed=false quando score >= 0.80

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "city-page-anti-duplication",
  "agent_key": "superpage-orchestrator",
  "input_json": { "service": "...", "city": "...", "existing_pages_count": "int" },
  "output_json": { "passed": "bool", "duplicate_risk": "string", "most_similar_score": "float" },
  "status": "done | failed | warn"
}
```

## Persistência no Supabase
- INSERT em `ai_run_steps`
- Se BLOCKER: UPDATE `jobs` SET status='failed', error_json=`{ "reason": "city_page_duplicate", "similar_to": "<url>", "score": 0.85, "actions": [...] }`
- Emitir job_event: `{ event_type: "error | warn", message: "city-page-anti-duplication: score=0.85 com /p/dedetizacao-santos — BLOCKER" }`

## Exemplo de payload
```json
{
  "new_page": {
    "tenant_id": "uuid-001",
    "service": "dedetização residencial",
    "city": "Campinas",
    "template_key": "local_service_pest_control",
    "sections": [
      { "block_type": "process", "heading": "Como Funciona a Dedetização", "content_preview": "Nossa equipe chega ao local, faz a vistoria..." }
    ]
  },
  "existing_pages": [
    {
      "id": "uuid-page-sp",
      "service": "dedetização residencial",
      "city": "São Paulo",
      "template_key": "local_service_pest_control",
      "sections": [
        { "block_type": "process", "heading": "Como Funciona a Dedetização", "content_preview": "Nossa equipe chega ao local, faz a vistoria..." }
      ],
      "url": "/p/dedetizacao-residencial-sao-paulo"
    }
  ],
  "similarity_threshold_blocker": 0.80,
  "similarity_threshold_warn": 0.60
}
```

## Exemplo de output
```json
{
  "passed": false,
  "duplicate_risk": "blocker",
  "most_similar_page": { "id": "uuid-page-sp", "city": "São Paulo", "score": 0.87 },
  "differentiation_required": true,
  "differentiation_actions": [
    { "section": "process", "action": "Mencionar especificidades de Campinas: clima mais seco no inverno aumenta infestação de baratas — adaptar processo para isso" },
    { "section": "service_areas", "action": "Incluir bairros específicos: Cambuí, Taquaral, Barão Geraldo, Jardim Guanabara" },
    { "section": "differentials", "action": "Mencionar atendimento na região de Campinas e interior paulista como diferencial geográfico" }
  ]
}
```
