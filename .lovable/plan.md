
# Remover Completamente o Stage "Validando Brief"

## Diagnóstico

O problema identificado é que existe um stage "Validando brief..." na UI que:
1. Não corresponde a nenhuma etapa real do backend
2. É mapeado a partir do stage local `'analyzing'` para `'validating'`
3. Causa confusão visual e travamento na UI

### Arquivos Afetados

| Arquivo | Problema |
|---------|----------|
| `src/pages/client/ClientArticleEditor.tsx` | Define `setGenerationStage('analyzing')` em 2 lugares e mapeia para `'validating'` |
| `src/components/client/ArticleGenerationProgress.tsx` | Contém o label `'Validando brief...'` como primeiro stage |
| `src/utils/streamArticle.ts` | Define o tipo `GenerationStage` com `'analyzing'` |

---

## Alterações Necessárias

### 1. `src/components/client/ArticleGenerationProgress.tsx`

**Linha 33-41 — Remover stage "validating" e atualizar lista:**

```typescript
const GENERATION_STAGES: GenerationStage[] = [
  { key: 'classifying', label: 'Classificando intenção...', icon: Brain, progress: 10 },
  { key: 'selecting', label: 'Selecionando template...', icon: LayoutTemplate, progress: 20 },
  { key: 'researching', label: 'Pesquisando na web...', icon: Search, progress: 40 },
  { key: 'outlining', label: 'Gerando estrutura...', icon: ListTree, progress: 55 },
  { key: 'writing', label: 'Escrevendo conteúdo...', icon: FileText, progress: 75 },
  { key: 'optimizing', label: 'Otimizando SEO...', icon: Target, progress: 90 },
];
```

**Resultado:**
- Remove `{ key: 'validating', label: 'Validando brief...', ... }` 
- Inicia com `'classifying'` como primeiro stage visível

---

### 2. `src/pages/client/ClientArticleEditor.tsx`

#### A) Linha 133-143 — Atualizar mapeamento de stages

Remover o mapeamento de `'analyzing'` para `'validating'`:

```typescript
const mapStageToArticleEngine = (stage: GenerationStage): string | null => {
  if (!stage) return null;
  const mapping: Record<string, string> = {
    'analyzing': 'classifying', // Mapeia para primeiro stage real
    'structuring': 'researching',
    'generating': 'writing',
    'finalizing': 'optimizing'
  };
  return mapping[stage] || stage;
};
```

**Resultado:** O stage local `'analyzing'` agora mapeia para `'classifying'` (primeiro stage real do backend)

#### B) Linha 257 — Em `handleConvertOpportunity`

**Opcional:** Manter `setGenerationStage('analyzing')` pois o mapeamento agora leva para `'classifying'`

Ou alternativamente, mudar diretamente para `'generating'` se preferir simplificar:

```typescript
setPhase('generating');
setGenerationStage('generating'); // Alternativa mais direta
setGenerationProgress(10);
```

#### C) Linha 404 — Em `loadExistingArticle`

Mesma lógica - o mapeamento corrigido resolverá o problema.

---

### 3. `src/utils/streamArticle.ts` (Opcional)

O tipo `GenerationStage` pode ser mantido como está, já que `'analyzing'` é um stage local válido que será mapeado corretamente pelo frontend.

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ArticleGenerationProgress.tsx` | Remover item `'validating'/'Validando brief...'` da lista `GENERATION_STAGES` |
| `ClientArticleEditor.tsx` | Atualizar `mapStageToArticleEngine` para mapear `'analyzing'` → `'classifying'` |

---

## Resultado Esperado

1. Nenhuma referência a "brief" na UI
2. Nenhum stage fake que não corresponde ao backend
3. Primeiro stage visível: "Classificando intenção..."
4. Progressão visual alinhada com o que realmente acontece no backend
5. Sem travamento em 85% ou em estágios inexistentes
