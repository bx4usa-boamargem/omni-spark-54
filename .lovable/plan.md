
# V4.7 — Implementação Oficial: Remoção Template Stage + Image Injection Engine

## Resumo das Alterações

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/_shared/imageInjector.ts` | **CRIAR** | Image Injection Engine com Structure Guard |
| `supabase/functions/generate-article-structured/index.ts` | Modificar | Remover selectTemplate async, corrigir image_prompts → content_images |
| `supabase/functions/generate-images-background/index.ts` | Modificar | Usar content_images, injetar no content HTML |
| `supabase/functions/regenerate-article-images/index.ts` | Modificar | Adicionar injeção controlada + Structure Guard |

---

## 1. Criar `_shared/imageInjector.ts`

Novo módulo com duas funções principais:

### `validateContentStructure(content: string): boolean`
- Conta H2 em HTML (`<h2>`) e Markdown (`##`)
- Retorna `true` se >= 5 H2
- Retorna `false` e loga `[IMAGES][STRUCTURE_GUARD]` se < 5 H2

### `injectImagesIntoContent(content, contentImages): InjectionResult`
- Valida estrutura antes de modificar
- Encontra posições de todos os H2 no HTML
- Para cada imagem ordenada por `after_section`:
  - Verifica se já existe `<figure>` ou `<img>` próximo
  - Se não, injeta bloco `<figure class="article-image">...</figure>`
  - Se sim, incrementa `skipped`
- Retorna `{ content, injected, skipped, structureValid }`
- Logs obrigatórios:
  - `[IMAGES][INJECT] injected=X skipped=Y`
  - `[IMAGES][STRUCTURE_GUARD_BLOCKED] content not overwritten`

---

## 2. Modificar `generate-article-structured/index.ts`

### 2A. Remover Template Async (linhas 1663-1699)

**ANTES:**
```typescript
if (templateOverride) {
  // override logic
} else if (blog_id) {
  articleEngineTemplate = await selectTemplate(supabase, primaryKeyword, blog_id, niche);
}
```

**DEPOIS:**
```typescript
// V4.7: Template fixo síncrono - NUNCA travar em seleção
console.log(`[${requestId}][PIPELINE] V4.7: Using fixed template (no async selection)`);
const intent = classifyIntent(primaryKeyword);
articleEngineTemplate = {
  template: 'complete_guide' as TemplateType,
  variant: 'chronological' as TemplateVariant,
  intent,
  reason: 'V4.7: Template fixo para evitar travamento',
  antiPatternApplied: false
};
console.log(`[${requestId}][STAGE] writing`);
```

### 2B. Corrigir `image_prompts` → `content_images`

**Linha 2602:** Remover tentativa de salvar em `image_prompts` (coluna inexistente)

**ANTES:**
```typescript
.update({ 
  images_pending: true,
  images_total: totalImages,
  images_completed: 0,
  image_prompts: articleWithImages.image_prompts // COLUNA NÃO EXISTE!
})
```

**DEPOIS:**
```typescript
.update({ 
  images_pending: true,
  images_total: totalImages,
  images_completed: 0
  // V4.7: REMOVIDO image_prompts - coluna não existe
  // content_images será atualizado pelo background job
})
```

### 2C. Adicionar Log de Pipeline Start (início do handler)

```typescript
console.log(`[${requestId}][PIPELINE][START] Article generation initiated`);
```

---

## 3. Modificar `generate-images-background/index.ts`

### 3A. Adicionar Import do ImageInjector

```typescript
import { injectImagesIntoContent, validateContentStructure } from '../_shared/imageInjector.ts';
```

### 3B. Converter `image_prompts` para `content_images` (linhas 141-149)

**ANTES:**
```typescript
.update({
  image_prompts: image_prompts, // COLUNA NÃO EXISTE!
  images_completed: completedImages,
  ...
})
```

**DEPOIS:**
```typescript
// V4.7: Converter para formato content_images
const contentImagesForDb = image_prompts
  .filter((p: ImagePrompt) => p.url)
  .map((p: ImagePrompt, idx: number) => ({
    context: p.context,
    url: p.url,
    alt: p.alt || p.context,
    after_section: p.after_section || (idx + 1)
  }));

console.log(`[${request_id}][IMAGES][SAVE] content_images count=${contentImagesForDb.length}`);

.update({
  content_images: contentImagesForDb, // V4.7: Coluna correta
  images_completed: completedImages,
  ...
})
```

### 3C. Final Update (linhas 172-182)

Substituir `image_prompts: image_prompts` por `content_images: contentImagesForDb`

### 3D. Adicionar Injeção no Content (após o loop, antes do return)

```typescript
// V4.7: Injetar imagens no content HTML
if (contentImagesForDb.length > 0) {
  const { data: articleData } = await supabase
    .from('articles')
    .select('content')
    .eq('id', article_id)
    .single();
  
  if (articleData?.content) {
    console.log(`[${request_id}][IMAGES] Injecting images into content`);
    const result = injectImagesIntoContent(articleData.content, contentImagesForDb);
    
    if (result.structureValid && result.injected > 0) {
      console.log(`[${request_id}][IMAGES] Content updated successfully: ${result.injected} injected`);
      await supabase
        .from('articles')
        .update({ content: result.content })
        .eq('id', article_id);
    } else {
      console.log(`[${request_id}][IMAGES] No structural overwrite allowed`);
    }
  }
}

console.log(`[${request_id}][PIPELINE][DONE] stage=completed progress=100`);
```

---

## 4. Modificar `regenerate-article-images/index.ts`

### 4A. Adicionar Import do ImageInjector

```typescript
import { injectImagesIntoContent, validateContentStructure } from '../_shared/imageInjector.ts';
```

### 4B. Adicionar Injeção + Structure Guard (antes do update final, linha ~264)

**ANTES:**
```typescript
const { error: updateError } = await supabase
  .from('articles')
  .update({
    featured_image_url: featuredImageUrl,
    content_images: contentImages.length > 0 ? contentImages : null,
    updated_at: new Date().toISOString()
  })
  .eq('id', article_id);
```

**DEPOIS:**
```typescript
// V4.7: Injetar imagens no content existente (SEM REWRITE)
let updatedContent = article.content;
let structureValid = true;

if (article.content && contentImages.length > 0) {
  structureValid = validateContentStructure(article.content);
  
  if (structureValid) {
    console.log('[IMAGES] Injecting images into content');
    const result = injectImagesIntoContent(article.content, contentImages);
    
    if (result.structureValid && result.injected > 0) {
      updatedContent = result.content;
      console.log(`[IMAGES] Content updated successfully: ${result.injected} injected, ${result.skipped} skipped`);
    } else {
      console.log('[IMAGES] No structural overwrite allowed - content preserved');
    }
  } else {
    console.warn('[IMAGES][STRUCTURE_GUARD_BLOCKED] content not overwritten');
  }
}

const { error: updateError } = await supabase
  .from('articles')
  .update({
    featured_image_url: featuredImageUrl,
    content_images: contentImages.length > 0 ? contentImages : null,
    content: structureValid ? updatedContent : article.content, // Só atualiza se estrutura válida
    updated_at: new Date().toISOString()
  })
  .eq('id', article_id);
```

---

## Logs Obrigatórios (Resumo)

| Ponto | Log |
|-------|-----|
| Pipeline Start | `[PIPELINE][START] Article generation initiated` |
| Template V4.7 | `[PIPELINE] V4.7: Using fixed template (no async selection)` |
| Stage writing | `[STAGE] writing` |
| Salvamento content_images | `[IMAGES][SAVE] content_images count=X` |
| Injeção | `[IMAGES][INJECT] injected=X skipped=Y` |
| Structure Guard | `[IMAGES][STRUCTURE_GUARD_BLOCKED] content not overwritten` |
| Pipeline Done | `[PIPELINE][DONE] stage=completed progress=100` |

---

## Deploy Necessário

1. `generate-article-structured`
2. `generate-images-background`
3. `regenerate-article-images`

---

## Critérios de Aceite

| # | Critério | Verificação |
|---|----------|-------------|
| 1 | Nenhuma geração trava em "Selecionando template..." | Template fixo síncrono |
| 2 | Artigos têm `content_images` preenchido (>=4) | Coluna correta usada |
| 3 | "Corrigir imagens" preserva texto e H2/H3 | Structure Guard + injeção apenas |
| 4 | Capa + imagens internas funcionando | `featured_image_url` + injeção no content |
| 5 | Nenhum update em `image_prompts` | Coluna banida do código |
