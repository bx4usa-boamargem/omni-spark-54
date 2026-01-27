
# Plano: Correção Crítica - Mini-Site Público Exigindo Login

## Diagnóstico Confirmado

### Evidências Coletadas

1. **Edge Function Funcionando**: A `content-api` resolve corretamente `anabione.app.omniseen.app` e retorna dados do blog (testado via curl)

2. **Problema de RLS na Tabela `blogs`**: 
   - Políticas atuais: `SELECT` apenas para `auth.uid() = user_id`
   - **Não existe política pública de leitura**
   - Usuários anônimos não conseguem ler a tabela `blogs`

3. **Tabela `tenant_domains` Incompleta**:
   - Blog `anabione` não tem registro em `tenant_domains`
   - O RPC `resolve_domain` depende dessa tabela
   - Fallback no frontend faz query direta à tabela `blogs` (falha por RLS)

4. **Fluxo Atual com Falha**:
```text
Visitante acessa anabione.app.omniseen.app
        ↓
isSubaccountHost() → true (OK)
        ↓
SubaccountRouteDecider → BlogRoutes (OK)
        ↓
useDomainResolution → RPC resolve_domain → VAZIO (tenant_domains não tem registro)
        ↓
Fallback: query blogs.platform_subdomain → BLOQUEADO POR RLS
        ↓
blogId = null, error = "Domain not found"
        ↓
BlogRoutes mostra "Blog não encontrado" ou erro dispara redirect
```

---

## Solução: Eliminar Dependência de Queries Diretas

### Estratégia

O portal público (`BlogRoutes`) deve usar **exclusivamente** a edge function `content-api`, que utiliza `service_role` e bypassa RLS. Isso é consistente com a arquitetura já planejada (memória: `content-api-gateway-v1-0-pt`).

### Mudanças Necessárias

#### 1. Criar Hook `usePublicDomainResolution`

Novo hook que resolve domínio via `content-api` ao invés de queries diretas:

**Arquivo**: `src/hooks/usePublicDomainResolution.ts` (NOVO)

```typescript
// Hook para resolução de domínio via content-api (para portal público)
// Não depende de RLS ou queries diretas ao Supabase

export function usePublicDomainResolution() {
  const [blogId, setBlogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolve = async () => {
      const hostname = getCurrentHostname();
      
      // Chamar content-api com route mínimo para obter blog_id
      const result = await fetchContentApi<{ total: number }>("blog.home", { limit: 1 });
      
      if (result?.tenant?.blog_id) {
        setBlogId(result.tenant.blog_id);
        setError(null);
      } else {
        setError("Domain not found");
      }
      setIsLoading(false);
    };
    
    resolve();
  }, []);

  return { blogId, isLoading, error };
}
```

#### 2. Atualizar `BlogRoutes` para Usar Novo Hook

**Arquivo**: `src/routes/BlogRoutes.tsx`

```diff
- import { useDomainResolution } from '@/hooks/useDomainResolution';
+ import { usePublicDomainResolution } from '@/hooks/usePublicDomainResolution';

export function BlogRoutes() {
-  const { blogId, isLoading, error } = useDomainResolution();
+  const { blogId, isLoading, error } = usePublicDomainResolution();
```

#### 3. Garantir que `content-api` Aceite Fallback por `platform_subdomain`

**Arquivo**: `supabase/functions/content-api/index.ts`

A função `resolveTenant` já tem fallback por `platform_subdomain`, então não precisa de mudanças.

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/usePublicDomainResolution.ts` | **CRIAR** | Hook de resolução via content-api |
| `src/routes/BlogRoutes.tsx` | Modificar | Usar novo hook |
| `src/hooks/useContentApi.ts` | Modificar | Exportar `fetchContentApi` se não estiver |

---

## Fluxo Corrigido

```text
┌────────────────────────────────────────────────────────────────────┐
│                     FLUXO CORRIGIDO                               │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Visitante acessa anabione.app.omniseen.app                        │
│         ↓                                                          │
│  isSubaccountHost() → true                                         │
│         ↓                                                          │
│  SubaccountRouteDecider → BlogRoutes                               │
│         ↓                                                          │
│  usePublicDomainResolution()                                       │
│         ↓                                                          │
│  Chama content-api edge function                                   │
│  (usa service_role, bypassa RLS)                                   │
│         ↓                                                          │
│  content-api resolve via platform_subdomain                        │
│         ↓                                                          │
│  blogId = "90bd692a-..." ✓                                         │
│         ↓                                                          │
│  Renderiza CustomDomainBlog com blogId                             │
│         ↓                                                          │
│  Blog público exibido sem login ✓                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Hook `usePublicDomainResolution`

```typescript
import { useState, useEffect } from 'react';
import { fetchContentApi } from '@/hooks/useContentApi';
import { getCurrentHostname } from '@/utils/blogUrl';

interface PublicDomainResolution {
  blogId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para resolução de domínio público via content-api
 * 
 * IMPORTANTE: Este hook usa a edge function content-api que:
 * - Utiliza service_role (bypassa RLS)
 * - Resolve via tenant_domains OU blogs.platform_subdomain
 * - NÃO depende de autenticação do usuário
 * 
 * Usar este hook para o portal PÚBLICO (BlogRoutes)
 * O hook useDomainResolution antigo pode continuar para uso interno/admin
 */
export function usePublicDomainResolution(): PublicDomainResolution {
  const [blogId, setBlogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      const hostname = getCurrentHostname();
      
      if (!hostname) {
        if (mounted) {
          setError('No hostname');
          setIsLoading(false);
        }
        return;
      }

      console.log('[usePublicDomainResolution] Resolving via content-api:', hostname);

      try {
        // Faz uma chamada mínima à content-api para obter tenant info
        const result = await fetchContentApi<{ total: number }>("blog.home", { limit: 1 }, hostname);
        
        if (!mounted) return;

        if (result?.tenant?.blog_id) {
          console.log('[usePublicDomainResolution] Resolved:', result.tenant.blog_id);
          setBlogId(result.tenant.blog_id);
          setError(null);
        } else {
          console.log('[usePublicDomainResolution] No blog found for hostname:', hostname);
          setError('Domain not found');
        }
      } catch (err) {
        console.error('[usePublicDomainResolution] Error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Resolution failed');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    resolve();

    return () => {
      mounted = false;
    };
  }, []);

  return { blogId, isLoading, error };
}
```

---

## Resultado Esperado

Após a implementação:

1. **Mini-site 100% público**: Qualquer visitante pode acessar `https://anabione.app.omniseen.app` sem login
2. **Artigos públicos**: `/artigo-slug` funciona sem autenticação
3. **Super Páginas públicas**: `/p/pagina-slug` funciona sem autenticação
4. **Sem dependência de RLS**: Portal público usa apenas `content-api` (service_role)
5. **Isolamento mantido**: Área admin (`/login`, `/client/*`) continua exigindo autenticação
6. **Botão "Abrir Site" funciona**: Abre o site público sem redirecionamento

---

## Validação

Após implementação, verificar:

| URL | Esperado |
|-----|----------|
| `https://anabione.app.omniseen.app` | Blog público visível |
| `https://anabione.app.omniseen.app/artigo-x` | Artigo público visível |
| `https://anabione.app.omniseen.app/p/pagina-y` | Super Página pública visível |
| `https://anabione.app.omniseen.app/login` | Tela de login (plataforma) |
| `https://anabione.app.omniseen.app/client/dashboard` | Redirect para login se não autenticado |
