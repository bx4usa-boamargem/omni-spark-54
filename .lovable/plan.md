
# Correcao: Imagens Quebradas, Texto Corrido e CTA Ausente

## Problemas Encontrados

### 1. Imagem de Capa Quebrada (source.unsplash.com)
O servico `source.unsplash.com` foi descontinuado e nao retorna mais imagens. O fallback de imagens em `supabase/functions/_shared/geminiImageGenerator.ts` (linha 121) gera URLs neste formato morto:
```
https://source.unsplash.com/1024x576/?pest%20control...
```
Isso afeta tanto a `featured_image_url` quanto a primeira imagem em `content_images`. No banco, o artigo publicado tem exatamente este URL quebrado como capa.

### 2. Conteudo com Formatacao Incorreta (Texto Corrido)
O conteudo no banco esta em formato Markdown valido (com `## ` headings e quebras de linha). O componente `ArticleContent.tsx` possui um parser Markdown que deveria renderizar corretamente. Porem:
- A **introducao** do artigo nao possui um heading H2, formando um bloco de texto longo sem separacao visual antes do primeiro `## `
- A deteccao HTML vs Markdown esta funcionando (o conteudo e corretamente identificado como Markdown)
- O problema visual e que a introducao longa aparece como um unico paragrafo gigante sem quebra, pois o parser agrupa linhas de texto consecutivas em um unico `<p>`

### 3. Imagens Internas (content_images)
O banco possui 6 entradas em `content_images`. Porem:
- A primeira imagem usa URL do Unsplash (quebrado)
- As demais usam base64 (`data:image/png;base64,...`) — funcionam mas sao enormes (megabytes cada)
- O componente `ArticleContent.tsx` injeta imagens apos os H2 usando o campo `after_section`, o que esta correto

### 4. CTA no Rodape
O campo `cta` existe no banco com dados corretos: `{company_name: "Ana Bione Consultoria de Imagem", whatsapp: "14079284458", city: "Brasil..."}`. O `PublicArticle.tsx` ja renderiza o `ArticleCTARenderer` (linhas 381-387). O componente deve estar funcionando, mas pode nao ser visivel se o usuario nao rolar ate o final da pagina. No **editor**, o `ArticlePreview.tsx` (simulacao) NAO renderiza o CTA — apenas mostra o conteudo e FAQ.

## Plano de Correcao

### Correcao 1: Substituir Unsplash Fallback por Placeholder Funcional
**Arquivo**: `supabase/functions/_shared/geminiImageGenerator.ts`

Substituir o fallback `source.unsplash.com` por um servico funcional. Opcoes:
- Usar `picsum.photos` (funcional, generico)
- Ou gerar imagens via Gemini como ja e tentado antes do fallback

Mudar a funcao `generateUnsplashFallback` para usar `https://picsum.photos/1024/576` ou outro servico ativo.

### Correcao 2: Corrigir Artigo Existente no Banco
A `featured_image_url` do artigo publicado precisa ser atualizada para uma URL funcional. Podemos adicionar logica no `content-api` para detectar e substituir URLs do `source.unsplash.com` por um placeholder, ou corrigir diretamente no banco.

### Correcao 3: Melhorar Renderizacao de Introducao no ArticleContent
**Arquivo**: `src/components/public/ArticleContent.tsx`

O parser Markdown precisa tratar a introducao (texto antes do primeiro `## `) com melhor separacao visual. Adicionar quebra de paragrafo quando houver linhas vazias (`\n\n`) entre blocos de texto na introducao, e garantir que cada `\n\n` gere um novo `<p>`.

### Correcao 4: Adicionar CTA ao Editor Preview
**Arquivo**: `src/components/ArticlePreview.tsx`

Importar e renderizar o `ArticleCTARenderer` na simulacao do editor, apos o conteudo do artigo, para que o usuario veja o CTA durante a edicao.

### Correcao 5: Atualizar aiConfig.ts
**Arquivo**: `supabase/functions/_shared/aiConfig.ts`

Atualizar a referencia a `source.unsplash.com` na configuracao de fallback para o novo servico.

## Resumo das Mudancas

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/_shared/geminiImageGenerator.ts` | Substituir `source.unsplash.com` por servico funcional |
| `supabase/functions/_shared/aiConfig.ts` | Atualizar URL de fallback |
| `src/components/public/ArticleContent.tsx` | Melhorar separacao visual da introducao |
| `src/components/ArticlePreview.tsx` | Adicionar renderizacao do CTA na simulacao |

## Resultado Esperado

- Imagens de capa e internas funcionais (sem URLs quebrados)
- Texto com formatacao adequada (headings, paragrafos separados)
- CTA visivel tanto no editor quanto no artigo publicado
- Novos artigos gerados usarao fallback funcional
