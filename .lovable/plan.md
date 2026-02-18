
# Progresso Real por Fases na Geracao de Artigos

## Problema
O componente `ClientArticleEditor.tsx` usa um **timer simulado** (`setInterval` incrementando +8% a cada 2s) em vez de polling real do banco de dados. Isso faz com que o indicador de progresso fique travado em "Classificando intencao..." mesmo quando o backend ja avancou para outras etapas. Alem disso, o `mapStageToArticleEngine` so mapeia 4 dos 6 estagios (falta `researching` e `seo`).

O `ArticleGenerator.tsx` ja faz isso corretamente com `useGenerationPolling` -- a correcao e replicar esse padrao no editor.

## Plano de Correcao

### 1. Atualizar `mapStageToArticleEngine` no ClientArticleEditor

**Arquivo**: `src/pages/client/ClientArticleEditor.tsx` (linhas 137-146)

Adicionar os estagios faltantes para mapear todos os 6 estados do backend:

```typescript
const mapStageToArticleEngine = (stage: GenerationStage | string | null): string | null => {
  if (!stage) return null;
  const mapping: Record<string, string> = {
    'analyzing': 'classifying',
    'classifying': 'classifying',
    'researching': 'researching',
    'generating': 'writing',
    'writing': 'writing',
    'seo': 'seo',
    'qa': 'seo',
    'images': 'images',
    'finalizing': 'finalizing',
    'completed': 'finalizing',
  };
  return mapping[stage] || stage;
};
```

### 2. Usar `useGenerationPolling` no fluxo de conversao de oportunidade

**Arquivo**: `src/pages/client/ClientArticleEditor.tsx`

No `handleConvertOpportunity` (linhas 251-316):
- **Remover** o `progressInterval` (timer simulado)
- Apos receber o `article_id` do edge function, ativar o `useGenerationPolling` com esse ID
- Derivar `generationStage` e `generationProgress` do polling real
- Manter o redirect para o editor quando o estagio atingir `completed`

Mudancas:
1. Importar `useGenerationPolling` 
2. Criar estado `pollingArticleId` para ativar o polling
3. Na funcao `handleConvertOpportunity`, ao invocar o edge function, guardar o `article_id` retornado e ativar o polling
4. Usar `useEffect` para sincronizar os dados do polling com `generationStage` e `generationProgress`

### 3. Resultado Visual Esperado

As fases avancam conforme o backend processa:

| Estagio BD | Label no UI | Progresso |
|-----------|-------------|-----------|
| classifying | Classificando intencao... | 10% |
| researching | Pesquisando referencias... | 30% |
| writing | Escrevendo conteudo... | 60% |
| seo | Otimizando SEO... | 75% |
| images | Gerando imagens... | 88% |
| finalizing | Finalizando artigo... | 98% |
| completed | (redirect automatico) | 100% |

## Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/client/ClientArticleEditor.tsx` | Atualizar mapeamento de estagios + substituir timer simulado por `useGenerationPolling` |

Nenhum outro arquivo precisa ser alterado -- o `ArticleGenerationProgress.tsx` ja suporta todos os 6 estagios corretamente.
