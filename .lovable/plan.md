
# Plano: Corrigir Acesso ao Blog Público em Ambiente Dev/Preview

## Problema Diagnosticado

As páginas `PublicArticle.tsx` e `PublicLandingPage.tsx` foram refatoradas para usar hooks `useBlogArticle` e `useLandingPage`. Esses hooks dependem de `getCurrentHostname()` para resolver o blog via edge function `content-api`.

**No ambiente Lovable preview** (`d1ade89c-....lovableproject.com`):
- O hostname não está registrado em `tenant_domains`
- A edge function não encontra o blog
- Retorna "Tenant not found" → "Falha ao carregar artigo/página"

**O que está disponível mas não utilizado:**
- As rotas `/blog/:blogSlug/:articleSlug` e `/blog/:blogSlug/p/:pageSlug` fornecem o `blogSlug` via `useParams()`
- A edge function já suporta `blog_id` direto, mas não `blog_slug`

---

## Solução Proposta

### Fase 1: Estender Edge Function `content-api`

Adicionar suporte para resolver tenant via `blog_slug` (além de `host` e `blog_id`):

**Arquivo:** `supabase/functions/content-api/index.ts`

```typescript
interface ContentRequest {
  host?: string;           // Hostname for resolution
  blog_id?: string;        // Direct blog_id (bypasses hostname resolution)
  blog_slug?: string;      // NEW: Blog slug for resolution
  route: ContentRoute;
  params?: Record<string, unknown>;
}
```

**Nova lógica de resolução:**
```text
1. Se blog_id fornecido → usar diretamente
2. Se blog_slug fornecido → buscar blog por slug
3. Se host fornecido → resolver via tenant_domains
```

---

### Fase 2: Estender Hooks `useContentApi`

**2.1 - Adicionar `fetchContentApiByBlogSlug`:**

```typescript
export async function fetchContentApiByBlogSlug<T>(
  route: ContentRoute,
  blogSlug: string,
  params: Record<string, unknown> = {}
): Promise<ContentApiResponse<T> | null> {
  const { data, error } = await supabase.functions.invoke("content-api", {
    body: { blog_slug: blogSlug, route, params },
  });
  // ...
}
```

**2.2 - Estender `useBlogArticle`:**

```typescript
interface UseBlogArticleOptions {
  blogId?: string;    // Bypass com ID
  blogSlug?: string;  // NEW: Bypass com slug
}
```

**2.3 - Estender `useLandingPage`:**

```typescript
interface UseLandingPageOptions {
  blogId?: string;
  blogSlug?: string;
}

export function useLandingPage(
  slug: string | undefined, 
  options?: UseLandingPageOptions
): UseLandingPageResult
```

---

### Fase 3: Atualizar Páginas Públicas

**3.1 - `PublicArticle.tsx`:**

```typescript
const { blogSlug, articleSlug } = useParams<{ blogSlug: string; articleSlug: string }>();

// Usar blogSlug para bypass de hostname
const { blog, article, related, loading, error } = useBlogArticle(articleSlug, { 
  blogSlug: blogSlug 
});
```

**3.2 - `PublicLandingPage.tsx`:**

```typescript
const { blogSlug, pageSlug } = useParams<{ blogSlug?: string; pageSlug: string }>();

// Usar blogSlug quando disponível
const { blog, page, loading, error } = useLandingPage(pageSlug, {
  blogSlug: blogSlug
});
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `supabase/functions/content-api/index.ts` | Adicionar suporte a `blog_slug` |
| `src/hooks/useContentApi.ts` | Adicionar `fetchContentApiByBlogSlug` e estender hooks |
| `src/pages/PublicArticle.tsx` | Passar `blogSlug` para o hook |
| `src/pages/PublicLandingPage.tsx` | Passar `blogSlug` para o hook |

---

## Detalhes Técnicos

### Fluxo de Resolução Atualizado

```text
┌──────────────────────────────────────────────────────┐
│                   content-api                        │
├──────────────────────────────────────────────────────┤
│  Request: { blog_slug, route, params }               │
│                                                      │
│  1. blog_id fornecido? → usar diretamente            │
│  2. blog_slug fornecido? → SELECT FROM blogs         │
│     WHERE slug = blog_slug                           │
│  3. host fornecido? → resolveTenant(host)            │
│  4. Nenhum? → erro 400                               │
└──────────────────────────────────────────────────────┘
```

### Prioridade de Resolução

1. `blog_id` (mais rápido, sem query adicional)
2. `blog_slug` (query simples por slug)
3. `host` (resolve via `tenant_domains` + fallbacks)

---

## Critérios de Aceite

| Critério | Validação |
|----------|-----------|
| `/blog/bioneteste/artigo-x` funciona no preview | Testar no Lovable |
| `/blog/bioneteste/p/pagina-y` funciona no preview | Testar no Lovable |
| Produção (subdomínios) continua funcionando | Testar em `*.app.omniseen.app` |
| Console não mostra "Tenant not found" | DevTools |
| Network mostra `content-api` com `blog_slug` | DevTools |

---

## Impacto

- **Zero breaking changes** - hostname resolution continua funcionando
- **Resolve** erro "Falha ao carregar" em ambiente dev/preview
- **Mantém** todas as funcionalidades existentes
- **Compatível** com rotas legacy `/blog/:blogSlug/*`
