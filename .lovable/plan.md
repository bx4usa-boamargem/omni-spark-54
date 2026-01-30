

# Correção Definitiva V4.5 — Pipeline 100% Non-Blocking

## Resumo

O pipeline de geração de artigos ainda contém **6 pontos de abort** que causam erros 422/400. Esta correção elimina **todos** os retornos antecipados por validação de qualidade, convertendo-os em warnings.

---

## Problemas Identificados

| Arquivo | Linha | Problema | Código de Erro |
|---------|-------|----------|----------------|
| `qualityGate.ts` | 34-38 | `return { passed: false }` | MISSING_TITLE |
| `qualityGate.ts` | 44-48 | `return { passed: false }` | MISSING_INTRODUCTION |
| `qualityGate.ts` | 62-66 | `return { passed: false }` | INSUFFICIENT_SECTIONS |
| `qualityGate.ts` | 79-83 | `return { passed: false }` | INVALID_SECTIONS |
| `qualityGate.ts` | 117-121 | `return { passed: false }` | MISSING_HERO_IMAGE |
| `generate-article-structured/index.ts` | 1636-1650 | `return new Response(..., { status: 400 })` | MISSING_CITY |

---

## Alterações Detalhadas

### 1. Arquivo: `supabase/functions/_shared/qualityGate.ts`

**Reescrever completamente** para eliminar todos os `return { passed: false }`.

**Mudanças principais:**

- Adicionar log obrigatório no início: `[PIPELINE] Never aborting on quality gate - draft fallback active`
- Converter todos os hard gates em warnings com prefixo `critical_`
- Garantir que a função **SEMPRE** retorna `{ passed: true }`
- Calcular métricas **antes** das validações para retornar sempre

**Novo comportamento de cada gate:**

| Gate Antigo | Comportamento Novo |
|-------------|-------------------|
| Title missing → `passed: false` | `critical_missing_title` warning |
| Introduction short → `passed: false` | `critical_introduction` warning |
| Sections < minimum → `passed: false` | `insufficient_sections` warning |
| Invalid sections → `passed: false` | `invalid_sections` warning |
| Hero image missing → `passed: false` | `missing_hero_image` warning |
| FAQ/Images/Words → warning | Mantém como warning |

---

### 2. Arquivo: `supabase/functions/_shared/qualityGateConfig.ts`

**Atualizar comentário** para refletir V4.5:

```typescript
/**
 * Quality Gate Configuration
 * V4.5: NUNCA ABORTA - Todos os thresholds são apenas para warnings
 * Artigos são salvos como draft quando thresholds não são atingidos
 */
```

---

### 3. Arquivo: `supabase/functions/generate-article-structured/index.ts`

**Linha 1633-1651:** Substituir abort por fallback + warning

Antes:
```typescript
if (!city || city.trim() === '') {
  console.error(`[${requestId}][QualityGate] ❌ ABORT: Missing city after all fallbacks`);
  return new Response(
    JSON.stringify({ error: 'QUALITY_GATE_FAILED', code: ERROR_CODES.MISSING_CITY, ... }),
    { status: 400, headers: {...} }
  );
}
```

Depois:
```typescript
if (!city || city.trim() === '') {
  console.warn(`[${requestId}][PIPELINE] Forcing draft fallback - city missing, using "Brasil"`);
  city = 'Brasil';
}
```

**Linha ~2475:** Adicionar log obrigatório após Quality Gate:

```typescript
console.log(`[${requestId}][PIPELINE] Never aborting on quality gate - draft fallback active`);
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `supabase/functions/_shared/qualityGate.ts` | Reescrita completa (~100 linhas) |
| `supabase/functions/_shared/qualityGateConfig.ts` | Atualizar comentário |
| `supabase/functions/generate-article-structured/index.ts` | Remover abort linha 1636-1650, adicionar log |

---

## Verificação Global

O resultado da busca confirma que:

- **status: 422** - Existe em `generate-image/index.ts` (não relacionado ao Quality Gate)
- **status: 400** - Existe em várias funções (validações de input, não Quality Gate) + linha 1649 de `generate-article-structured` (será removida)
- **QUALITY_GATE_FAILED** - Existe em 2 arquivos (ambos serão corrigidos)
- **passed: false** - Existe **apenas** em `qualityGate.ts` (será completamente removido)

---

## Deploy Necessário

Após aplicar as alterações:

1. `generate-article-structured` (contém o abort de city + lógica do Quality Gate)
2. `generate-images-background` (depende indiretamente do fluxo)

---

## Validação Esperada

Após a implementação, os logs devem mostrar:

```text
[PIPELINE] Never aborting on quality gate - draft fallback active
[QualityGate] Running validation for mode: authority
[QualityGate] WARNING: FAQ 2 < 8
[QualityGate] ✅ PASSED (1 warnings)
[PERSIST] ✅ Article inserted: id=...
[STAGE] completed (100%)
```

---

## Seção Técnica

### Fluxo V4.5

```text
INPUT: Artigo gerado pela IA
         ↓
QUALITY GATE: runQualityGate()
  - SEMPRE retorna passed: true
  - Coleta warnings (critical_ e standard)
  - Log: [PIPELINE] Never aborting...
         ↓
DECISION LOGIC (caller):
  if (warnings.some(w => w.startsWith('critical_')))
    → status = 'draft'
  else
    → status = autoPublish ? 'published' : 'draft'
         ↓
PERSISTENCE: Artigo salvo no banco
  - generation_stage = 'completed'
  - generation_progress = 100
         ↓
OUTPUT: Response 200 com success: true
```

### Tipos de Warning

| Prefixo | Significado | Ação no Caller |
|---------|-------------|----------------|
| `critical_` | Problema estrutural grave | Força `status: 'draft'` |
| `insufficient_` | Abaixo do threshold | Registra para analytics |
| `invalid_` | Conteúdo com problemas | Registra para analytics |
| `missing_` | Elemento ausente | Registra para analytics |

