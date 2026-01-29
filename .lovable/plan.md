

# Plano: Reativar Pesquisa Web com Fallback Robusto

## Resumo Executivo

A pesquisa web (Perplexity + Firecrawl) está **desabilitada temporariamente** via código hardcoded. Este plano implementa um sistema de fallback robusto em 2 níveis, garantindo que artigos sempre tenham pesquisa competitiva ou falhem de forma transparente.

---

## Diagnóstico Atual

### Localização do Problema
**Arquivo:** `supabase/functions/generate-article-structured/index.ts`  
**Linhas:** 1493-1536

### Estado Atual (Problemático)
```typescript
// Linha 1500
console.log('[TEMPORARY] Web research DISABLED - using empty package immediately');

researchPackage = {
  geo: { facts: [], trends: [], sources: [], ... },
  serp: { commonTerms: [], topTitles: [], ... },
  sources: [],
  ...
};
```

O código original (correto) está comentado nas linhas 1521-1536.

---

## Arquitetura de Fallback Proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE 1: RESEARCH                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐     ┌───────────────────┐                │
│  │  runResearchStage │────►│ Perplexity Sonar  │                │
│  │  (função local)   │     │ + analyze-serp    │                │
│  └────────┬─────────┘     └─────────┬─────────┘                │
│           │                         │                           │
│           │                         ▼                           │
│           │                    ┌────────┐                       │
│           │                    │ SUCESSO│──► Continua geração   │
│           │                    └────────┘                       │
│           │                         │                           │
│           ▼                         ▼                           │
│      ┌────────┐              ┌─────────────┐                   │
│      │ FALHA  │─────────────►│ callResearch│                   │
│      └────────┘              │ (aiProviders)│                   │
│                              └──────┬──────┘                   │
│                                     │                           │
│                              ┌──────┴──────┐                   │
│                              ▼             ▼                   │
│                         ┌────────┐   ┌────────┐                │
│                         │ SUCESSO│   │ FALHA  │                │
│                         │(Gemini)│   │(ABORTA)│                │
│                         └───┬────┘   └───┬────┘                │
│                             │            │                      │
│                             ▼            ▼                      │
│                     Continua com    Return 500                  │
│                     provider mark   RESEARCH_FAILED             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### Etapa 1: Atualizar Interface ResearchPackage

**Arquivo:** `supabase/functions/generate-article-structured/index.ts`  
**Linhas:** 223-228

Adicionar campo opcional `provider` para rastrear qual sistema gerou a pesquisa:

```typescript
interface ResearchPackage {
  geo: GeoResearchData;
  serp: SerpMatrixLite;
  sources: string[];
  generatedAt: string;
  provider?: 'perplexity' | 'gemini_fallback';  // NOVO
}
```

---

### Etapa 2: Substituir Bloco Stage 1 (Research)

**Arquivo:** `supabase/functions/generate-article-structured/index.ts`  
**Linhas:** 1493-1536

Remover todo o bloco temporário desabilitado e substituir por:

```typescript
// ============================================================================
// STAGE 1 (RESEARCH) - Perplexity Primary → Gemini Fallback → Abort
// ============================================================================
let researchPackage: ResearchPackage;

// Diagnóstico de configuração
console.log('[Research] Starting web research stage...');
console.log('[Research] PERPLEXITY_API_KEY exists:', !!Deno.env.get('PERPLEXITY_API_KEY'));
console.log('[Research] Theme:', theme);
console.log('[Research] Primary keyword:', primaryKeyword);
console.log('[Research] Territory:', territoryData?.official_name || 'N/A');

try {
  // NÍVEL 1: Tentar runResearchStage (Perplexity + Firecrawl)
  researchPackage = await runResearchStage({
    supabase,
    blogId: blog_id!,
    theme,
    primaryKeyword,
    territoryName: territoryData?.official_name || null,
    territoryData: (territoryData as unknown as GeoTerritoryData) || null,
  });
  researchPackage.provider = 'perplexity';
  console.log('[Research] ✅ SUCCESS (Perplexity) - Sources:', researchPackage.sources.length);

} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[Research] ❌ Perplexity FAILED: ${msg}`);
  
  await logStage(supabase, blog_id, 'research', 'perplexity', 'research-package', false, 0, { error: msg }, 0, 0, msg);
  
  // NÍVEL 2: Fallback para callResearch (Gemini com grounding)
  console.log('[Research] Attempting Gemini fallback with grounding...');
  
  try {
    const geminiResult = await callResearch({
      query: `${theme} ${primaryKeyword} ${territoryData?.official_name || ''}`.trim(),
      systemPrompt: `Pesquise informações factuais e atualizadas sobre: ${theme}. Foco em ${primaryKeyword}. Retorne fatos, tendências e fontes confiáveis.`,
      maxTokens: 2048,
    });
    
    if (!geminiResult.success || !geminiResult.data) {
      throw new Error(geminiResult.fallbackReason || 'Gemini returned no data');
    }
    
    researchPackage = {
      geo: {
        facts: geminiResult.data.facts || [],
        trends: geminiResult.data.trends || [],
        sources: geminiResult.data.sources || [],
        rawQuery: primaryKeyword,
        fetchedAt: new Date().toISOString(),
      },
      serp: { commonTerms: [], topTitles: [], contentGaps: [], averages: {} },
      sources: geminiResult.data.sources || geminiResult.data.citations || [],
      generatedAt: new Date().toISOString(),
      provider: 'gemini_fallback',
    };
    
    console.log('[Research] ✅ SUCCESS (Gemini fallback) - Sources:', researchPackage.sources.length);
    
    await logStage(supabase, blog_id, 'research', 'gemini', 'research-package', true, geminiResult.durationMs, { 
      fallback: true,
      perplexity_error: msg,
      sources_count: researchPackage.sources.length,
    });
    
  } catch (geminiError) {
    // NÍVEL 3: Ambos falharam → ABORTAR geração
    const geminiMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
    console.error('[Research] ❌ ALL RESEARCH FAILED - Aborting generation');
    console.error('[Research] Perplexity error:', msg);
    console.error('[Research] Gemini error:', geminiMsg);
    
    await logStage(supabase, blog_id, 'research', 'all', 'research-package', false, 0, { 
      perplexity_error: msg,
      gemini_error: geminiMsg,
      action: 'ABORTED',
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'RESEARCH_FAILED',
        message: 'Pesquisa web falhou (Perplexity e Gemini). Tente novamente em alguns minutos.',
        debug: {
          perplexity_error: msg,
          gemini_error: geminiMsg,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
```

---

### Etapa 3: Adicionar Import

**Arquivo:** `supabase/functions/generate-article-structured/index.ts`  
**Localização:** Seção de imports (topo do arquivo)

Verificar se `callResearch` está importado de `aiProviders.ts`:

```typescript
import { callResearch } from '../_shared/aiProviders.ts';
```

---

### Etapa 4: Deploy

Fazer deploy da edge function atualizada.

---

## Fluxo de Decisão

| Cenário | Perplexity | Gemini | Resultado |
|---------|------------|--------|-----------|
| 1 | ✅ Success | N/A | Artigo com research completo |
| 2 | ❌ Fail | ✅ Success | Artigo com research parcial (marcado) |
| 3 | ❌ Fail | ❌ Fail | **ABORTA** - Retorna erro 500 |

---

## Validação Pós-Deploy

### Logs Esperados (Sucesso Perplexity)
```
[Research] Starting web research stage...
[Research] PERPLEXITY_API_KEY exists: true
[Research] Theme: Como escolher o melhor advogado
[Research] ✅ SUCCESS (Perplexity) - Sources: 8
```

### Logs Esperados (Fallback Gemini)
```
[Research] Starting web research stage...
[Research] PERPLEXITY_API_KEY exists: true
[Research] ❌ Perplexity FAILED: API rate limit exceeded
[Research] Attempting Gemini fallback with grounding...
[Research] ✅ SUCCESS (Gemini fallback) - Sources: 3
```

### Logs Esperados (Aborto)
```
[Research] ❌ Perplexity FAILED: API key invalid
[Research] Attempting Gemini fallback with grounding...
[Research] ❌ ALL RESEARCH FAILED - Aborting generation
```

---

## Justificativa da Abordagem

1. **Qualidade Garantida**: Super Page sem research = artigo básico. Melhor abortar do que entregar qualidade inferior.

2. **Transparência**: O campo `provider` permite rastrear qual sistema gerou a pesquisa, facilitando debugging e métricas.

3. **Fail-Fast**: Se ambos os providers falharem, o erro é retornado imediatamente com detalhes úteis para debugging.

4. **Compatibilidade**: O fallback usa a função `callResearch` já existente em `aiProviders.ts`, que já tem lógica de Perplexity→Gemini.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/generate-article-structured/index.ts` | Linhas 223-228 (interface) e 1493-1536 (Stage 1) |

