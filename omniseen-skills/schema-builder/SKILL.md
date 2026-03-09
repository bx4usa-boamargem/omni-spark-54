# SKILL: schema-builder

## Finalidade
Gera JSON-LD de schema.org válido para todos os tipos de conteúdo da OmniSeen: Article, LocalBusiness, Service, FAQPage, BreadcrumbList, Organization. Garante que o schema é consistente com o conteúdo real — sem dados inventados ou placeholders. Este schema vai diretamente no HTML do portal SSR.

## Motor
MOTOR 3 — GERAÇÃO

## Agentes que usam esta skill
- schema-and-technical-seo-agent (principal)
- superpage-orchestrator (step 7)
- longform-article-orchestrator (step 4, para Article schema)
- content-refresh-agent (schema-refresh-engine chama esta skill)

## Inputs
```json
{
  "content_type": "blog | super_page",
  "schema_types_requested": ["Article", "LocalBusiness", "Service", "FAQPage", "BreadcrumbList", "Organization"],
  "content_data": {
    "title": "string",
    "description": "string",
    "slug": "string",
    "canonical_url": "string",
    "published_at": "timestamptz | null",
    "modified_at": "timestamptz | null",
    "author_name": "string | null",
    "locale": "pt-BR | en-US"
  },
  "business_data": {
    "name": "string",
    "service": "string",
    "city": "string",
    "phone": "string",
    "address": {
      "streetAddress": "string | null",
      "addressLocality": "string",
      "addressRegion": "string",
      "postalCode": "string | null",
      "addressCountry": "BR | US"
    },
    "latitude": "float | null",
    "longitude": "float | null",
    "opening_hours": ["string | null"]
  },
  "faq_items": [
    { "question": "string", "answer": "string" }
  ],
  "breadcrumbs": [
    { "name": "string", "url": "string", "position": "int" }
  ],
  "tenant_id": "uuid",
  "ai_run_id": "uuid"
}
```

## Outputs
```json
{
  "schema_json": {
    "@context": "https://schema.org",
    "@graph": [
      "<um objeto por tipo solicitado>"
    ]
  },
  "schema_html_tag": "string — <script type='application/ld+json'>...</script>",
  "schemas_generated": ["string — lista dos tipos efetivamente gerados"],
  "schemas_skipped": [
    {
      "type": "string",
      "reason": "string — ex: 'LocalBusiness skipped: endereço ausente'"
    }
  ],
  "warnings": ["string"]
}
```

## Regras por tipo de schema

### Article
- Obrigatório: headline, author, datePublished, url
- Se datePublished = null: usar created_at
- Se author_name = null: usar nome do brand
- Image: incluir somente se existe imagem real associada — NUNCA URL placeholder

### LocalBusiness
- REGRA CRÍTICA: só gerar se phone disponível
- address: só incluir PostalAddress se streetAddress não null
- Se sem endereço: usar addressLocality (cidade) + addressRegion — sem rua inventada
- GeoCoordinates: só se latitude e longitude disponíveis e verificados
- Não inventar opening_hours — se null, omitir o campo

### Service
- Subtype de LocalBusiness ou standalone
- serviceType: derivado do input "servico"
- areaServed: usar city + region

### FAQPage
- Mínimo 3 pares Q&A
- acceptedAnswer.text: resposta completa, não truncada
- Se faq_items < 3: NÃO gerar FAQPage schema

### BreadcrumbList
- Sempre gerar para super_pages e artigos
- Mínimo: Home > [Categoria] > [Título da página]
- position começa em 1

### Organization
- Subtype de LocalBusiness quando aplicável
- legalName: usar brand_name
- Não gerar se brand_name não disponível

## Regras globais
1. NUNCA inventar dados não fornecidos — se campo crítico ausente, omitir o campo ou pular o schema type.
2. JSON-LD deve ser JSON válido — validar antes de retornar.
3. Usar @graph para combinar múltiplos schemas em um único script tag.
4. schemas_skipped: documentar SEMPRE o que foi pulado e por quê.
5. Para PT-BR: language em Article = "pt-BR", inLanguage = "pt-BR".
6. Para EN-US: language = "en-US".

## Validações obrigatórias
- [ ] JSON-LD é JSON válido (parseable)
- [ ] @context = "https://schema.org"
- [ ] Nenhum campo com valor null no output (omitir campos null em vez de incluir null)
- [ ] schemas_generated lista somente os schemas efetivamente gerados
- [ ] FAQPage só gerado se faq_items >= 3
- [ ] LocalBusiness só gerado se phone disponível

## Step-level logging (OBRIGATÓRIO)
```json
{
  "step_key": "schema-builder",
  "agent_key": "schema-and-technical-seo-agent | superpage-orchestrator",
  "input_json": { "schema_types_requested": [], "has_address": "bool", "has_faq": "bool" },
  "output_json": { "schemas_generated": [], "schemas_skipped": [], "warnings": [] },
  "status": "done | failed"
}
```

## Persistência no Supabase
- UPDATE `landing_pages` SET schema_json
- UPDATE `articles` SET schema_json (se campo existir)
- INSERT em `ai_run_steps`
- Emitir job_event: `{ event_type: "step_completed", message: "schema-builder: gerado=[LocalBusiness,Service,FAQPage,BreadcrumbList], skipped=[]" }`

## Exemplo de output (LocalBusiness + FAQPage)
```json
{
  "schema_json": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "name": "DedetizaSP",
        "telephone": "+55-11-99999-9999",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "São Paulo",
          "addressRegion": "SP",
          "addressCountry": "BR"
        },
        "areaServed": "São Paulo",
        "url": "https://dedetizasp.omniseen.app"
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Quanto tempo dura o efeito da dedetização?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "O efeito da dedetização residencial dura em média de 3 a 6 meses, dependendo do produto utilizado e das condições do imóvel."
            }
          }
        ]
      }
    ]
  },
  "schemas_generated": ["LocalBusiness", "FAQPage", "BreadcrumbList"],
  "schemas_skipped": [
    { "type": "GeoCoordinates", "reason": "latitude/longitude não fornecidos" }
  ]
}
```
