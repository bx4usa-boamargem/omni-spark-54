# SKILL: anti-hallucination-validator

## Finalidade
Skill dedicada exclusivamente à detecção e correção de alucinações em conteúdo gerado por IA. Separada do quality-gate para ser chamada independentemente em contextos de refresh, super page e artigo. Foca em claims factuais não verificáveis: preços, estatísticas, anos de mercado, certificações, avaliações de clientes. É BLOCKER por padrão para super pages locais.

## Motor
MOTOR 3 — GERAÇÃO / MOTOR 4 — REFRESH

## Agentes que usam esta skill
- quality-gate (chama esta skill internamente)
- superpage-orchestrator (step 9 direto)
- content-refresh-agent (ao publicar refresh)

## Inputs
```json
{
  "content_html": "string",
  "content_type": "blog | super_page",
  "is_local_page": "boolean",
  "web_research_enabled": "boolean",
  "research_json": "object | null",
  "locale": "pt-BR | en-US",
  "tenant_id": "uuid"
}
```

## Outputs
```json
{
  "hallucinations_found": "boolean",
  "items": [
    {
      "type": "statistic | price | certification | review | years_experience | study_reference | award",
      "excerpt": "string — trecho exato do conteúdo",
      "severity": "blocker | warn",
      "auto_fixable": "boolean",
      "suggested_fix": "string"
    }
  ],
  "content_html_fixed": "string — HTML com fixes aplicados",
  "fix_count": "int",
  "blocker_count": "int"
}
```

## Padrões de detecção (regex + semântica)
### SEMPRE BLOCKER em super pages locais:
- Preço inventado: "a partir de R$X", "custa R$X", "$X for service"
- Certificação sem verificação: "certificado pela ANVISA", "ISO 9001", "CREA/CRBIO"
- Anos de mercado: "X anos de experiência", "desde XXXX" (sem verificação)
- Review/depoimento genérico: "Maria disse que...", "★★★★★" sem fonte verificável
- Estudo inventado: "pesquisa mostra que X%", "segundo o IBGE/INMET/OMS X%"

### WARN em blogs:
- Estatísticas sem URL de fonte no research_json
- Datas específicas sem contexto verificável
- Nomes de estudos sem referência

### Auto-fix possível:
- "a partir de R$150" → "entre em contato para orçamento"
- "certificado pela ANVISA" → "utiliza produtos registrados"
- "há 15 anos no mercado" → "com anos de experiência no mercado"
- "X% dos clientes" → remover a estatística

### Sem auto-fix (blocker manual):
- Reviews com nomes de clientes inventados
- Prêmios específicos não verificados

## Persistência no Supabase
- INSERT em `ai_run_steps`
- INSERT em `omnisim_artifacts`: artifact_type="validation_report"
