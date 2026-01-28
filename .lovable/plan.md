

# Plano: Corrigir Editor de Super Páginas - Erro insertBefore + Layout SEO

## Diagnóstico do Problema

### Problema 1: Erro "insertBefore" ao clicar nos botões SEO

**Causa Raiz Identificada:**
Após análise do código, o erro `insertBefore` **NÃO está vindo dos botões SEO diretamente**. O componente `LandingPageSEOPanel.tsx` usa componentes React puros e **não manipula DOM diretamente**.

A causa mais provável é o componente `InlineEditableText.tsx` que usa `contentEditable`:

```tsx
// InlineEditableText.tsx - linha 92
return createElement(
  Component,
  { ...props, contentEditable: true },
  localValue || (isEditing ? '' : placeholder) // ← PROBLEMA: children mudam durante contentEditable
);
```

Quando o React tenta reconciliar o DOM com `contentEditable`, há conflito entre o texto editado pelo usuário e o `children` do React, causando o erro `insertBefore`.

**Por que acontece ao clicar em SEO?**
Quando clicamos em "Reanalisar" ou "Corrigir automaticamente", o `loadPage()` é chamado após sucesso:

```tsx
// LandingPageEditor.tsx - linhas 377-386
const handleReanalyze = async () => {
  const result = await analyzeSEO(page.id);
  if (result?.success) {
    await loadPage(); // ← Isso força re-render de TODOS os blocos
    toast.success("Análise SEO concluída!");
  }
};
```

O `loadPage()` atualiza `pageData`, que faz re-render dos blocos editáveis (`AuthorityHero`, etc). Se algum bloco está com foco em `contentEditable`, o React tenta inserir/remover nodes e falha.

---

### Problema 2 & 3: Layout do SEO Panel escondido atrás do Preview

**Causa Raiz Identificada:**
O layout atual do editor (linhas 554-794 do `LandingPageEditor.tsx`):

```tsx
<div className="flex-1 flex overflow-hidden">
  {/* Left Panel - Settings (incluindo SEO) */}
  <div className="w-80 border-r bg-card overflow-hidden flex flex-col">
    <TabsContent value="seo" className="m-0 h-full overflow-y-auto">
      <LandingPageSEOPanel ... /> {/* ← Painel SEO fica DENTRO da área de 320px */}
    </TabsContent>
  </div>

  {/* Right Panel - Preview */}
  <div className="flex-1 bg-muted/30 overflow-hidden relative">
    <div className="absolute inset-0 overflow-y-auto"> {/* ← ABSOLUTE cobre tudo */}
      ... preview ...
    </div>
  </div>
</div>
```

**Problemas:**
1. O painel esquerdo tem `w-80` (320px) mas o `LandingPageSEOPanel` precisa de mais espaço
2. O preview usa `absolute inset-0` que pode sobrepor elementos em certos tamanhos de tela
3. Não há separação clara de z-index entre painel SEO e preview

---

## Correções Propostas

### Correção 1: Resolver o Erro "insertBefore" no InlineEditableText

**Arquivo:** `src/components/client/landingpage/editor/InlineEditableText.tsx`

**Mudança:** Usar `dangerouslySetInnerHTML` ao invés de `children` para evitar conflito de reconciliação:

```tsx
export function InlineEditableText({
  value,
  onChange,
  as: Component = 'p',
  className,
  placeholder = 'Clique para editar...',
  canEdit,
  multiline = false
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  // Não usar localValue - React não deve controlar o conteúdo de contentEditable
  
  const handleBlur = () => {
    setIsEditing(false);
    const newValue = elementRef.current?.textContent || '';
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  if (!canEdit) {
    return createElement(Component, { className }, value || placeholder);
  }

  // SOLUÇÃO: Usar dangerouslySetInnerHTML para evitar conflito com contentEditable
  return createElement(
    Component,
    {
      ref: elementRef,
      className: cn(className, "outline-none cursor-text transition-all ..."),
      contentEditable: true,
      suppressContentEditableWarning: true,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      dangerouslySetInnerHTML: { __html: value || placeholder }, // ← MUDANÇA CRÍTICA
    }
  );
}
```

### Correção 2: Prevenir Re-render Agressivo Durante Edição

**Arquivo:** `src/components/client/landingpage/LandingPageEditor.tsx`

**Mudança:** Adicionar flag para evitar reload enquanto edição está em progresso:

```tsx
// Novo estado
const [isEditingContent, setIsEditingContent] = useState(false);

// Modificar handleReanalyze
const handleReanalyze = async () => {
  if (!page?.id) return;
  
  setIsAnalyzingSEO(true);
  try {
    const result = await analyzeSEO(page.id);
    if (result?.success) {
      // NÃO recarregar a página inteira - apenas atualizar os campos de SEO
      setPage(prev => prev ? {
        ...prev,
        seo_score: result.score_total,
        seo_metrics: { breakdown: result.breakdown, diagnostics: result.diagnostics },
        seo_recommendations: result.recommendations,
        seo_analyzed_at: new Date().toISOString()
      } : null);
      
      toast.success("Análise SEO concluída!");
    }
  } catch (error) {
    toast.error("Erro ao analisar SEO");
  } finally {
    setIsAnalyzingSEO(false);
  }
};

// Similar para handleAutoFix - só recarregar se necessário
const handleAutoFix = async () => {
  if (!page?.id) return;
  setIsFixingSEO(true);
  try {
    const result = await fixSEO(page.id, ["title", "meta", "content", "keywords"]);
    if (result?.success) {
      // Reload necessário apenas se content foi alterado
      if (result.updates?.content_expanded) {
        await loadPage();
      } else {
        // Atualizar apenas campos SEO
        setPage(prev => prev ? {
          ...prev,
          seo_title: result.updates?.seo_title || prev.seo_title,
          seo_description: result.updates?.seo_description || prev.seo_description,
          seo_keywords: result.updates?.seo_keywords || prev.seo_keywords,
        } : null);
        
        // Re-trigger analysis
        await handleReanalyze();
      }
    }
  } finally {
    setIsFixingSEO(false);
  }
};
```

### Correção 3: Ajustar Layout para SEO Panel Visível

**Arquivo:** `src/components/client/landingpage/LandingPageEditor.tsx`

**Mudança 1:** Aumentar largura do painel esquerdo quando tab SEO está ativo:

```tsx
{/* Left Panel - Settings */}
<div className={cn(
  "border-r bg-card overflow-hidden flex flex-col transition-all duration-300",
  activeTab === 'seo' ? "w-[380px]" : "w-80"  // ← Aumentar para 380px no SEO
)}>
```

**Mudança 2:** Garantir z-index apropriado:

```tsx
{/* Left Panel - Settings */}
<div className={cn(
  "border-r bg-card overflow-hidden flex flex-col transition-all duration-300 z-20",
  activeTab === 'seo' ? "w-[380px]" : "w-80"
)}>

{/* Right Panel - Preview */}
<div className="flex-1 bg-muted/30 overflow-hidden relative z-10">
```

**Mudança 3:** Remover `absolute` do container do preview e usar layout flex apropriado:

```tsx
{/* Right Panel - Preview */}
<div className="flex-1 bg-muted/30 overflow-hidden flex flex-col">
  {pageData ? (
    <div className="flex-1 overflow-y-auto"> {/* ← Usar flex ao invés de absolute */}
      <div className="max-w-[1200px] mx-auto shadow-2xl shadow-black/10 min-h-full">
        {/* layouts */}
      </div>
    </div>
  ) : (
    {/* empty state */}
  )}
</div>
```

### Correção 4: Adicionar ErrorBoundary para Captura Elegante

**Novo arquivo:** `src/components/client/landingpage/EditorErrorBoundary.tsx`

```tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class EditorErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[EditorErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="m-4 p-6 border-2 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 mb-2">
                Erro de Renderização
              </h3>
              <p className="text-amber-700 text-sm mb-4">
                {this.state.error?.message || 'Ocorreu um erro ao renderizar o conteúdo.'}
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => this.setState({ hasError: false })}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Recarregar Página
                </Button>
              </div>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
```

**Uso no Editor:**

```tsx
// LandingPageEditor.tsx - Envolver preview com ErrorBoundary
import { EditorErrorBoundary } from "./EditorErrorBoundary";

// No return, envolver o preview:
<div className="flex-1 bg-muted/30 overflow-hidden flex flex-col">
  <EditorErrorBoundary>
    {pageData ? (
      <div className="flex-1 overflow-y-auto">
        {/* layouts */}
      </div>
    ) : (
      {/* empty state */}
    )}
  </EditorErrorBoundary>
</div>
```

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/client/landingpage/editor/InlineEditableText.tsx` | **MODIFICAR** | Usar dangerouslySetInnerHTML |
| `src/components/client/landingpage/LandingPageEditor.tsx` | **MODIFICAR** | Layout z-index + handlers SEO |
| `src/components/client/landingpage/EditorErrorBoundary.tsx` | **CRIAR** | Captura de erros elegante |

---

## Resumo das Mudanças

### 1. InlineEditableText.tsx (~20 linhas alteradas)
- Remover uso de `children` com `contentEditable`
- Usar `dangerouslySetInnerHTML` para evitar conflito React-DOM
- Manter `suppressContentEditableWarning`

### 2. LandingPageEditor.tsx (~50 linhas alteradas)
- Aumentar largura do painel quando tab SEO ativo (`w-80` → `w-[380px]`)
- Adicionar z-index explícito (`z-20` painel, `z-10` preview)
- Modificar `handleReanalyze` para não recarregar página inteira
- Modificar `handleAutoFix` para atualização parcial
- Remover `absolute inset-0` do preview container
- Envolver preview com `EditorErrorBoundary`

### 3. EditorErrorBoundary.tsx (~60 linhas novas)
- Novo componente para captura de erros de renderização
- UI amigável com opções de retry

---

## Critérios de Aceite

### Layout e Z-index
- [ ] Sidebar SEO visível com 380px de largura
- [ ] Preview não sobrepõe sidebar
- [ ] Card "Pontuação de SEO" totalmente visível
- [ ] Botão "Reanalisar" clicável
- [ ] Seção "Estrutura" totalmente visível
- [ ] Seção "Densidade de palavras-chave" totalmente visível
- [ ] Seção "Recomendações" totalmente visível
- [ ] Botão "Corrigir automaticamente" clicável
- [ ] Botão "Regenerar Página" clicável

### Funcionalidade dos Botões
- [ ] Clicar "Reanalisar" não dá erro insertBefore
- [ ] Score SEO atualiza após reanalisar
- [ ] Clicar "Corrigir automaticamente" não dá erro
- [ ] Correções são aplicadas e página atualiza
- [ ] Clicar "Regenerar Página" não dá erro
- [ ] Página regenera e preview atualiza

### Error Handling
- [ ] ErrorBoundary captura erros sem travar
- [ ] Toast/notificação mostra erros ao usuário
- [ ] Botão "Tentar Novamente" funciona

---

## Ordem de Implementação

1. **PASSO 1:** Criar `EditorErrorBoundary.tsx`
2. **PASSO 2:** Corrigir `InlineEditableText.tsx` (dangerouslySetInnerHTML)
3. **PASSO 3:** Atualizar layout do `LandingPageEditor.tsx` (largura + z-index)
4. **PASSO 4:** Refatorar `handleReanalyze` e `handleAutoFix`
5. **PASSO 5:** Envolver preview com ErrorBoundary
6. **PASSO 6:** Testar cada botão SEO

---

## Impacto

- **Crítico:** Corrige editor que está inutilizável
- **UX:** SEO panel sempre visível e funcional
- **Estabilidade:** ErrorBoundary evita travamentos completos
- **Performance:** Atualizações parciais evitam re-render desnecessário

