

# V4.7.1 — Remoção Definitiva do Template Stage no Frontend

## Problema Confirmado

O backend V4.7 funciona corretamente -- o artigo foi gerado com sucesso (logs confirmam `[STAGE] completed (100%)`). O problema e 100% frontend:

1. **`ArticleGenerationProgress.tsx`** ainda lista "Selecionando template..." como estágio visual
2. **`streamArticle.ts`** ainda emite `onStage?.('structuring')` e define o type com `'structuring'`
3. **`ClientArticleEditor.tsx`** mapeia `'structuring' -> 'selecting'`, que nao existe mais no backend
4. **`ArticleGenerator.tsx`** inclui `{ stage: 'selecting', delay: 1500, progress: 25 }` na simulacao de progresso
5. **`GenerationStepList.tsx`** lista "Definindo estrutura ideal" como step e inclui `'structuring'` no type e STEP_ORDER
6. **`useGenerationPolling.ts`** inclui `'selecting'` no type `GenerationStageType`

O resultado: o polling do backend retorna estágios como `'classifying'`, `'researching'`, `'writing'`, mas o frontend nao encontra match na lista de stages (porque espera `'selecting'` entre eles), fazendo `currentStageIndex = -1` e travando visualmente em "Classificando intenção..." com 85% de progresso.

## Alteracoes Necessarias (6 arquivos)

### 1. `src/components/client/ArticleGenerationProgress.tsx`

- Remover stage `{ key: 'selecting', label: 'Selecionando template...', ... }` da lista GENERATION_STAGES
- Adicionar stage `'seo'` que o backend realmente emite
- Recalibrar percentuais de progresso
- Remover import de `LayoutTemplate` (nao mais usado)

**Stages V4.7.1:**
```
classifying (10%) -> researching (30%) -> writing (60%) -> seo (75%) -> images (88%) -> finalizing (98%)
```

### 2. `src/utils/streamArticle.ts`

- Remover `'structuring'` do type `GenerationStage`
- Remover as linhas 158-160 que chamam `onStage?.('structuring')` e `onProgress?.(15)`

**Type atualizado:** `'analyzing' | 'generating' | 'finalizing' | null`

### 3. `src/pages/client/ClientArticleEditor.tsx`

- Remover `'structuring': 'selecting'` do mapping (linha 141)

### 4. `src/pages/client/ArticleGenerator.tsx`

- Remover `{ stage: 'selecting', delay: 1500, progress: 25 }` do PROGRESS_SEQUENCE (linha 57)
- Recalibrar progresso das etapas restantes

### 5. `src/components/client/GenerationStepList.tsx`

- Remover `'structuring'` do type `GenerationStep`
- Remover `{ id: 'structuring', label: 'Definindo estrutura ideal', icon: LayoutTemplate }` dos STEPS
- Remover `'structuring'` do STEP_ORDER
- Remover import de `LayoutTemplate`

### 6. `src/hooks/useGenerationPolling.ts`

- Remover `'selecting'` do type `GenerationStageType`

## Mapeamento de Progresso V4.7.1

| Estagio | Antes | Depois |
|---------|-------|--------|
| classifying | 15% | 10% |
| selecting | 25% | **REMOVIDO** |
| researching | 40% | 30% |
| writing | 70% | 60% |
| seo | (nao existia) | 75% |
| images | 85% | 88% |
| finalizing | 95% | 98% |

## Secao Tecnica

### Causa Raiz do Travamento em 85%

O `useGenerationPolling` faz polling real do banco e retorna `stage = 'classifying'` (ou outro estagio real). Porem, o componente `ArticleGenerationProgress` usa `GENERATION_STAGES.findIndex(s => s.key === currentStage)` para determinar o index atual. Como os estagios do backend nao incluem `'selecting'`, mas a lista visual sim, o calculo fica desalinhado:

- Backend reporta progresso em 85% (polling real)
- Frontend mostra 85% na barra
- Mas `currentStageIndex` nao avanca porque o estagio `'selecting'` nunca e atingido
- Resultado: visualmente preso em "Classificando intencao..." enquanto a barra mostra 85%

### Fluxo Correto Pos-Fix

```text
Frontend: analyzing -> researching -> writing -> seo -> images -> finalizing -> completed
Backend:  classifying -> researching -> writing -> seo -> qa -> images -> finalizing -> completed
```

O mapeamento e direto -- o frontend so precisa mostrar os estagios que o backend realmente emite.

