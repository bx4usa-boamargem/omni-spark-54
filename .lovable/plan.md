

# Correcao: Artigos Publicados sem Imagens, sem CTA e com Formatacao Quebrada

## Problemas Identificados

### Problema 1: Imagens internas nao aparecem no artigo publicado
A API publica (`content-api`) nao retorna o campo `content_images` da tabela `articles`. O campo esta ausente da lista `ARTICLE_PUBLIC_FIELDS`. Alem disso, na pagina `PublicArticle.tsx`, o array `contentImages` esta fixo como vazio (`[]`) — nunca e preenchido com os dados do artigo.

### Problema 2: CTA (Chamada para Acao) ausente no rodape do artigo
O campo `cta` (JSONB com dados da subconta: empresa, WhatsApp, telefone) nao e retornado pela API publica. O componente `ArticleCTARenderer` existe no projeto mas nunca e importado ou renderizado nas paginas publicas (`PublicArticle.tsx` e `CustomDomainArticle.tsx`).

### Problema 3: Formatacao quebrada (markdown cru visivel)
Os screenshots mostram `**bold**` sendo exibido como texto bruto em vez de negrito. Isso indica que o conteudo contem uma mistura de HTML e Markdown, e o renderizador nao esta processando HTML embutido corretamente (tags `<figure>`, `<img>`, `<strong>` dentro de conteudo Markdown).

## Solucao

### 1. Adicionar campos `content_images` e `cta` na API publica

**Arquivo**: `supabase/functions/content-api/index.ts`

Adicionar `"content_images"` e `"cta"` ao array `ARTICLE_PUBLIC_FIELDS` (linha 46-50):

```
const ARTICLE_PUBLIC_FIELDS = [
  "id", "title", "slug", "excerpt", "content", "featured_image_url", "featured_image_alt",
  "meta_description", "keywords", "category", "tags", "reading_time", "view_count",
  "published_at", "updated_at", "faq", "highlights", "content_images", "cta"
] as const;
```

### 2. Atualizar o tipo `ArticleFull` no frontend

**Arquivo**: `src/hooks/useContentApi.ts`

Adicionar os campos `content_images` e `cta` a interface `ArticleFull`:

```
export interface ArticleFull extends ArticleSummary {
  content: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  view_count: number | null;
  updated_at: string | null;
  faq: { question: string; answer: string }[] | null;
  highlights: unknown | null;
  content_images: { context: string; url: string; after_section: number }[] | null;
  cta: {
    company_name?: string;
    phone?: string;
    whatsapp?: string;
    booking_url?: string;
    site?: string;
    email?: string;
  } | null;
}
```

### 3. Conectar `content_images` e renderizar CTA no PublicArticle

**Arquivo**: `src/pages/PublicArticle.tsx`

- Importar `ArticleCTARenderer`
- Substituir `const contentImages: ContentImage[] = [];` por parsing real dos dados do artigo
- Adicionar renderizacao do `ArticleCTARenderer` antes da secao de FAQ ou apos o conteudo

```
// Linha 210 — substituir array vazio pelo parsing real:
const contentImages: ContentImage[] = Array.isArray(article.content_images)
  ? (article.content_images as ContentImage[])
  : [];

// Apos a secao de conteudo (linha ~375), adicionar CTA:
{article.cta && (
  <section className="px-4 pb-12">
    <div className="max-w-3xl mx-auto lg:mr-80 lg:ml-auto">
      <ArticleCTARenderer cta={article.cta} />
    </div>
  </section>
)}
```

### 4. Fazer o mesmo no CustomDomainArticle

**Arquivo**: `src/pages/CustomDomainArticle.tsx`

- Substituir `contentImages={null}` por parsing real
- Adicionar renderizacao do CTA

### 5. Melhorar renderizacao de conteudo misto HTML+Markdown

**Arquivo**: `src/components/public/ArticleContent.tsx`

Adicionar deteccao de conteudo HTML. Se o conteudo contem tags HTML (`<h2>`, `<p>`, `<figure>`), renderizar via `dangerouslySetInnerHTML` com sanitizacao, em vez de tentar processar como Markdown puro. Isso resolve o problema de `**bold**` aparecendo como texto e de tags `<figure>` sendo ignoradas.

Logica:
```
const isHtmlContent = /<(h[1-6]|p|div|figure|ul|ol|table)\b/i.test(content);

if (isHtmlContent) {
  // Renderizar como HTML direto (com processamento de WhatsApp CTAs)
  return <article dangerouslySetInnerHTML={{ __html: processedHtml }} />;
} else {
  // Renderizar como Markdown (fluxo atual)
  return <article>{formatContent(content)}</article>;
}
```

## Resumo das Mudancas

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/content-api/index.ts` | Adicionar `content_images` e `cta` aos campos publicos |
| `src/hooks/useContentApi.ts` | Adicionar campos ao tipo `ArticleFull` |
| `src/pages/PublicArticle.tsx` | Conectar imagens reais + renderizar CTA |
| `src/pages/CustomDomainArticle.tsx` | Conectar imagens reais + renderizar CTA |
| `src/components/public/ArticleContent.tsx` | Suporte a conteudo HTML (nao apenas Markdown) |

## Resultado Esperado

- Imagens internas aparecem no artigo publicado nas posicoes corretas
- Bloco de CTA com nome da empresa e WhatsApp aparece no rodape do artigo
- Conteudo renderizado corretamente independente de ser HTML ou Markdown
- Negrito, italico e listas funcionam em ambos os formatos

