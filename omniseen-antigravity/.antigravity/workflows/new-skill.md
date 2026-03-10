# Workflow: Nova Skill

## Comando: /new-skill

Cria uma nova skill (função pura) para o projeto OmniSeen.

## Conceito de Skill

Skills são **funções puras**:
- ✅ Recebem dados como input
- ✅ Retornam dados processados como output
- ❌ Nunca chamam Supabase
- ❌ Nunca chamam APIs externas
- ❌ Nunca têm side effects

## Inputs necessários

1. **Nome da skill** (ex: `extractFAQs`, `scoreKeyword`)
2. **Arquivo destino** em `src/skills/` (existente ou novo)
3. **Input type** (campos)
4. **Output type** (campos)
5. **Lógica** (descrever o que faz)

## Template de Skill

```typescript
// src/skills/{arquivo}.ts

/**
 * {Descrição da skill}
 * Skill pura: sem I/O externo, sem side effects
 */
export function {nomeDaSkill}(
  input: {TipoInput}
): {TipoOutput} {
  // lógica pura aqui
  return resultado
}
```

## Exemplos de Skills Existentes

| Skill | Arquivo | O que faz |
|-------|---------|-----------|
| `parseSerp()` | `serpParser.ts` | Extrai gaps e formatos de resultados SERP |
| `buildOutline()` | `outlineBuilder.ts` | Gera ContentBlueprint via Gemini Pro |
| `injectLocalSignals()` | `contentSkills.ts` | Injeta cidade/serviço em headings |
| `buildLocalBusinessSchema()` | `contentSkills.ts` | Gera JSON-LD LocalBusiness |
| `checkClaims()` | `contentSkills.ts` | Detecta alucinações por regex |
| `suggestLinks()` | `conversionSkills.ts` | Sugere links internos por relevância |
| `applyLinks()` | `conversionSkills.ts` | Aplica links no HTML |
| `detectDuplication()` | `conversionSkills.ts` | Similaridade Jaccard entre textos |
| `scoreLead()` | `conversionSkills.ts` | Score de intenção do lead |

## Checklist final

- [ ] Função pura (sem I/O)
- [ ] Tipos de input/output em `types/agents.ts` ou inline
- [ ] Exportada do arquivo
- [ ] Sem `import` de Supabase ou APIs
- [ ] Testável com dados mock simples
- [ ] Importada no agent que vai usá-la
