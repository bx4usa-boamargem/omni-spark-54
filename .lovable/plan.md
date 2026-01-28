

# Plano: Consertar Super Páginas + Adicionar Editor Inline Premium

## Diagnóstico do Problema

### Problema Identificado

A rota pública `/p/:pageSlug` no domínio `app.omniseen.app` **falha ao carregar** porque:

1. O `useLandingPage` hook chama a Edge Function `content-api` com `host=app.omniseen.app`
2. A resolução de tenant falha porque `app.omniseen.app` não está na tabela `tenant_domains`
3. O resultado é `"Tenant not found"` → `"Falha ao carregar página"`

### Solução

Para a rota `/p/:pageSlug` (sem `blogSlug`), precisamos buscar o `blog_id` diretamente da tabela `landing_pages` pelo `slug` da página, e então passar esse `blog_id` para o `content-api`.

---

## Fase 1: Fazer Funcionar (Prioridade Máxima)

### 1.1 Modificar `useLandingPage` Hook

**Arquivo:** `src/hooks/useContentApi.ts`

**Mudança:** Adicionar uma nova função que busca a landing page pelo slug diretamente, quando não há `blogId` nem `blogSlug`.

```tsx
// Nova função para buscar landing page sem contexto de blog
export async function fetchLandingPageBySlug(
  pageSlug: string
): Promise<{ blog: BlogMeta | null; page: LandingPage | null; error?: string }> {
  try {
    // 1. Buscar landing_page pelo slug para descobrir o blog_id
    const { data: pageData, error: pageError } = await supabase
      .from("landing_pages")
      .select("id, blog_id, slug, title, page_data, seo_title, seo_description, featured_image_url, published_at, updated_at")
      .eq("slug", pageSlug)
      .eq("status", "published")
      .maybeSingle();
    
    if (pageError || !pageData) {
      return { blog: null, page: null, error: "Página não encontrada" };
    }
    
    // 2. Buscar blog metadata pelo blog_id
    const { data: blogData } = await supabase
      .from("blogs")
      .select("id, name, slug, primary_color, secondary_color, ...")
      .eq("id", pageData.blog_id)
      .single();
    
    return {
      blog: blogData,
      page: pageData,
    };
  } catch (err) {
    return { blog: null, page: null, error: "Erro ao buscar página" };
  }
}
```

### 1.2 Modificar `PublicLandingPage.tsx`

**Arquivo:** `src/pages/PublicLandingPage.tsx`

**Mudança:** Usar a nova função quando não há `blogSlug`.

```tsx
export default function PublicLandingPage() {
  const { blogSlug, pageSlug } = useParams();
  
  // Se não há blogSlug, usar busca direta
  const directFetch = !blogSlug;
  
  // Hook existente para casos com blogSlug
  const hookResult = useLandingPage(pageSlug, { 
    blogSlug,
    skip: directFetch  // Pular se não há blogSlug
  });
  
  // Estado para busca direta
  const [directResult, setDirectResult] = useState(null);
  
  useEffect(() => {
    if (directFetch && pageSlug) {
      fetchLandingPageBySlug(pageSlug).then(setDirectResult);
    }
  }, [directFetch, pageSlug]);
  
  const { blog, page, loading, error } = directFetch 
    ? { ...directResult, loading: !directResult } 
    : hookResult;
  
  // ... resto do componente
}
```

### 1.3 Alternativa Mais Simples (Recomendada)

Modificar a Edge Function `content-api` para aceitar um modo de busca direta por `page_slug`:

**Arquivo:** `supabase/functions/content-api/index.ts`

```typescript
// Adicionar nova rota: page.landing.direct
// Que busca pela tabela landing_pages diretamente sem resolver tenant

case "page.landing.direct":
  data = await handleLandingPageDirect(supabase, params);
  break;

async function handleLandingPageDirect(
  supabase: SupabaseClientAny,
  params: Record<string, unknown>
) {
  const slug = String(params.slug || "");
  
  // Buscar página pelo slug globalmente
  const { data: pageData, error } = await supabase
    .from("landing_pages")
    .select(`
      ${LANDING_PAGE_PUBLIC_FIELDS.join(", ")},
      blog:blogs!inner(${BLOG_PUBLIC_FIELDS.join(", ")})
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
    
  if (error || !pageData) {
    return { page: null, error: "Page not found" };
  }
  
  return { 
    page: pageData,
    blog: pageData.blog 
  };
}
```

---

## Fase 2: Editor Inline Premium (Estilo SEOWriting.ai)

### 2.1 Criar Componente `InlineEditableText`

**Arquivo:** `src/components/client/landingpage/editor/InlineEditableText.tsx`

```tsx
interface InlineEditableTextProps {
  value: string;
  onChange: (value: string) => void;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  placeholder?: string;
  canEdit: boolean;
}

export function InlineEditableText({
  value,
  onChange,
  as: Component = 'p',
  className,
  placeholder = 'Clique para editar...',
  canEdit
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  
  if (!canEdit) {
    return <Component className={className}>{value || placeholder}</Component>;
  }
  
  return (
    <Component
      className={cn(
        className,
        "outline-none cursor-text transition-all",
        isEditing && "ring-2 ring-primary/50 rounded px-1",
        !value && "text-muted-foreground italic"
      )}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setIsEditing(true)}
      onBlur={(e) => {
        setIsEditing(false);
        onChange(e.currentTarget.textContent || '');
      }}
      dangerouslySetInnerHTML={{ __html: value || placeholder }}
    />
  );
}
```

### 2.2 Criar Toolbar Flutuante de Edição

**Arquivo:** `src/components/client/landingpage/editor/BlockEditToolbar.tsx`

```tsx
interface BlockEditToolbarProps {
  visible: boolean;
  position: { top: number; left: number };
  onAskAI: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function BlockEditToolbar({
  visible,
  position,
  onAskAI,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown
}: BlockEditToolbarProps) {
  if (!visible) return null;
  
  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border p-2 flex items-center gap-1"
      style={{ top: position.top, left: position.left }}
    >
      <Button variant="ghost" size="sm" onClick={onAskAI}>
        <Sparkles className="h-4 w-4 mr-1" />
        Ask AI
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="icon" onClick={onMoveUp}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onMoveDown}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="ghost" size="icon" onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

### 2.3 Atualizar Blocos para Suporte Inline

**Exemplo: Atualizar `AuthorityHero.tsx`**

```tsx
export function AuthorityHero({ 
  data, 
  primaryColor, 
  isEditing, 
  onEdit 
}: AuthorityHeroProps) {
  return (
    <section className="relative min-h-[600px] ...">
      {/* ... background ... */}
      
      <div className="container relative z-10 ...">
        <div className="max-w-3xl">
          {/* Headline - Editável inline */}
          {isEditing ? (
            <InlineEditableText
              value={data.headline}
              onChange={(val) => onEdit?.('headline', val)}
              as="h1"
              className="text-5xl md:text-7xl font-black text-white leading-tight mb-6"
              placeholder="Título Principal"
              canEdit={isEditing}
            />
          ) : (
            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
              {data.headline}
            </h1>
          )}
          
          {/* Subheadline - Editável inline */}
          {isEditing ? (
            <InlineEditableText
              value={data.subheadline}
              onChange={(val) => onEdit?.('subheadline', val)}
              as="p"
              className="text-xl md:text-2xl text-slate-300 mb-10"
              placeholder="Subtítulo descritivo"
              canEdit={isEditing}
            />
          ) : (
            <p className="text-xl md:text-2xl text-slate-300 mb-10">
              {data.subheadline}
            </p>
          )}
          
          {/* ... resto ... */}
        </div>
      </div>
    </section>
  );
}
```

### 2.4 Adicionar Modo de Edição no Editor

**Arquivo:** `src/components/client/landingpage/LandingPageEditor.tsx`

Modificar para passar `isEditing={true}` quando o usuário está no editor:

```tsx
// No render do layout
{pageData?.template === 'service_authority_v1' && (
  <ServiceAuthorityLayout 
    pageData={pageData} 
    primaryColor={primaryColor}
    visibility={visibility}
    isEditing={true}  // SEMPRE true no editor
    onEditBlock={handleEditBlock}
  />
)}
```

---

## Arquivos a Modificar/Criar

| Arquivo | Ação | Prioridade |
|---------|------|------------|
| `src/hooks/useContentApi.ts` | **MODIFICAR** | 🔴 FASE 1 |
| `src/pages/PublicLandingPage.tsx` | **MODIFICAR** | 🔴 FASE 1 |
| `supabase/functions/content-api/index.ts` | **MODIFICAR** | 🔴 FASE 1 |
| `src/components/client/landingpage/editor/InlineEditableText.tsx` | **CRIAR** | 🟡 FASE 2 |
| `src/components/client/landingpage/editor/BlockEditToolbar.tsx` | **CRIAR** | 🟡 FASE 2 |
| `src/components/client/landingpage/layouts/AuthorityHero.tsx` | **MODIFICAR** | 🟡 FASE 2 |
| Todos os blocos em `/blocks/` | **MODIFICAR** | 🟡 FASE 2 |

---

## Ordem de Implementação

### FASE 1 (Fazer Funcionar) - ~30 min
1. Modificar `content-api` para aceitar rota `page.landing.direct`
2. Criar `useLandingPageDirect` hook
3. Atualizar `PublicLandingPage.tsx` para usar busca direta quando sem `blogSlug`
4. Testar rota `/p/:slug` no domínio principal

### FASE 2 (Editor Inline) - ~1h
1. Criar componente `InlineEditableText`
2. Criar componente `BlockEditToolbar`
3. Atualizar `AuthorityHero` com suporte inline
4. Atualizar demais blocos progressivamente
5. Testar edição no editor

---

## Critérios de Aceite

### FASE 1 (Funcionar)
- [ ] Rota `/p/:slug` carrega sem erro no `app.omniseen.app`
- [ ] Super página publicada exibe corretamente todos os blocos
- [ ] Hero com imagem + título + CTA funciona
- [ ] Services com cards renderizam
- [ ] F5 na página pública não quebra

### FASE 2 (Editor Inline)
- [ ] Clicar em texto no editor ativa modo edição inline
- [ ] Texto digitado é salvo ao clicar fora
- [ ] Toolbar "Ask AI" aparece ao hover no bloco
- [ ] Usuário não autenticado NÃO vê controles de edição
- [ ] Mudanças são persistidas ao clicar "Salvar"

---

## Impacto

- **FASE 1**: Corrige bug crítico que impede visualização pública das Super Páginas
- **FASE 2**: Equipara funcionalidade ao concorrente SEOWriting.ai com edição inline premium

