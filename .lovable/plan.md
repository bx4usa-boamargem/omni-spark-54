

# Plano de Implementação: Timeout Agressivo + Imagens Assíncronas

## Resumo dos Ajustes

| Ajuste | Arquivo | Mudança Principal |
|--------|---------|-------------------|
| 1 - Research Timeout | `supabase/functions/_shared/aiProviders.ts` | 45s → 20s + SEM fallback Gemini |
| 2 - Imagens Assíncronas | `supabase/functions/generate-article-structured/index.ts` + Nova Edge Function | Timeout 5s + background job |

---

## AJUSTE 1: Research Stage - Timeout 20s + Fail Fast

### Arquivo: `supabase/functions/_shared/aiProviders.ts`

#### Mudança 1A: Reduzir timeout de Perplexity (linha 379)

**Antes:**
```typescript
45000 // 45s timeout for research
```

**Depois:**
```typescript
20000 // 20s timeout for research (V4.1: Fail-fast)
```

#### Mudança 1B: Desabilitar fallback Gemini no Research (linhas 501-533)

O fluxo atual tenta Gemini se Perplexity falhar. Isso adiciona até +45s de espera.

**Antes (função `callResearch`):**
```typescript
} catch (perplexityError) {
  // ... Fallback to Google
  try {
    const result = await callGoogleResearch(request);
    // ...
  } catch (googleError) {
    // ...
  }
}
```

**Depois:**
```typescript
} catch (perplexityError) {
  const errorMsg = perplexityError instanceof Error ? perplexityError.message : 'Unknown error';
  const duration = Date.now() - start;
  
  console.warn(`[AI_CONFIG] Research: Perplexity failed (${duration}ms) - ${errorMsg}`);
  console.log('[AI_CONFIG] Research: ❌ NO FALLBACK - using minimal package (V4.1: fail-fast)');
  
  // V4.1: NO Gemini fallback - return failure immediately for minimal package handling upstream
  logAICall('research', 'perplexity', false, duration, false, errorMsg);
  
  return {
    success: false,
    provider: 'perplexity',
    usedFallback: false,
    fallbackReason: errorMsg,
    durationMs: duration
  };
}
```

#### Mudança 1C: Garantir minimal package no generate-article-structured

No arquivo `generate-article-structured/index.ts`, a função `runLightResearchStage` já tem fallback para minimal package no catch block (linhas ~1566-1596). Precisamos garantir que o timeout é respeitado e o minimal package é usado imediatamente.

**Verificar/Ajustar** no tratamento de erro do light research stage para garantir que retorna minimal package sem tentar novamente:

```typescript
} catch (e) {
  const errorMsg = e instanceof Error ? e.message : 'Unknown error';
  console.warn(`[LightResearch] ⚠️ Failed: ${errorMsg} - using minimal package (V4.1)`);
  
  // V4.1: FAIL-FAST - Use minimal package immediately, NO retries
  researchPackage = {
    geo: {
      facts: [`Informações sobre ${theme} para clientes locais`],
      trends: ['Mercado em crescimento contínuo'],
      sources: [],
      rawQuery: primaryKeyword,
      fetchedAt: new Date().toISOString()
    },
    serp: {},
    sources: [],
    generatedAt: new Date().toISOString(),
    provider: 'minimal_fallback',
  };
  
  await logStage(supabase, blog_id!, 'research', 'minimal_fallback', 'light-research-fallback', true, 0, {
    error: errorMsg,
    minimal_package: true
  });
}
```

---

## AJUSTE 2: Imagens Assíncronas com Fallback 5s

### Parte 2A: Adicionar coluna `images_pending` na tabela articles

**Migração SQL:**
```sql
ALTER TABLE articles 
  ADD COLUMN IF NOT EXISTS images_pending BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN articles.images_pending IS 'True when images are being generated in background';
```

### Parte 2B: Criar Edge Function `generate-images-background`

**Novo arquivo:** `supabase/functions/generate-images-background/index.ts`

Esta função:
1. Recebe `article_id`, `image_prompts`, `niche`, `city`
2. Gera as imagens usando o provider layer
3. Atualiza o artigo com as URLs reais
4. Define `images_pending = false`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callImageGeneration, generateUnsplashFallback } from '../_shared/aiProviders.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackgroundImageRequest {
  article_id: string;
  blog_id: string;
  request_id: string;
  image_prompts: Array<{
    context: string;
    prompt: string;
    after_section: number;
    alt?: string;
  }>;
  niche: string;
  city: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body: BackgroundImageRequest = await req.json();
    const { article_id, blog_id, request_id, image_prompts, niche, city } = body;
    
    console.log(`[${request_id}][ImageJob] Starting background generation for ${image_prompts.length} images`);

    // Generate each image
    for (let i = 0; i < image_prompts.length; i++) {
      const imgPrompt = image_prompts[i];
      
      const result = await callImageGeneration({
        prompt: imgPrompt.prompt || `Professional ${imgPrompt.context} image`,
        context: imgPrompt.context,
        niche,
        city
      });
      
      if (result.success && result.data) {
        imgPrompt.url = result.data.url;
        imgPrompt.generated_by = result.data.generatedBy;
      }
      
      // Small delay between requests
      if (i < image_prompts.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Set featured image from first prompt
    const featuredUrl = image_prompts[0]?.url || null;

    // Update article with real images
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        image_prompts: image_prompts,
        featured_image_url: featuredUrl,
        images_pending: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', article_id);

    if (updateError) {
      console.error(`[${request_id}][ImageJob] Update failed:`, updateError);
      return new Response(JSON.stringify({ error: 'Update failed' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`[${request_id}][ImageJob] ✅ Article ${article_id} images updated`);

    return new Response(JSON.stringify({ 
      success: true, 
      images_generated: image_prompts.length 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[ImageJob] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
```

### Parte 2C: Modificar `generate-article-structured/index.ts` - Timeout de Imagens

**Localização:** Linhas ~2226-2240 (geração de imagens)

**Antes:**
```typescript
if (articleWithImages.image_prompts && articleWithImages.image_prompts.length > 0) {
  try {
    articleWithImages = await generateArticleImagesViaProvider(
      articleWithImages,
      effectiveNiche,
      city
    );
  } catch (imgError) {
    console.error('[QualityGate] ⚠️ Image generation failed:', imgError);
  }
}
```

**Depois:**
```typescript
const IMAGE_TIMEOUT_MS = 5000; // V4.1: 5 segundos máximo para imagens síncronas
let imagesTimedOut = false;

if (articleWithImages.image_prompts && articleWithImages.image_prompts.length > 0) {
  try {
    // V4.1: Race between image generation and timeout
    const imageGenPromise = generateArticleImagesViaProvider(
      articleWithImages,
      effectiveNiche,
      city
    );
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('IMAGE_TIMEOUT')), IMAGE_TIMEOUT_MS);
    });
    
    articleWithImages = await Promise.race([imageGenPromise, timeoutPromise]);
    console.log(`[${requestId}][Images] ✅ Generated in sync within ${IMAGE_TIMEOUT_MS}ms`);
    
  } catch (imgError) {
    const errorMsg = imgError instanceof Error ? imgError.message : 'Unknown';
    
    if (errorMsg === 'IMAGE_TIMEOUT') {
      console.warn(`[${requestId}][Images] ⏱️ Timeout after ${IMAGE_TIMEOUT_MS}ms - will generate in background`);
      imagesTimedOut = true;
      
      // Use Unsplash placeholders for immediate response
      for (const imgPrompt of articleWithImages.image_prompts) {
        const placeholder = generateUnsplashFallback({
          prompt: '',
          context: imgPrompt.context || 'business',
          niche: effectiveNiche,
          city
        });
        imgPrompt.url = placeholder.url;
        imgPrompt.generated_by = 'unsplash_placeholder';
      }
      
      // Set placeholder for featured image
      if (!articleWithImages.featured_image_url && articleWithImages.image_prompts[0]) {
        articleWithImages.featured_image_url = articleWithImages.image_prompts[0].url;
      }
    } else {
      console.error(`[${requestId}][Images] ⚠️ Generation failed:`, errorMsg);
    }
  }
}
```

### Parte 2D: Dispatch background job se timeout

**Após persistência (linhas ~2395+)**, adicionar dispatch do job de imagens:

```typescript
// V4.1: Dispatch background image generation if timed out
if (imagesTimedOut && persistedArticle.id) {
  console.log(`[${requestId}][Images] Dispatching background image job for article ${persistedArticle.id}`);
  
  // Mark article as having pending images
  await supabase
    .from('articles')
    .update({ images_pending: true })
    .eq('id', persistedArticle.id);
  
  // Fire-and-forget background job
  fetch(`${SUPABASE_URL}/functions/v1/generate-images-background`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      article_id: persistedArticle.id,
      blog_id,
      request_id: requestId,
      image_prompts: articleWithImages.image_prompts,
      niche: effectiveNiche,
      city
    }),
  }).then(res => {
    console.log(`[${requestId}][ImageJob] Dispatch status: ${res.status}`);
  }).catch(e => {
    console.error(`[${requestId}][ImageJob] Dispatch failed:`, e);
  });
}
```

### Parte 2E: Registrar edge function no config.toml

**Adicionar em `supabase/config.toml`:**
```toml
[functions.generate-images-background]
verify_jwt = false
```

### Parte 2F: Exportar generateUnsplashFallback em aiProviders.ts

A função `generateUnsplashFallback` precisa ser exportada para ser usada no main flow:

**Em `aiProviders.ts` (linha 733):**
```typescript
// Mudar de:
function generateUnsplashFallback(request: ImageRequest): ImageResponse {

// Para:
export function generateUnsplashFallback(request: ImageRequest): ImageResponse {
```

---

## Resumo de Arquivos Alterados

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/_shared/aiProviders.ts` | Timeout 45s→20s, remover fallback Gemini, exportar `generateUnsplashFallback` |
| `supabase/functions/generate-article-structured/index.ts` | Timeout 5s imagens, dispatch background job, flag `images_pending` |
| `supabase/functions/generate-images-background/index.ts` | **NOVO** - Job assíncrono de imagens |
| `supabase/config.toml` | Registrar `generate-images-background` |
| **Migração SQL** | Adicionar coluna `images_pending` |

---

## Timeouts Efetivos Finais

| Componente | Antes | Depois |
|------------|-------|--------|
| Perplexity Research | 45s | **20s** |
| Gemini Research Fallback | +45s | **0s (removido)** |
| Image Generation (sync) | ~30s ilimitado | **5s máx** |
| Image Generation (background) | N/A | Sem limite (async) |
| **Total máx caminho crítico** | ~120s | **~35s** |

---

## Fluxo Final

```text
FASE SÍNCRONA (< 35s):
├── Research Perplexity ──── máx 20s (ou minimal package)
├── Writer GPT-4o/Gemini ─── ~15s
├── QA Gemini ────────────── ~5s
├── Imagens ──────────────── máx 5s (placeholders se timeout)
├── Persistência ─────────── ~1s
└── RETORNO AO USUÁRIO

FASE ASSÍNCRONA (background):
├── generate-images-background ── gera imagens reais
├── seo-enhancer-job ────────── scraping + SEO profundo
└── UPDATE articles incrementais
```

