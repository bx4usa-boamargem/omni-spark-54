
# Integrar Parâmetros do Article Engine no Fluxo de Geração

## Contexto do Problema

O usuário está relatando que a interface avançada de geração (`/client/articles/generate`) não está enviando corretamente os parâmetros `image_count`, `word_count` e `mode` para a edge function `generate-article-structured`. Além disso, o backend força `geo_mode=true` (que exige Perplexity), mas não há fallback automático quando o Web Research está desativado.

## Diagnóstico

| Problema | Localização | Causa |
|----------|-------------|-------|
| `image_count` limitado a 5 | `generate-article-structured/index.ts` L1565 | `Math.min(Math.max(image_count, 1), 5)` ignora modo Authority |
| `generation_mode` sempre "deep" | `generate-article-structured/index.ts` L1312 | Linha força `deep` independente do payload |
| Sem fallback de Web Research | `generate-article-structured/index.ts` L1390-1409 | Retorna 424 se Perplexity falhar sem fallback |
| `ArticleGenerator.tsx` não envia `image_count`/`word_count` | `ArticleGenerator.tsx` L193-206 | Payload não inclui esses campos |

---

## Solução: 3 Arquivos a Modificar

### 1. `supabase/functions/generate-article-structured/index.ts`

**Mudança A: Fallback automático de Web Research**

Linha ~1390-1409: Modificar `runResearchStage` para retornar pacote vazio em vez de erro quando Perplexity falhar.

```typescript
// ANTES (bloqueia com 424)
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  await logStage(...);
  return new Response(
    JSON.stringify({ error: 'RESEARCH_REQUIRED', message: msg }),
    { status: 424, headers: {...} }
  );
}

// DEPOIS (fallback com aviso)
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.warn(`[RESEARCH] Fallback mode - no web research: ${msg}`);
  await logStage(supabase, blog_id, 'research', 'fallback', 'research-package', false, 0, { fallback: true }, 0, 0, msg);
  
  // Create empty research package (allows generation without web research)
  researchPackage = {
    geo: { 
      facts: [], 
      sources: [], 
      stats: [], 
      localContext: null,
      neighborhoodMentions: [],
      competitorData: null
    },
    serp: { commonTerms: [], topTitles: [], contentGaps: [], averages: {} },
    sources: [],
    generatedAt: new Date().toISOString(),
  };
  
  console.log(`[RESEARCH] Proceeding with empty research package (fallback mode)`);
}
```

**Mudança B: Respeitar `mode` para `image_count` (6-10 para Authority)**

Linha ~1565: Ajustar limite dinâmico baseado no modo.

```typescript
// ANTES
const targetImageCount = Math.min(Math.max(image_count, 1), 5);

// DEPOIS
const maxImagesByMode = mode === 'authority' ? 10 : 5;
const targetImageCount = Math.min(Math.max(image_count, 1), maxImagesByMode);
console.log(`[IMAGES] Mode: ${mode}, requested: ${image_count}, target: ${targetImageCount} (max: ${maxImagesByMode})`);
```

**Mudança C: Respeitar `generation_mode` do payload (não forçar deep)**

Linha ~1311-1313: Usar valor do payload quando fornecido.

```typescript
// ANTES
const generation_mode = 'deep'; // GEO mode always uses deep mode

// DEPOIS
// GEO mode prefers deep, but respects explicit user request for fast
const generation_mode = requestedGenerationMode || 'deep';
console.log(`[GENERATION MODE] Resolved: ${generation_mode} (requested: ${requestedGenerationMode || 'none'})`);
```

---

### 2. `src/pages/client/ArticleGenerator.tsx`

**Mudança: Incluir `image_count` e `word_count` no payload**

Linha ~192-211: Adicionar campos faltantes ao payload.

```typescript
const payload = {
  keyword: formData.keyword.trim(),
  city: formData.city.trim(),
  state: formData.state,
  niche: formData.niche,
  mode: formData.mode,
  webResearch: formData.webResearch,
  templateOverride: formData.template !== 'auto' ? formData.template : undefined,
  blogId: blog.id,
  businessName: businessProfile?.company_name || blog.name,
  businessWhatsapp: businessProfile?.whatsapp,
  useEat: formData.eatInjection,
  contextualAlt: formData.imageAlt,
  // ✅ NEW: Adicionar campos faltantes
  image_count: formData.mode === 'authority' ? 6 : 3,
  word_count: formData.mode === 'authority' ? 2400 : 1000,
  generation_mode: formData.mode === 'authority' ? 'deep' : 'fast',
};
```

---

### 3. `src/utils/streamArticle.ts` (Opcional - Já Funciona)

O arquivo já envia `image_count` e `word_count` corretamente via `options.imageCount` e `options.wordCount`. Nenhuma alteração necessária aqui, mas os chamadores (como `ClientArticleEditor`) podem precisar passar esses valores.

---

## Fluxo Após Implementação

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                    GERADOR AVANÇADO (/client/articles/generate)            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Usuário configura:                                                         │
│  ├── Mode: Entry (800-1200 words) ou Authority (1200-3000 words)           │
│  ├── Web Research: ON/OFF (toggle)                                          │
│  ├── E-E-A-T: ON/OFF                                                        │
│  └── Template: Auto ou seleção manual                                       │
│                                                                             │
│  Payload enviado:                                                           │
│  {                                                                          │
│    mode: "authority",                                                       │
│    generation_mode: "deep",          // ← NOVO                              │
│    image_count: 6,                   // ← NOVO (6-10 para authority)        │
│    word_count: 2400,                 // ← NOVO                              │
│    webResearch: true,                // ← Respeitado no backend             │
│    ...                                                                      │
│  }                                                                          │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   EDGE FUNCTION (generate-article-structured)              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Tenta Research Stage (Perplexity)                                      │
│     ├── Se sucesso: usa dados reais                                        │
│     └── Se falha: FALLBACK automático (pacote vazio, log de aviso)         │
│                                                                             │
│  2. Calcula image_count dinâmico:                                          │
│     ├── Entry: max 5 imagens                                               │
│     └── Authority: max 10 imagens                                          │
│                                                                             │
│  3. Gera artigo com word_count e structure conforme modo                   │
│                                                                             │
│  4. Persiste e retorna { success: true, article: {...} }                   │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Resumo Técnico

| Arquivo | Alterações | Impacto |
|---------|------------|---------|
| `generate-article-structured/index.ts` | Fallback Perplexity + image_count dinâmico + respeitar generation_mode | Backend |
| `ArticleGenerator.tsx` | Adicionar image_count/word_count/generation_mode ao payload | Frontend |

---

## Benefícios

1. **Fallback Automático**: Se Perplexity falhar, gera artigo sem pesquisa (avisa no log)
2. **Authority Mode Completo**: 6-10 imagens + 2400 palavras target
3. **Configuração Explícita**: Payload envia todos os parâmetros do Article Engine
4. **Sem Breaking Changes**: Comportamento default permanece o mesmo (deep + 3 imagens)

---

## Checklist de Implementação

- [x] Modificar `generate-article-structured/index.ts`: fallback de pesquisa
- [x] Modificar `generate-article-structured/index.ts`: image_count dinâmico por modo
- [x] Modificar `generate-article-structured/index.ts`: respeitar generation_mode do payload
- [x] Modificar `ArticleGenerator.tsx`: incluir image_count, word_count, generation_mode
- [x] Deploy da edge function
- [ ] Testar fluxo completo com mode=authority e webResearch=false
