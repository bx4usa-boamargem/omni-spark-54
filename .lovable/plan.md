
# Plano: Corrigir Acesso a Super Páginas, Blog e Artigos

## Diagnóstico Confirmado

### Causa Raiz (100% verificada no código)

Os hooks e edge function **já suportam** `blog_id` direto, mas os componentes públicos **não estão passando** o ID que recebem.

### Evidências no Código

| Componente/Hook | Status | Problema |
|-----------------|--------|----------|
| Edge Function `content-api` | ✅ Aceita `blog_id` (linha 87) | Nenhum |
| `fetchContentApiByBlogId` | ✅ Existe e funciona (linha 145) | Nenhum |
| `useBlogArticle` | ✅ Aceita `blogId` (linha 268) | Nenhum |
| `useLandingPage` | ✅ Aceita `blogId` (linha 345) | **Não está sendo usado** |
| `useBlogHome` | ❌ **Não aceita** `blogId` (linha 213) | Precisa atualizar |
| `CustomDomainBlog` | ❌ Recebe `blogId` mas não passa | Precisa passar |
| `CustomDomainLandingPage` | ❌ Recebe `blogId` mas não passa | Precisa passar |

---

## Solução

### 1. Atualizar `useBlogHome` para aceitar `blogId`

**Arquivo:** `src/hooks/useContentApi.ts`

**Mudança:** Converter parâmetros simples em objeto de opções:

```typescript
// ANTES (linha 213)
export function useBlogHome(limit = 12, offset = 0): UseBlogHomeResult {
  // ...
  const result = await fetchContentApi<BlogHomeData>("blog.home", { limit, offset });
}

// DEPOIS
interface UseBlogHomeOptions {
  blogId?: string;
  limit?: number;
  offset?: number;
}

export function useBlogHome(options: UseBlogHomeOptions = {}): UseBlogHomeResult {
  const { blogId, limit = 12, offset = 0 } = options;
  // ...
  let result;
  if (blogId) {
    result = await fetchContentApiByBlogId<BlogHomeData>("blog.home", blogId, { limit, offset });
  } else {
    result = await fetchContentApi<BlogHomeData>("blog.home", { limit, offset });
  }
}
```

### 2. Atualizar `CustomDomainBlog` para passar `blogId`

**Arquivo:** `src/pages/CustomDomainBlog.tsx`

```typescript
// ANTES (linha 18)
const { blog, articles, loading, error } = useBlogHome(50);

// DEPOIS
const { blog, articles, loading, error } = useBlogHome({ 
  blogId: blogId || undefined, 
  limit: 50 
});
```

### 3. Atualizar `CustomDomainLandingPage` para passar `blogId`

**Arquivo:** `src/pages/CustomDomainLandingPage.tsx`

```typescript
// ANTES (linha 27)
const { blog, page, loading, error } = useLandingPage(pageSlug);

// DEPOIS
const { blog, page, loading, error } = useLandingPage(pageSlug, { blogId });
```

---

## Fluxo Corrigido

```text
ANTES (quebrado):
BlogRoutes → blogId ✅
  → CustomDomainBlog(blogId) 
    → useBlogHome(50) ← Não recebe blogId ❌
      → fetchContentApi(hostname) 
        → hostname inválido → "Tenant not found" ❌

DEPOIS (corrigido):
BlogRoutes → blogId ✅
  → CustomDomainBlog(blogId) 
    → useBlogHome({ blogId, limit: 50 }) ✅
      → fetchContentApiByBlogId(blogId) 
        → Bypass hostname → Retorna dados ✅
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/hooks/useContentApi.ts` | Atualizar `useBlogHome` para aceitar `blogId` em objeto de opções |
| `src/pages/CustomDomainBlog.tsx` | Passar `{ blogId, limit: 50 }` para `useBlogHome` |
| `src/pages/CustomDomainLandingPage.tsx` | Passar `{ blogId }` para `useLandingPage` |

---

## Garantia de Funcionamento

| Cenário | Antes | Depois |
|---------|-------|--------|
| Preview Lovable (`*.lovableproject.com`) | ❌ Tenant not found | ✅ Funciona via blogId |
| Subdomínio cliente (`*.app.omniseen.app`) | ✅ Funciona | ✅ Continua funcionando |
| Domínio customizado | ✅ Funciona | ✅ Continua funcionando |

---

## Por que tenho 100% de certeza?

1. **Edge Function já suporta**: Linhas 87-96 do `content-api/index.ts` mostram que `blog_id` direto funciona
2. **Função auxiliar existe**: `fetchContentApiByBlogId` (linha 145) está pronta
3. **Padrão já funciona**: `useBlogArticle` usa esse padrão e funciona quando blogId é passado
4. **Mudança mínima**: Apenas 3 arquivos, ~15 linhas de código
5. **Zero breaking changes**: Fallback para hostname continua funcionando
