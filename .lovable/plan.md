
# Plano: Correção de Todos os Erros de Build TypeScript

## Resumo dos Erros

São **11 erros em Edge Functions** e **10 erros em arquivos frontend**. A maioria envolve:
- Imports faltando
- Propriedades não declaradas em types/interfaces
- Variáveis não definidas

---

## Correções por Arquivo

### 1. `supabase/functions/generate-article-structured/index.ts`

| Linha | Erro | Correção |
|-------|------|----------|
| 581 | `Cannot find name 'user_id'` | Usar `req_user_id` ou `user?.id` que já existe no contexto |
| 1238-1243 | Propriedades `geo_mode`, `internal_links`, `external_sources`, `whatsapp`, `google_place` não existem no tipo | Adicionar estas propriedades à interface `ArticleRequest` (linhas 80-100) |
| 1503, 1571, 1617 | `Cannot find name 'LOVABLE_API_KEY'` | Adicionar `const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')` no início da função |
| 1671 | `Property 'slug' does not exist` | O `article` object não tem `slug`. Gerar slug a partir do título usando função auxiliar |

### 2. `supabase/functions/generate-landing-page/index.ts`

| Linha | Erro | Correção |
|-------|------|----------|
| 66 | `'error' is of type 'unknown'` | Fazer type check: `error instanceof Error ? error.message : 'Unknown error'` |

### 3. `src/App.tsx`

| Linha | Erro | Correção |
|-------|------|----------|
| 156 | `Cannot find name 'Button'` | Adicionar `import { Button } from "@/components/ui/button";` nos imports |

### 4. `src/components/client/landingpage/LandingPageEditor.tsx`

| Linha | Erro | Correção |
|-------|------|----------|
| 167 | `Property 'phone' is missing in type` | Adicionar `phone: businessProfile?.phone || ""` ao request |
| 489 | `Property 'template' does not exist on type 'LandingPageData'` | Adicionar `template?: string` à interface `LandingPageData` |

### 5. `src/components/client/landingpage/LandingPagePreview.tsx`

| Linha | Erro | Correção |
|-------|------|----------|
| 158, 162 | `Property 'authority_content' does not exist` | Adicionar `authority_content?: string` à interface `LandingPageData` |

### 6. `src/components/client/landingpage/blocks/HeroBlock.tsx`

| Linha | Erro | Correção |
|-------|------|----------|
| 34, 38 | `Property 'phone' does not exist on type 'HeroSection'` | Adicionar `phone?: string` à interface `HeroSection` |

### 7. `src/components/client/landingpage/layouts/ServiceAuthorityLayout.tsx`

| Linha | Erro | Correção |
|-------|------|----------|
| 76 | `Cannot find name 'ArticleContent'` | Adicionar `import { ArticleContent } from "@/components/public/ArticleContent";` |

### 8. `src/components/client/landingpage/layouts/ServiceCardGrid.tsx`

| Linha | Erro | Correção |
|-------|------|----------|
| 49, 54 | `Cannot find name 'Button'` | Adicionar `import { Button } from "@/components/ui/button";` |

---

## Mudanças Detalhadas

### Arquivo: `src/components/client/landingpage/types/landingPageTypes.ts`

Adicionar à interface `HeroSection`:
```typescript
phone?: string;
```

Adicionar à interface `LandingPageData`:
```typescript
template?: string;
authority_content?: string;
```

### Arquivo: `src/App.tsx`

Adicionar import:
```typescript
import { Button } from "@/components/ui/button";
```

### Arquivo: `src/components/client/landingpage/layouts/ServiceAuthorityLayout.tsx`

Adicionar import:
```typescript
import { ArticleContent } from "@/components/public/ArticleContent";
```

### Arquivo: `src/components/client/landingpage/layouts/ServiceCardGrid.tsx`

Adicionar import:
```typescript
import { Button } from "@/components/ui/button";
```

### Arquivo: `src/components/client/landingpage/LandingPageEditor.tsx`

Modificar a chamada `generatePage` (linha 167):
```typescript
const result = await generatePage({
  blog_id: blog.id,
  company_name: businessProfile?.company_name,
  niche: businessProfile?.niche,
  city: businessProfile?.city,
  services: businessProfile?.services?.split(','),
  phone: businessProfile?.phone || "" // ADICIONADO
});
```

### Arquivo: `supabase/functions/generate-landing-page/index.ts`

Modificar linha 66:
```typescript
return new Response(JSON.stringify({ 
  success: false, 
  error: error instanceof Error ? error.message : 'Unknown error' 
}), {
  status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

### Arquivo: `supabase/functions/generate-article-structured/index.ts`

**1. Expandir interface `ArticleRequest` (linhas 80-100):**
```typescript
interface ArticleRequest {
  theme: string;
  keywords?: string[];
  tone?: string;
  category?: string;
  editorial_template?: EditorialTemplate;
  image_count?: number;
  word_count?: number;
  user_id?: string;
  blog_id?: string;
  section_count?: number;
  include_faq?: boolean;
  include_conclusion?: boolean;
  include_visual_blocks?: boolean;
  optimize_for_ai?: boolean;
  source?: 'chat' | 'instagram' | 'youtube' | 'pdf' | 'url' | 'form' | 'opportunity';
  editorial_model?: 'traditional' | 'strategic' | 'visual_guided';
  generation_mode?: GenerationMode;
  auto_publish?: boolean;
  territoryId?: string;
  // GEO MODE FIELDS (V2.0)
  geo_mode?: boolean;
  internal_links?: Array<{url: string; anchor: string}>;
  external_sources?: Array<{url: string; title: string}>;
  whatsapp?: string;
  google_place?: any;
}
```

**2. Adicionar LOVABLE_API_KEY no início do handler (após as verificações iniciais):**
```typescript
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
if (!LOVABLE_API_KEY) {
  return new Response(
    JSON.stringify({ error: 'Missing LOVABLE_API_KEY configuration' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**3. Corrigir linha 581 - user_id:**
```typescript
user_id: user?.id || null, // CRITICAL FIX: Use user object from JWT
```

**4. Corrigir linha 1671 - gerar slug:**
```typescript
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
};

const insertData = {
  blog_id: blog_id,
  user_id: user?.id,
  title: article.title,
  slug: generateSlug(article.title), // CORRIGIDO
  content: article.content,
  status: 'draft',
  // ... other fields
};
```

---

## Ordem de Execução

1. Corrigir **types** primeiro (`landingPageTypes.ts`)
2. Corrigir **imports faltando** (`App.tsx`, `ServiceAuthorityLayout.tsx`, `ServiceCardGrid.tsx`)
3. Corrigir **chamada de função** (`LandingPageEditor.tsx`)
4. Corrigir **edge functions** (`generate-landing-page`, `generate-article-structured`)

---

## Resultado Esperado

Após estas correções:
- ✅ Build TypeScript passa sem erros
- ✅ Projeto pode ser conectado ao GitHub
- ✅ Código fonte limpo e funcional
