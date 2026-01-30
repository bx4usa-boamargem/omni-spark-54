

# Implementação: Destravar Geração de Artigos

## Resumo Executivo

Implementar 4 correções exatas conforme especificação para garantir que toda conversão de oportunidade gere artigo em modo FAST + ENTRY, com logs rastreáveis e tratamento de erro adequado.

---

## 1. FRONTEND – ClientArticleEditor.tsx

**Arquivo:** `src/pages/client/ClientArticleEditor.tsx`
**Linhas:** 237-321

### Alterações:

```typescript
const handleConvertOpportunity = async (oppId: string, blogId: string) => {
  // A) Gerar request_id no início
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}][ConvertOpportunity] Starting conversion for opportunity:`, oppId);
  
  setPhase('generating');
  setGenerationStage('analyzing');
  setGenerationProgress(10);

  // C) Garantir limpeza com try/finally
  const progressInterval = setInterval(() => {
    setGenerationProgress((prev) => Math.min(prev + 8, 85));
  }, 2000);

  try {
    // B) Enviar request_id no invoke
    const { data, error } = await supabase.functions.invoke('convert-opportunity-to-article', {
      body: { 
        opportunityId: oppId, 
        blogId,
        request_id: requestId
      },
    });

    // D) Tratamento explícito de erro
    if (error) {
      console.error(`[${requestId}][ConvertOpportunity] Edge function error:`, error);
      const errorMessage = error.message || 'Erro desconhecido';
      
      if (errorMessage.includes('insufficient_sections') || errorMessage.includes('QUALITY_GATE')) {
        toast.error('Estrutura do artigo insuficiente. Tente com outro tema.');
      } else if (errorMessage.includes('insufficient_faq')) {
        toast.error('FAQ insuficiente. Tente novamente.');
      } else if (errorMessage.includes('missing_introduction')) {
        toast.error('Introdução muito curta. Tente novamente.');
      } else {
        toast.error(`Erro ao gerar: ${errorMessage}`);
      }
      
      setPhase('form');
      setGenerationProgress(0);
      setGenerationStage(null);
      return;
    }

    // D) Verificar success e ler error_type/reason_code
    if (!data?.success) {
      console.error(`[${requestId}][ConvertOpportunity] Conversion failed:`, data);
      
      const errorType = data?.error_type || '';
      const reasonCode = data?.reason_code || '';
      const failReason = data?.message || data?.details || data?.error || 'Erro na conversão';
      
      if (errorType === 'QUALITY_GATE_FAILED' || reasonCode.includes('insufficient')) {
        toast.error(`Validação falhou: ${failReason}`);
      } else {
        toast.error(failReason);
      }
      
      setPhase('form');
      setGenerationProgress(0);
      setGenerationStage(null);
      return;
    }

    // Sucesso
    setGenerationProgress(100);
    toast.success('Artigo criado com sucesso!');
    console.log(`[${requestId}][ConvertOpportunity] Success, redirecting to article:`, data.article_id);
    smartNavigate(navigate, getClientArticleEditPath(data.article_id));
    
  } catch (err) {
    console.error(`[${requestId}][ConvertOpportunity] Unexpected error:`, err);
    const errorMsg = err instanceof Error ? err.message : 'Erro inesperado';
    toast.error(`Erro ao criar artigo: ${errorMsg}`);
    setPhase('form');
    setGenerationProgress(0);
    setGenerationStage(null);
  } finally {
    // C) clearInterval SEMPRE no finally
    clearInterval(progressInterval);
  }
};
```

---

## 2. EDGE FUNCTION – convert-opportunity-to-article

**Arquivo:** `supabase/functions/convert-opportunity-to-article/index.ts`

### A) Receber request_id (linha 39)

```typescript
// ANTES:
const { opportunityId, blogId }: ConvertRequest = await req.json();

// DEPOIS:
const { opportunityId, blogId, request_id }: ConvertRequest & { request_id?: string } = await req.json();
const requestId = request_id || crypto.randomUUID();
console.log(`[${requestId}] Starting opportunity conversion`);
```

### B) Prefixar TODOS os logs com [requestId]

Exemplos de logs a modificar:
- Linha 45: `[CONVERT] Starting conversion...` → `[${requestId}][CONVERT] Starting conversion...`
- Linha 55: `[CONVERT] Opportunity not found...` → `[${requestId}][CONVERT] Opportunity not found...`
- E todos os demais logs do arquivo

### C) Payload já está correto (linhas 174-175):
```typescript
generation_mode: 'fast',  // ← JÁ ESTÁ CORRETO
mode: 'entry',            // ← JÁ ESTÁ CORRETO
```

### D) Propagar request_id no payload (linha 200):
```typescript
const generatePayload = {
  // ... campos existentes ...
  request_id: requestId,  // ADICIONAR
};
```

### E) Retorno estruturado com error_type e reason_code

**Linha 257-265 (erro 422):**
```typescript
return new Response(
  JSON.stringify({
    success: false,
    error_type: 'QUALITY_GATE_FAILED',
    reason_code: errorData.code || errorData.error,
    message: errorData.message || `Falha na geração do artigo`,
    request_id: requestId
  }),
  { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

**Linha 437-446 (sucesso):**
```typescript
return new Response(
  JSON.stringify({
    success: true,
    article_id: articleId,
    // ... demais campos ...
    request_id: requestId
  }),
  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

**Linha 449-457 (erro genérico):**
```typescript
return new Response(
  JSON.stringify({
    success: false,
    error_type: 'UNEXPECTED_ERROR',
    message: error instanceof Error ? error.message : "Unknown error",
    request_id: requestId
  }),
  { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

---

## 3. EDGE FUNCTION – generate-article-structured

**Arquivo:** `supabase/functions/generate-article-structured/index.ts`

### A) Receber request_id do body (linha 1407-1408)

```typescript
// Após o parse do JSON, adicionar:
// Usar request_id do caller OU gerar novo
const incomingRequestId = (await req.json()).request_id;
// Depois de todo o destructuring:
const effectiveRequestId = incomingRequestId || requestId;
console.log(`[${effectiveRequestId}] Starting article generation (incoming: ${incomingRequestId ? 'yes' : 'no'})`);
```

### B) Prefixar logs principais com [requestId]

Logs a atualizar:
- Linha 1414: `[OMNICORE GEO V2.0]...` → `[${requestId}][OMNICORE GEO V2.0]...`
- Linha 1417: `[Article Engine]...` → `[${requestId}][Article Engine]...`
- Linha 1421: `[GENERATION MODE]...` → `[${requestId}][GENERATION MODE]...`
- Linha 1429: `[HOTFIX]...` → `[${requestId}][HOTFIX]...`
- Linha 1450: `[QualityGate] Step 1...` → `[${requestId}][QualityGate] Step 1...`

### C) Resolução de modo já está correta (linhas 1426-1430):
```typescript
let effectiveMode = mode;
if (generation_mode === 'fast') {
  effectiveMode = 'entry';
  console.log('[HOTFIX] mode forced to entry because generation_mode=fast');
}
```

### D) Logs obrigatórios do payload recebido (após linha 1417):
```typescript
console.log(`[${requestId}][PAYLOAD] Received:`, JSON.stringify({
  requestedGenerationMode,
  mode,
  niche,
  city: requestCity,
  businessName
}));
```

---

## 4. QUALITY GATE – Degradação Controlada

**Arquivo:** `supabase/functions/_shared/qualityGateConfig.ts`

### Atualizar interface QualityGateResult:
```typescript
export interface QualityGateResult {
  passed: boolean;
  code: string;
  details: string;
  warnings?: string[];  // NOVO
  metrics?: {
    wordCount: number;
    h2Count: number;
    faqCount: number;
    imageCount: number;
  };
}
```

**Arquivo:** `supabase/functions/_shared/qualityGate.ts`

### Nova assinatura e lógica:

```typescript
export interface QualityGateOptions {
  allowWarnings?: boolean;
  generationMode?: string;
  requestId?: string;
}

export function runQualityGate(
  article: any, 
  mode: ArticleMode,
  options?: QualityGateOptions
): QualityGateResult {
  const config = QUALITY_GATE_CONFIG[mode];
  const warnings: string[] = [];
  const allowWarnings = options?.allowWarnings ?? (mode === 'entry' || options?.generationMode === 'fast');
  const logPrefix = options?.requestId ? `[${options.requestId}]` : '';
  
  console.log(`${logPrefix}[QualityGate] Running validation for mode: ${mode}, allowWarnings: ${allowWarnings}`);

  // 1. TITLE - SEMPRE HARD GATE
  if (!article.title?.trim()) {
    return { passed: false, code: ERROR_CODES.MISSING_TITLE, details: 'Title vazio' };
  }

  // 2. INTRODUCTION - SEMPRE HARD GATE (structural)
  const introduction = article.introduction || article.intro || '';
  if (introduction.length < config.minIntroductionLength) {
    return { 
      passed: false, 
      code: ERROR_CODES.MISSING_INTRODUCTION, 
      details: `Introduction tem ${introduction.length} chars, mínimo: ${config.minIntroductionLength}` 
    };
  }

  // 3. SECTIONS - DEGRADAÇÃO CONTROLADA
  const sections = Array.isArray(article.sections) ? article.sections : [];
  if (sections.length < config.minH2Count) {
    if (allowWarnings && sections.length >= 3) {
      warnings.push(`insufficient_sections: ${sections.length}/${config.minH2Count}`);
      console.warn(`${logPrefix}[QualityGate] WARNING: Sections ${sections.length} < ${config.minH2Count}`);
    } else {
      return { 
        passed: false, 
        code: ERROR_CODES.INSUFFICIENT_SECTIONS, 
        details: `Sections: ${sections.length}, mínimo: ${config.minH2Count}` 
      };
    }
  }

  // 4. SEÇÕES INVÁLIDAS - SEMPRE HARD GATE
  const invalidSections = sections.filter((s: any) => 
    !s.h2?.trim() || !s.content?.trim() || s.content.length < config.minSectionContentLength
  );
  if (invalidSections.length > 0) {
    return { 
      passed: false, 
      code: ERROR_CODES.INVALID_SECTIONS, 
      details: `${invalidSections.length} seções vazias` 
    };
  }

  // 5. FAQ - DEGRADAÇÃO CONTROLADA
  const faqCount = Array.isArray(article.faq) ? article.faq.length : 0;
  if (faqCount < config.minFaqCount) {
    if (allowWarnings && faqCount >= 2) {
      warnings.push(`insufficient_faq: ${faqCount}/${config.minFaqCount}`);
      console.warn(`${logPrefix}[QualityGate] WARNING: FAQ ${faqCount} < ${config.minFaqCount}`);
    } else {
      return { 
        passed: false, 
        code: ERROR_CODES.INSUFFICIENT_FAQ, 
        details: `FAQ: ${faqCount}, mínimo: ${config.minFaqCount}` 
      };
    }
  }

  // 6. IMAGES - DEGRADAÇÃO CONTROLADA
  const imageCount = Array.isArray(article.image_prompts) ? article.image_prompts.length : 0;
  if (imageCount < config.minImagePrompts) {
    if (allowWarnings && imageCount >= 1) {
      warnings.push(`insufficient_images: ${imageCount}/${config.minImagePrompts}`);
      console.warn(`${logPrefix}[QualityGate] WARNING: Images ${imageCount} < ${config.minImagePrompts}`);
    } else {
      return { 
        passed: false, 
        code: ERROR_CODES.INSUFFICIENT_IMAGES, 
        details: `Images: ${imageCount}, mínimo: ${config.minImagePrompts}` 
      };
    }
  }

  // 7. HERO IMAGE - SEMPRE HARD GATE
  const hasHeroImage = article.featured_image_url || article.image_prompts?.[0]?.url;
  if (!hasHeroImage) {
    return { 
      passed: false, 
      code: ERROR_CODES.MISSING_HERO_IMAGE, 
      details: 'Hero image obrigatória' 
    };
  }

  // 8. WORD COUNT - DEGRADAÇÃO CONTROLADA
  let totalWords = 0;
  if (introduction) totalWords += introduction.split(/\s+/).filter(Boolean).length;
  sections.forEach((s: any) => {
    if (s.content) totalWords += s.content.split(/\s+/).filter(Boolean).length;
    if (Array.isArray(s.h3s)) {
      s.h3s.forEach((h3: any) => {
        if (h3.content) totalWords += h3.content.split(/\s+/).filter(Boolean).length;
      });
    }
  });
  const conclusion = article.conclusion || '';
  if (conclusion) totalWords += conclusion.split(/\s+/).filter(Boolean).length;

  if (totalWords < config.minWordCount) {
    if (allowWarnings && totalWords >= 500) {
      warnings.push(`insufficient_word_count: ${totalWords}/${config.minWordCount}`);
      console.warn(`${logPrefix}[QualityGate] WARNING: Words ${totalWords} < ${config.minWordCount}`);
    } else {
      return { 
        passed: false, 
        code: ERROR_CODES.INSUFFICIENT_WORD_COUNT, 
        details: `Word count: ${totalWords}, mínimo: ${config.minWordCount}` 
      };
    }
  }

  // 9. CONCLUSION - SEMPRE HARD GATE
  if (conclusion.length < config.minConclusionLength) {
    return { 
      passed: false, 
      code: ERROR_CODES.MISSING_CONCLUSION, 
      details: `Conclusion tem ${conclusion.length} chars` 
    };
  }

  // PASSOU
  console.log(`${logPrefix}[QualityGate] ✅ PASSED - ${sections.length} H2s, ${faqCount} FAQs, ${imageCount} images, ${totalWords} words`);
  if (warnings.length > 0) {
    console.warn(`${logPrefix}[QualityGate] Passed with ${warnings.length} warnings:`, warnings);
  }
  
  return {
    passed: true,
    code: 'ok',
    details: warnings.length > 0 ? `Validado com ${warnings.length} avisos` : 'Artigo validado',
    warnings: warnings.length > 0 ? warnings : undefined,
    metrics: { wordCount: totalWords, h2Count: sections.length, faqCount, imageCount }
  };
}
```

---

## 5. Chamada do Quality Gate em generate-article-structured

**Linha 2260:**

```typescript
// ANTES:
const gateResult = runQualityGate(articleWithImages, articleMode);

// DEPOIS:
const gateResult = runQualityGate(articleWithImages, articleMode, {
  allowWarnings: generation_mode === 'fast' || articleMode === 'entry',
  generationMode: generation_mode,
  requestId: requestId
});

if (gateResult.warnings && gateResult.warnings.length > 0) {
  console.warn(`[${requestId}][QualityGate] Passed with warnings:`, gateResult.warnings);
}
```

---

## Resumo dos Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/client/ClientArticleEditor.tsx` | request_id, try/finally, error handling |
| `supabase/functions/convert-opportunity-to-article/index.ts` | request_id, logs prefixados, retorno estruturado |
| `supabase/functions/generate-article-structured/index.ts` | request_id, logs prefixados, payload log |
| `supabase/functions/_shared/qualityGate.ts` | allowWarnings, degradação controlada |
| `supabase/functions/_shared/qualityGateConfig.ts` | Interface warnings |

---

## Regras de Degradação (Resumo)

| Validação | mode=entry OU fast | mode=authority |
|-----------|-------------------|----------------|
| missing_title | ABORT | ABORT |
| missing_introduction | ABORT | ABORT |
| invalid_sections | ABORT | ABORT |
| missing_hero_image | ABORT | ABORT |
| missing_conclusion | ABORT | ABORT |
| insufficient_sections (< min) | WARNING (se >= 3) | ABORT |
| insufficient_faq (< min) | WARNING (se >= 2) | ABORT |
| insufficient_images (< min) | WARNING (se >= 1) | ABORT |
| insufficient_word_count (< min) | WARNING (se >= 500) | ABORT |

---

## Critério de Aceite

Após implementação:
1. 5 artigos seguidos sem abort
2. Nenhum caso preso em 85%
3. Logs rastreáveis por request_id
4. fast → entry SEM exceção
5. Authority só quando explicitamente solicitado

