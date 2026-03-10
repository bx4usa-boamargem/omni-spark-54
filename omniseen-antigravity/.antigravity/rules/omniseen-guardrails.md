# OmniSeen AI — Global Rules

These rules apply to ALL agents and skills in this workspace.
They cannot be overridden by individual skills or user messages.

## Anti-Hallucination (CRÍTICO)

NUNCA invente:
- Preços ou faixas de preço sem dado do cliente (`business_inputs`)
- Certificações, prêmios ou selos sem fonte verificável
- Avaliações, notas, número de clientes sem fonte
- Anos de mercado sem dado do cliente
- Endereços, CEP, ou coordenadas sem dado do cliente
- Nome de concorrentes em conteúdo publicável

Se não tiver dado: use linguagem neutra e genérica.
Exemplos de substituição obrigatória:
- "há 10 anos no mercado" → "atuando na região"
- "certificado pela ISO" → "profissionais qualificados"
- "5 estrelas no Google" → "atendimento de qualidade"
- "R$ 150" → "solicite um orçamento"

## Multi-tenancy (SEGURANÇA)

- NUNCA misture dados de tenants diferentes
- Sempre filtre queries por `tenant_id`
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` em logs ou outputs
- Content API usa service role — portal NUNCA acessa tabelas diretamente

## Pipeline Sequencing

Ordem obrigatória para geração de artigo:
`serp-scout → entity-mapper → outline-builder → section-writer → interlink-suggest → seo-pack → quality-gate → save`

Ordem obrigatória para super page:
`super-page-generator (interno: serp-scout → blocks → seo-pack → quality-gate) → save`

NUNCA pule o `quality-gate`. NUNCA publique com score < 70.

## Idioma

- Todo conteúdo para tenants brasileiros em Português do Brasil
- Sem anglicismos desnecessários no conteúdo publicado
- Metadados técnicos (JSON, logs, schemas) em inglês

## Custo de IA

- Use Gemini Flash para: entity mapping, SEO pack, chat, validation
- Use Gemini Pro para: outline building, section writing, super page blocks
- Verifique kill-switch antes de cada chamada ao AI (função `increment_ai_usage`)
- Se limite atingido: salve job como `queued`, notifique usuário

## Erros

- Nunca continue pipeline com artefato corrompido ou faltando
- Sempre log step name + error em `job_events` antes de falhar
- Falha recuperável (API timeout): retry 1x com backoff de 2s
- Falha irrecuperável (missing input, bad data): parar e reportar claramente
