
# Adicionar Interface de Progresso ao ClientArticleEditor

## Problema Identificado

O fluxo de conversão de oportunidades usa a rota `/client/create` que renderiza `ClientArticleEditor.tsx`. Este componente usa uma interface de progresso simples (`GenerationProgress` do `src/components/seo/GenerationProgress.tsx`) com apenas 4 etapas genéricas.

O novo componente `ArticleGenerationProgress.tsx` com 7 etapas detalhadas, shimmer effect e timeout warning foi implementado apenas no `ArticleGenerator.tsx` (rota `/client/articles/generate`).

## Solução

Integrar o novo componente `ArticleGenerationProgress` também no `ClientArticleEditor.tsx` para que TODOS os fluxos de geração tenham a mesma UX premium.

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/client/ClientArticleEditor.tsx` | Substituir `GenerationProgress` pelo `ArticleGenerationProgress` |

---

## Implementação Detalhada

### 1. Adicionar Import do Novo Componente

No `ClientArticleEditor.tsx`, adicionar:
```typescript
import { ArticleGenerationProgress } from '@/components/client/ArticleGenerationProgress';
```

### 2. Adicionar Estados Necessários

O componente já possui `generationProgress` e `generationStage`. Adicionar apenas:
```typescript
const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
const timeoutWarningRef = useRef<NodeJS.Timeout | null>(null);
```

### 3. Adicionar Efeito de Timeout Warning

```typescript
useEffect(() => {
  if (isGenerating) {
    timeoutWarningRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      toast.warning(
        'A geração está demorando mais que o esperado. Aguarde mais um momento...',
        { duration: 8000 }
      );
    }, 120000); // 2 minutos
    
    return () => {
      if (timeoutWarningRef.current) {
        clearTimeout(timeoutWarningRef.current);
        setShowTimeoutWarning(false);
      }
    };
  } else {
    setShowTimeoutWarning(false);
  }
}, [isGenerating]);
```

### 4. Criar Função de Cancelamento

```typescript
const handleCancelGeneration = () => {
  generationLockRef.current = false;
  setIsGenerating(false);
  setPhase('form');
  setGenerationStage(null);
  setGenerationProgress(0);
  setShowTimeoutWarning(false);
  if (timeoutWarningRef.current) {
    clearTimeout(timeoutWarningRef.current);
  }
  toast.info('Geração cancelada');
};
```

### 5. Mapear Stages para o Novo Formato

O `ClientArticleEditor` usa stages diferentes (`'analyzing' | 'structuring' | 'generating' | 'finalizing'`). Mapear para os stages do Article Engine:

```typescript
const mapStageToArticleEngine = (stage: GenerationStage): string | null => {
  const mapping: Record<string, string> = {
    'analyzing': 'validating',
    'structuring': 'researching',
    'generating': 'writing',
    'finalizing': 'optimizing'
  };
  return stage ? mapping[stage] || stage : null;
};
```

### 6. Substituir UI de Geração

Linha ~1237-1251: Substituir o card simples pelo novo overlay:

**ANTES:**
```tsx
{phase === 'generating' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Gerando Artigo...
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <GenerationProgress stage={generationStage} progress={generationProgress} isActive={isGenerating} />
      </CardContent>
    </Card>
    <ArticlePreview article={null} streamingText={streamingText} isStreaming={isGenerating} />
  </div>
)}
```

**DEPOIS:**
```tsx
{phase === 'generating' && (
  <>
    {/* Overlay com progresso detalhado */}
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <ArticleGenerationProgress
          currentStage={mapStageToArticleEngine(generationStage)}
          progress={generationProgress}
          showTimeoutWarning={showTimeoutWarning}
          keyword={title || themeParam || 'Artigo'}
          onCancel={handleCancelGeneration}
        />
      </div>
    </div>
    
    {/* Preview em background (opcional - pode ser removido) */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full opacity-30 pointer-events-none">
      <Card className="h-full" />
      <ArticlePreview article={null} streamingText={streamingText} isStreaming={isGenerating} />
    </div>
  </>
)}
```

---

## Fluxo Após Implementação

```text
┌─────────────────────────────────────────────────────────────────┐
│              QUALQUER FLUXO DE GERAÇÃO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Rotas que ativam a UI de progresso:                            │
│                                                                  │
│  /client/create?quick=true&fromOpportunity=...                  │
│  /client/create?quick=true&theme=...                            │
│  /client/articles/:id/edit (status='generating')                │
│  /client/articles/generate                                       │
│                                                                  │
│  TODAS usam:                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ArticleGenerationProgress                                │   │
│  │                                                           │   │
│  │  • 7 etapas do Article Engine                            │   │
│  │  • Progress bar com shimmer                              │   │
│  │  • Ícones de status (✓, loading, pending)                │   │
│  │  • Timeout warning após 2 min                            │   │
│  │  • Botão cancelar                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resumo Técnico

| Item | Detalhes |
|------|----------|
| Arquivos modificados | 1 (`ClientArticleEditor.tsx`) |
| Imports adicionados | 1 (`ArticleGenerationProgress`) |
| Estados adicionados | 2 (`showTimeoutWarning`, `timeoutWarningRef`) |
| Funções adicionadas | 2 (`handleCancelGeneration`, `mapStageToArticleEngine`) |
| Effects adicionados | 1 (timeout warning) |
| UI substituída | Seção `phase === 'generating'` |

---

## Checklist de Implementação

- [ ] Adicionar import do `ArticleGenerationProgress`
- [ ] Adicionar estados `showTimeoutWarning` e `timeoutWarningRef`
- [ ] Adicionar função `mapStageToArticleEngine`
- [ ] Adicionar função `handleCancelGeneration`
- [ ] Adicionar `useEffect` para timeout warning
- [ ] Substituir UI do `phase === 'generating'`
- [ ] Testar fluxo de conversão de oportunidade
- [ ] Verificar timeout warning após 2 minutos
