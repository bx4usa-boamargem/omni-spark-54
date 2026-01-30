

# Ajuste do Frontend: Remover Fallback Legado de `null`

## Contexto

Com a implementação V4.3 da máquina de estados determinística no backend, o `generation_stage` agora **sempre** terá um valor definido:
- Estados intermediários: `classifying`, `selecting`, `researching`, `writing`, `seo`, `qa`, `images`, `finalizing`
- Estados finais: `completed` ou `failed`

O frontend não deve mais aceitar `null` como estado final válido.

---

## Alterações no Arquivo

**Arquivo:** `src/hooks/useGenerationPolling.ts`

### Alteração 1: Tipo `GenerationStageType` (linhas 11-20)

Remover `null` da union type:

```typescript
// ANTES
export type GenerationStageType = 
  | 'classifying' 
  | 'selecting' 
  | 'researching' 
  | 'writing' 
  | 'images' 
  | 'finalizing' 
  | 'completed' 
  | 'failed' 
  | null;

// DEPOIS
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

**Nota:** Também adicionados os estados `seo` e `qa` que faltavam no tipo.

---

### Alteração 2: Estado inicial (linha 47)

```typescript
// ANTES
stage: null,

// DEPOIS
stage: 'classifying',
```

O estado inicial agora é `classifying` (o primeiro estado da máquina).

---

### Alteração 3: Parsing do stage (linha 76)

```typescript
// ANTES
const newStage = (data.generation_stage as GenerationStageType) || null;

// DEPOIS
const newStage = (data.generation_stage as GenerationStageType) || 'classifying';
```

Se o banco retornar `null` (dados legados), assumir `classifying` como fallback seguro.

---

### Alteração 4: Refs iniciais (linhas 56-57)

```typescript
// ANTES
const lastStageRef = useRef<GenerationStageType>(null);

// DEPOIS
const lastStageRef = useRef<GenerationStageType>('classifying');
```

---

### Alteração 5: Condição de completion (linha 100)

```typescript
// ANTES
if (newStage === null || newStage === 'completed') {
  onComplete?.();
}

// DEPOIS
if (newStage === 'completed') {
  console.log('[GenerationPolling] ✅ Generation completed');
  onComplete?.();
}
```

**Removido** o fallback `null`. Agora apenas `completed` é aceito como estado final de sucesso.

---

### Alteração 6: Detecção de stuck (linha 136)

```typescript
// ANTES
const isStuck = stuckCounter > 7 && status.stage === 'classifying';

// DEPOIS
const isStuck = stuckCounter > 10 && 
  (status.stage === 'classifying' || status.stage === 'researching');
```

Ajustado para considerar também `researching` como potencial ponto de travamento (Perplexity timeout).

---

## Resumo das Mudanças

| Local | Antes | Depois |
|-------|-------|--------|
| Tipo `GenerationStageType` | Inclui `null` | Remove `null`, adiciona `seo`, `qa` |
| Estado inicial | `null` | `'classifying'` |
| Parsing do banco | `\|\| null` | `\|\| 'classifying'` |
| Condição de completion | `null \|\| completed` | Apenas `completed` |
| Detecção de stuck | Apenas `classifying` | `classifying` ou `researching` |

---

## Resultado Esperado

Após esta alteração:
- O frontend NÃO aceita mais `null` como estado final
- A UI aguarda explicitamente por `generation_stage = 'completed'`
- Estados legados são tratados como `classifying` (fallback seguro)
- A tipagem TypeScript reflete a máquina de estados real

