

# V4.7.1 — Remoção Definitiva do Template Stage no Frontend

## Diagnóstico Confirmado

O backend V4.7 já utiliza template fixo síncrono e não executa mais `selectTemplate` async. No entanto, o frontend ainda possui referências ao estágio "selecting/structuring/template" em **6 arquivos**, causando travamento visual em ~15-25%.

### Pontos Identificados

| Arquivo | Problema |
|---------|----------|
| `src/hooks/useGenerationPolling.ts` | Type inclui `'selecting'` como estágio válido |
| `src/components/client/ArticleGenerationProgress.tsx` | Stage `'selecting'` com label "Selecionando template..." e progress 25% |
| `src/pages/client/ArticleGenerator.tsx` | Sequência de progresso inclui `{ stage: 'selecting', delay: 1500, progress: 25 }` |
| `src/pages/client/ClientArticleEditor.tsx` | Mapping `'structuring': 'selecting'` |
| `src/utils/streamArticle.ts` | Type `GenerationStage` inclui `'structuring'` e chama `onStage?.('structuring')` |
| `src/components/client/GenerationStepList.tsx` | Step `'structuring'` com label "Definindo estrutura ideal" |

---

## Alterações Necessárias

### 1. `src/hooks/useGenerationPolling.ts`

**Linha 11-21:** Remover `'selecting'` do type

**Antes:**
```typescript
export type GenerationStageType = 
  | 'classifying' 
  | 'selecting' 
  | 'researching' 
  | 'writing' 
  | 'seo'
  | 'qa'
  | 'images' 
  | 'finalizing' 
  | 'completed' 
  | 'failed';
```

**Depois:**
```typescript
export type GenerationStageType = 
  | 'classifying' 
  | 'researching' 
  | 'writing' 
  | 'seo'
  | 'qa'
  | 'images' 
  | 'finalizing' 
  | 'completed' 
  | 'failed';
```

---

### 2. `src/components/client/ArticleGenerationProgress.tsx`

**Linhas 40-47:** Remover estágio `'selecting'` e recalibrar progresso

**Antes:**
```typescript
const GENERATION_STAGES: GenerationStage[] = [
  { key: 'classifying', label: 'Classificando intenção...', icon: Brain, progress: 15 },
  { key: 'selecting', label: 'Selecionando template...', icon: LayoutTemplate, progress: 25 },
  { key: 'researching', label: 'Pesquisando referências...', icon: Search, progress: 40 },
  { key: 'writing', label: 'Escrevendo conteúdo...', icon: FileText, progress: 70 },
  { key: 'images', label: 'Gerando imagens...', icon: Image, progress: 85 },
  { key: 'finalizing', label: 'Finalizando artigo...', icon: Target, progress: 95 },
];
```

**Depois (V4.7.1 - sem template stage, progresso recalibrado):**
```typescript
const GENERATION_STAGES: GenerationStage[] = [
  { key: 'classifying', label: 'Classificando intenção...', icon: Brain, progress: 10 },
  { key: 'researching', label: 'Pesquisando referências...', icon: Search, progress: 30 },
  { key: 'writing', label: 'Escrevendo conteúdo...', icon: FileText, progress: 60 },
  { key: 'seo', label: 'Otimizando SEO...', icon: Target, progress: 75 },
  { key: 'images', label: 'Gerando imagens...', icon: Image, progress: 88 },
  { key: 'finalizing', label: 'Finalizando artigo...', icon: CheckCircle2, progress: 98 },
];
```

Também remover import de `LayoutTemplate` se não usado em outro lugar.

---

### 3. `src/pages/client/ArticleGenerator.tsx`

**Linhas 54-62:** Remover `'selecting'` da sequência de progresso simulada

**Antes:**
```typescript
const PROGRESS_SEQUENCE = [
  { stage: 'validating', delay: 500, progress: 5 },
  { stage: 'classifying', delay: 1000, progress: 15 },
  { stage: 'selecting', delay: 1500, progress: 25 },
  { stage: 'researching', delay: 15000, progress: 45 },
  { stage: 'outlining', delay: 3000, progress: 55 },
  { stage: 'writing', delay: 25000, progress: 75 },
  { stage: 'optimizing', delay: 5000, progress: 90 }
];
```

**Depois (V4.7.1 - fluxo alinhado ao backend):**
```typescript
const PROGRESS_SEQUENCE = [
  { stage: 'validating', delay: 500, progress: 5 },
  { stage: 'classifying', delay: 1000, progress: 10 },
  { stage: 'researching', delay: 15000, progress: 35 },
  { stage: 'writing', delay: 25000, progress: 65 },
  { stage: 'seo', delay: 5000, progress: 80 },
  { stage: 'images', delay: 5000, progress: 92 }
];
```

---

### 4. `src/pages/client/ClientArticleEditor.tsx`

**Linhas 139-146:** Remover mapping de `'structuring'` para `'selecting'`

**Antes:**
```typescript
const mapping: Record<string, string> = {
  'analyzing': 'classifying',
  'structuring': 'selecting',
  'generating': 'writing',
  'images': 'images',
  'finalizing': 'finalizing'
};
```

**Depois (V4.7.1 - analyzing vai direto para researching/writing):**
```typescript
const mapping: Record<string, string> = {
  'analyzing': 'classifying',
  'generating': 'writing',
  'images': 'images',
  'finalizing': 'finalizing'
};
```

---

### 5. `src/utils/streamArticle.ts`

**Linha 47:** Remover `'structuring'` do type
**Linhas 158-160:** Remover chamada `onStage?.('structuring')`

**Antes (linha 47):**
```typescript
export type GenerationStage = 'analyzing' | 'structuring' | 'generating' | 'finalizing' | null;
```

**Depois:**
```typescript
export type GenerationStage = 'analyzing' | 'generating' | 'finalizing' | null;
```

**Antes (linhas 158-160):**
```typescript
// Stage 2: Structuring
onStage?.('structuring');
onProgress?.(15);
```

**Depois (remover completamente ou ajustar):**
```typescript
// V4.7.1: Template stage removido - progresso ajustado
onProgress?.(15);
```

---

### 6. `src/components/client/GenerationStepList.tsx`

**Linhas 4-12:** Remover `'structuring'` do type
**Linhas 19-27:** Remover step `'structuring'`
**Linha 29:** Remover do STEP_ORDER

**Antes (type):**
```typescript
export type GenerationStep = 
  | 'analyzing' 
  | 'structuring' 
  | 'generating' 
  | 'seo' 
  | 'rhythm' 
  | 'images' 
  | 'publishing' 
  | 'complete';
```

**Depois:**
```typescript
export type GenerationStep = 
  | 'analyzing' 
  | 'generating' 
  | 'seo' 
  | 'rhythm' 
  | 'images' 
  | 'publishing' 
  | 'complete';
```

**Antes (STEPS):**
```typescript
const STEPS = [
  { id: 'analyzing' as const, label: 'Analisando seu nicho', icon: Brain },
  { id: 'structuring' as const, label: 'Definindo estrutura ideal', icon: LayoutTemplate },
  { id: 'generating' as const, label: 'Gerando conteúdo principal', icon: FileText },
  // ...
];
```

**Depois:**
```typescript
const STEPS = [
  { id: 'analyzing' as const, label: 'Analisando intenção e nicho', icon: Brain },
  { id: 'generating' as const, label: 'Gerando conteúdo principal', icon: FileText },
  // ...
];
```

**Antes (STEP_ORDER):**
```typescript
const STEP_ORDER: GenerationStep[] = ['analyzing', 'structuring', 'generating', 'seo', 'rhythm', 'images', 'publishing', 'complete'];
```

**Depois:**
```typescript
const STEP_ORDER: GenerationStep[] = ['analyzing', 'generating', 'seo', 'rhythm', 'images', 'publishing', 'complete'];
```

---

## Fluxo V4.7.1 Final

```text
Frontend Progress Flow:
┌─────────────────────────────────────────────────────────┐
│   analyzing (10%) → researching (30%) → writing (60%)  │
│        ↓                                               │
│   seo (75%) → images (88%) → finalizing (98%)         │
│        ↓                                               │
│   completed (100%)                                     │
└─────────────────────────────────────────────────────────┘

Backend FSM:
classifying → researching → writing → seo → qa → images → finalizing → completed
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `src/hooks/useGenerationPolling.ts` | Remover `'selecting'` do type |
| `src/components/client/ArticleGenerationProgress.tsx` | Remover stage selecting, recalibrar % |
| `src/pages/client/ArticleGenerator.tsx` | Remover selecting do PROGRESS_SEQUENCE |
| `src/pages/client/ClientArticleEditor.tsx` | Remover mapping structuring→selecting |
| `src/utils/streamArticle.ts` | Remover structuring do type e chamada |
| `src/components/client/GenerationStepList.tsx` | Remover structuring do type, STEPS e STEP_ORDER |

---

## Critérios de Aceite

| # | Critério |
|---|----------|
| 1 | Nenhum log ou stage referenciando "template" ou "selecting" ou "structuring" no código |
| 2 | Progresso não trava mais em 15-25% |
| 3 | Fluxo visual: analyzing → writing → seo → images → completed |
| 4 | Cálculo percentual recalibrado sem considerar template stage |
| 5 | Build sem erros TypeScript |

---

## Seção Técnica

### Mapeamento de Progresso V4.7.1

| Estágio | Progresso Anterior | Progresso V4.7.1 |
|---------|-------------------|------------------|
| classifying/analyzing | 15% | 10% |
| selecting | 25% | **REMOVIDO** |
| researching | 40% | 30% |
| writing | 70% | 60% |
| seo | - | 75% |
| images | 85% | 88% |
| finalizing | 95% | 98% |
| completed | 100% | 100% |

### Validação Pós-Implementação

Executar busca global por:
- `selecting` (deve retornar apenas uso não relacionado a generation stage)
- `structuring` (deve retornar zero em contexto de generation)
- `template.*stage` (deve retornar zero)
- `Selecionando template` (deve retornar zero)

