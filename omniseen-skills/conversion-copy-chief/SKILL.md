# SKILL: conversion-copy-chief

## Finalidade
Gera CTAs, headlines e copy de conversão para super pages e artigos de intenção comercial/local/transacional. Não escreve o conteúdo principal — apenas os elementos de persuasão: hero headline, subheadline, CTAs, objection handlers e urgency elements. Baseado nos dados reais do tenant (sem inventar benefícios).

## Motor
MOTOR 3 — GERAÇÃO

## Agentes que usam esta skill
- superpage-orchestrator (step 5 — antes do section-stack-builder)
- content-refresh-agent (cta_improvement refresh type)

## Inputs
```json
{
  "empresa": "string",
  "servico": "string",
  "cidade": "string",
  "telefone": "string",
  "intent": "commercial | local | transactional",
  "proof_available": "<output do local-proof-pack>",
  "locale": "pt-BR | en-US",
  "cta_primary_type": "phone | whatsapp | form",
  "tenant_id": "uuid"
}
```

## Outputs
```json
{
  "hero_headline": "string",
  "hero_subheadline": "string",
  "cta_primary": { "label": "string", "value": "string", "type": "phone | whatsapp | form" },
  "cta_secondary": { "label": "string", "value": "string", "type": "string" },
  "objection_handlers": ["string — máx 3 respostas a objeções comuns"],
  "urgency_element": "string | null — ex: 'Atendimento em 24h', 'Orçamento grátis hoje'",
  "value_proposition": "string — 1 frase com o benefício principal verificável"
}
```

## Regras de execução
1. hero_headline: max 10 palavras. Deve conter serviço + cidade OU benefício principal.
2. CTA labels em PT-BR: "Ligar Agora", "Falar no WhatsApp", "Pedir Orçamento". Em EN-US: "Call Now", "Get a Free Quote".
3. urgency_element: usar SOMENTE se verificável (ex: se tenant informou atendimento 24h nos inputs).
4. objection_handlers: baseados em objeções reais do setor (usar PAA como base).
5. value_proposition: derivar do que está em proof_available — NUNCA inventar benefícios.
6. Não usar superlativo sem prova: "MELHOR empresa", "MAIS BARATO" são proibidos.

## Persistência no Supabase
- Output via superpage-orchestrator — não persiste diretamente
- INSERT em `ai_run_steps`
