

# Melhorar Interface de Geração: Progress Bar + Etapas Visíveis

## Contexto Atual

### O que existe:
| Componente | Localização | Status |
|------------|-------------|--------|
| `GenerationStepList` | `src/components/client/GenerationStepList.tsx` | ✅ Já existe (excelente!) |
| `LiveArticlePreview` | `src/components/client/LiveArticlePreview.tsx` | ✅ Já existe |
| `ArticleGenerationScreen` | `src/components/client/ArticleGenerationScreen.tsx` | ✅ Usa o padrão completo |
| `ArticleGenerator` | `src/pages/client/ArticleGenerator.tsx` | ⚠️ Apenas loader simples |
| `Progress` (shadcn) | `src/components/ui/progress.tsx` | ✅ Disponível |

### O Problema

A página `ArticleGenerator.tsx` (Sprint 4) tem UX inferior:
- Botão mostra apenas: `<Loader2 /> "Validando brief..."`
- Sem progress bar visual
- Sem lista de etapas
- Sem feedback de tempo estimado
- Sem timeout warning

Enquanto `ArticleGenerationScreen.tsx` já implementa:
- Progress bar animada com porcentagem
- Lista de 7 etapas com ícones
- Estados: pending/active/completed
- Preview de conteúdo em tempo real

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO PROPOSTO                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ArticleGenerator.tsx (formulário)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  [Formulário de configuração]                                       │   │
│  │                                                                      │   │
│  │  QUANDO isGenerating = true:                                        │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                                                               │   │   │
│  │  │  ┌─────────────────────┐  ┌─────────────────────────────────┐│   │   │
│  │  │  │ ArticleGeneration-  │  │  LiveArticlePreview             ││   │   │
│  │  │  │ Progress (NOVO)     │  │  (streaming content)            ││   │   │
│  │  │  │                     │  │                                  ││   │   │
│  │  │  │ • Lista de etapas   │  │  • Título aparecendo            ││   │   │
│  │  │  │ • Progress bar      │  │  • Conteúdo crescendo           ││   │   │
│  │  │  │ • Tempo estimado    │  │  • Cursor piscando              ││   │   │
│  │  │  │ • Timeout warning   │  │                                  ││   │   │
│  │  │  └─────────────────────┘  └─────────────────────────────────┘│   │   │
│  │  │                                                               │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

### 1. Criar Componente: `ArticleGenerationProgress.tsx`

**Caminho:** `src/components/client/ArticleGenerationProgress.tsx`

Componente dedicado para o `ArticleGenerator` que mostra:
- Header com título e tempo estimado
- Lista de 8 etapas do Article Engine
- Progress bar com porcentagem
- Timeout warning após 2 minutos

**Etapas específicas do Article Engine:**

```typescript
const GENERATION_STAGES = [
  { key: 'validating', label: 'Validando brief...', icon: CheckCircle, progress: 5 },
  { key: 'classifying', label: 'Classificando intenção...', icon: Brain, progress: 15 },
  { key: 'selecting', label: 'Selecionando template...', icon: LayoutTemplate, progress: 25 },
  { key: 'researching', label: 'Pesquisando na web...', icon: Search, progress: 45 },
  { key: 'outlining', label: 'Gerando estrutura...', icon: ListTree, progress: 55 },
  { key: 'writing', label: 'Escrevendo conteúdo...', icon: FileText, progress: 75 },
  { key: 'optimizing', label: 'Otimizando SEO...', icon: Target, progress: 90 },
  { key: 'done', label: 'Concluído!', icon: CheckCircle2, progress: 100 }
];
```

---

### 2. Refatorar `ArticleGenerator.tsx`

#### 2.1 Adicionar Estados

```typescript
const [generationProgress, setGenerationProgress] = useState(0);
const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
const timeoutWarningRef = useRef<NodeJS.Timeout | null>(null);
```

#### 2.2 Implementar Progresso Simulado

Como a edge function não retorna progresso em tempo real via streaming, simular no cliente:

```typescript
const startProgressSimulation = () => {
  const progressSequence = [
    { stage: 'validating', delay: 500, progress: 5 },
    { stage: 'classifying', delay: 1000, progress: 15 },
    { stage: 'selecting', delay: 1500, progress: 25 },
    { stage: 'researching', delay: 15000, progress: 45 }, // Perplexity demora mais
    { stage: 'outlining', delay: 3000, progress: 55 },
    { stage: 'writing', delay: 25000, progress: 75 }, // Escrita demora mais
    { stage: 'optimizing', delay: 5000, progress: 90 }
  ];
  
  let accumulatedDelay = 0;
  progressSequence.forEach(({ stage, delay, progress }) => {
    accumulatedDelay += delay;
    setTimeout(() => {
      if (isGenerating) {
        setGenerationStage(stage);
        setGenerationProgress(progress);
      }
    }, accumulatedDelay);
  });
};
```

#### 2.3 Timeout Warning

```typescript
useEffect(() => {
  if (isGenerating) {
    // Timeout warning após 2 minutos
    timeoutWarningRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      toast.warning(
        'A geração está demorando mais que o esperado. Aguarde mais um momento...',
        { duration: 8000 }
      );
    }, 120000);
    
    return () => {
      if (timeoutWarningRef.current) {
        clearTimeout(timeoutWarningRef.current);
      }
    };
  }
}, [isGenerating]);
```

#### 2.4 Substituir UI de Loading

**Antes (linha 402-432):**
```tsx
{isGenerating ? (
  <>
    <Loader2 className="h-5 w-5 animate-spin" />
    {getStageLabel()}
  </>
) : (
  // ...
)}
```

**Depois:**
```tsx
{isGenerating && (
  <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
    <div className="w-full max-w-lg">
      <ArticleGenerationProgress
        currentStage={generationStage}
        progress={generationProgress}
        showTimeoutWarning={showTimeoutWarning}
        keyword={formData.keyword}
      />
    </div>
  </div>
)}
```

---

### 3. Interface do Componente

```typescript
interface ArticleGenerationProgressProps {
  currentStage: string | null;
  progress: number;
  showTimeoutWarning?: boolean;
  keyword: string;
}
```

---

### 4. Visual do Componente

```text
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  🧠 Gerando Artigo de Autoridade Local                     │
│  "desentupidora em São Paulo"                              │
│  ⏱️ Tempo estimado: 1-2 minutos                           │
│                                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45%                │
│                                                            │
│  ✓ Validando brief...                         ✓ Concluído │
│  ✓ Classificando intenção...                  ✓ Concluído │
│  ✓ Selecionando template...                   ✓ Concluído │
│  ● Pesquisando na web...                    Em andamento...│
│  ○ Gerando estrutura...                                    │
│  ○ Escrevendo conteúdo...                                  │
│  ○ Otimizando SEO...                                       │
│                                                            │
│  ⚠️ Geração está demorando mais que o esperado...          │
│                                                            │
│  [Cancelar]                                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/client/ArticleGenerationProgress.tsx` | Componente de progresso com etapas |

## Arquivos a Modificar

| Arquivo | Modificações |
|---------|--------------|
| `src/pages/client/ArticleGenerator.tsx` | Adicionar overlay de progresso, simulação de etapas, timeout warning |

---

## Resumo Técnico

| Item | Detalhes |
|------|----------|
| Componentes novos | 1 (`ArticleGenerationProgress`) |
| Arquivos modificados | 1 (`ArticleGenerator.tsx`) |
| Progresso simulado | Cliente simula etapas baseado em tempos médios |
| Timeout warning | Após 120s mostra aviso |
| Ícones usados | Brain, LayoutTemplate, Search, FileText, Target, CheckCircle |
| Progress bar | Gradient animado com shimmer effect |
| Cancellation | Botão para cancelar e voltar ao formulário |

---

## Checklist de Implementação

- [ ] Criar `ArticleGenerationProgress.tsx` com etapas do Article Engine
- [ ] Adicionar estados de progresso no `ArticleGenerator.tsx`
- [ ] Implementar simulação de progresso sequencial
- [ ] Adicionar timeout warning após 2 minutos
- [ ] Adicionar overlay fullscreen durante geração
- [ ] Adicionar botão de cancelar
- [ ] Limpar timers ao desmontar/cancelar
- [ ] Testar fluxo completo de geração

