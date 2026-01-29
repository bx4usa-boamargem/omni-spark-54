

# Plano de Implementação: Quality Gate + Anti-Loop + Motor Gemini Image

## Visão Geral

Este plano implementa três componentes críticos:
1. **Quality Gate** com fail-fast e zero retry
2. **JSON Parser robusto** com 2 tentativas
3. **Motor de Imagens Gemini** (imagen-3.0-generate-001) com fallback Unsplash

---

## Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST VALIDATION                        │
│  ✓ theme obrigatório                                        │
│  ✓ city obrigatório (HARD GATE - Erro 400)                 │
│  ✓ niche fallback → pest_control (com warning)             │
│  ✓ businessName fallback → "Empresa Local" (com warning)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI GENERATION                             │
│  Prompt Canônico + Contexto Específico                      │
│  Tool Call: create_article com schema strict                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    JSON PARSING (2 tentativas)              │
│  1. Parse direto                                            │
│  2. Extração de bloco JSON                                  │
│  FALHOU → ABORT (QUALITY_GATE_FAILED:invalid_json)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GEMINI IMAGE GENERATION                   │
│  API: imagen-3.0-generate-001                               │
│  Fallback: Unsplash                                         │
│  featured_image_url = primeira imagem                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    QUALITY GATE (FAIL-FAST)                 │
│  9 Validações Obrigatórias                                  │
│  Primeira falha = ABORT imediato                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PERSIST TO DATABASE                       │
│  Só se passou em TODAS as validações                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/_shared/qualityGateConfig.ts` | Configuração de thresholds por modo (entry/authority) |
| `supabase/functions/_shared/qualityGate.ts` | Função runQualityGate com fail-fast |
| `supabase/functions/_shared/jsonParser.ts` | parseArticleJSONStrict com 2 tentativas |
| `supabase/functions/_shared/geminiImageGenerator.ts` | Motor de imagens Gemini + fallback Unsplash |

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `supabase/functions/generate-article-structured/index.ts` | Integrar Quality Gate, remover UNBLOCKED mode, adicionar geração de imagens |
| `src/pages/client/ArticleGenerator.tsx` | Tratamento de erros QUALITY_GATE_FAILED |

---

## Implementação Detalhada

### PARTE 1: qualityGateConfig.ts

Thresholds exatos por modo:

**Entry Mode:**
- Palavras: 800-1200
- H2s: 5-8
- FAQs: 5-8
- Imagens: 3-5
- Introdução: 100+ chars
- Conclusão: 50+ chars
- Seção mínima: 100 chars

**Authority Mode:**
- Palavras: 1500-3000
- H2s: 8-12
- FAQs: 8-12
- Imagens: 6-10
- Introdução: 100+ chars
- Conclusão: 50+ chars
- Seção mínima: 100 chars

**Códigos de Erro:**
- `missing_city` → "Cidade é obrigatória para gerar artigo de autoridade local"
- `missing_niche` → "Nicho é obrigatório para gerar artigo"
- `invalid_json` → "Resposta da IA não é um JSON válido"
- `missing_title` → "Artigo sem título"
- `insufficient_sections` → "Artigo com estrutura incompleta"
- `invalid_sections` → "Artigo contém seções vazias ou muito curtas"
- `insufficient_faq` → "FAQ insuficiente"
- `insufficient_images` → "Imagens insuficientes"
- `missing_hero_image` → "Hero image obrigatória não encontrada"
- `insufficient_word_count` → "Artigo muito curto"
- `missing_introduction` → "Artigo sem introdução adequada"
- `missing_conclusion` → "Artigo sem conclusão"

---

### PARTE 2: qualityGate.ts

Função `runQualityGate(article, mode)` com validação FAIL-FAST:

1. **Title** - Não pode ser vazio
2. **Introduction** - Mínimo 100 caracteres
3. **Sections** - Valida JSON estruturado (não regex)
4. **Conteúdo de cada seção** - Mínimo 100 chars
5. **FAQ** - Mínimo conforme modo
6. **Image prompts** - Mínimo conforme modo
7. **Hero image** - Deve ter URL (featured_image_url ou image_prompts[0].url)
8. **Word count** - Contagem total de introduction + sections + h3s + conclusion
9. **Conclusion** - Mínimo 50 caracteres

Retorna: `{ passed, code, details, metrics }`

---

### PARTE 3: jsonParser.ts

Função `parseArticleJSONStrict(rawArgs)`:

**Tentativa 1:** Parse direto com `JSON.parse()`

**Tentativa 2:**
1. Remove markdown fences (```json)
2. Extrai primeiro bloco `{...}` com regex
3. Tenta parse

**Se falhar:** Retorna `{ success: false, error: 'JSON inválido' }`

Zero retry adicional - abort imediato.

---

### PARTE 4: geminiImageGenerator.ts

Novo motor de imagens usando **Gemini Image Generation (imagen-3.0-generate-001)**:

**Endpoint:**
`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict`

**Requisitos:**
- API Key: `GOOGLE_AI_KEY` ou `GEMINI_API_KEY`
- Aspect ratio: 16:9
- Safety filter: block_some
- Person generation: allow_adult

**Prompt Enhancement:**
O prompt é enriquecido com contexto do negócio:
- Niche (ex: pest_control)
- City (ex: São Paulo)
- Context (ex: cover, problem, solution)
- Style: "Professional business photography, high-quality, photorealistic, modern, professional lighting. No text, no watermarks."

**Fallback Unsplash:**
Se Gemini falhar (sem API key ou erro):
`https://source.unsplash.com/1024x768/?{keywords}&sig={unique}`

**Retorno:**
- `url`: data:image/png;base64,... ou URL Unsplash
- `generated_by`: 'gemini_image' | 'unsplash_fallback'

---

### PARTE 5: Integração no Pipeline Principal

Modificações em `generate-article-structured/index.ts`:

**Novos imports (início do arquivo):**
```typescript
import { runQualityGate } from '../_shared/qualityGate.ts';
import { parseArticleJSONStrict } from '../_shared/jsonParser.ts';
import { generateImageWithGemini } from '../_shared/geminiImageGenerator.ts';
import { QUALITY_GATE_CONFIG, ERROR_CODES, ERROR_MESSAGES, ArticleMode } from '../_shared/qualityGateConfig.ts';
```

**Hard Gate de Contexto (após receber request, linhas ~700-750):**
- Se `!city` → HTTP 400 com `QUALITY_GATE_FAILED:missing_city`
- Se `!niche || niche === 'default'` → fallback `pest_control` + warning log
- Se `!businessName` → fallback `"Empresa Local"` + warning log

**Após chamar IA (linhas ~1700-1750):**
1. Usar `parseArticleJSONStrict()` em vez do parser atual
2. Se falhou → HTTP 422 com `QUALITY_GATE_FAILED:invalid_json`

**Geração de Imagens (novo bloco após parse, linhas ~1890):**
```typescript
// Gerar URLs para cada image_prompt usando Gemini
for (let i = 0; i < article.image_prompts.length; i++) {
  const imgPrompt = article.image_prompts[i];
  const result = await generateImageWithGemini(
    imgPrompt.prompt,
    imgPrompt.context || 'business',
    niche,
    city
  );
  imgPrompt.url = result.url;
  imgPrompt.generated_by = result.generated_by;
}

// Garantir featured_image_url
if (!article.featured_image_url && article.image_prompts[0]) {
  article.featured_image_url = article.image_prompts[0].url;
}
```

**Quality Gate Final (antes de persistir, linhas ~1800-1850):**
1. **REMOVER** o bloco "UNBLOCKED GENERATION" (linhas 1802-1809)
2. Chamar `runQualityGate(article, mode)`
3. Se `!gateResult.passed` → HTTP 422 com código específico
4. Só persistir se passou em TUDO

**Resposta de Sucesso (linhas ~2015-2056):**
Adicionar `metrics` do Quality Gate na resposta.

---

### PARTE 6: Frontend - Tratamento de Erros

Modificações em `ArticleGenerator.tsx` (linhas ~220-250):

**Detectar QUALITY_GATE_FAILED:**
```typescript
if (error?.message?.includes('QUALITY_GATE_FAILED') || data?.error === 'QUALITY_GATE_FAILED') {
  const errorMap = {
    'missing_city': 'Cidade é obrigatória para gerar o artigo',
    'missing_niche': 'Nicho é obrigatório para gerar o artigo',
    'invalid_json': 'Erro ao processar resposta da IA. Tente novamente.',
    'missing_title': 'Artigo gerado sem título. Tente novamente.',
    'insufficient_sections': data?.details || 'Artigo com estrutura incompleta',
    'invalid_sections': data?.details || 'Artigo contém seções vazias',
    'insufficient_faq': data?.details || 'FAQ insuficiente no artigo',
    'insufficient_images': data?.details || 'Imagens insuficientes no artigo',
    'missing_hero_image': 'Hero image obrigatória não foi gerada',
    'insufficient_word_count': data?.details || 'Artigo muito curto',
    'missing_introduction': 'Artigo sem introdução adequada',
    'missing_conclusion': 'Artigo sem conclusão'
  };
  
  const errorMessage = errorMap[data?.code] || data?.message || 'Erro na geração do artigo';
  toast.error(errorMessage);
  return;
}
```

**Mostrar métricas no sucesso:**
```typescript
toast.success(`Artigo gerado! ${data.metrics?.wordCount || 0} palavras, ${data.metrics?.h2Count || 0} seções`);
```

---

## Variável de Ambiente Necessária

Para usar Gemini Image Generation, adicionar no Supabase Edge Function Secrets:

| Secret | Descrição |
|--------|-----------|
| `GOOGLE_AI_KEY` | API Key do Google AI Studio |

**Como obter:**
1. Acesse: https://aistudio.google.com/app/apikey
2. Crie ou copie sua API key
3. Adicione no Supabase: Dashboard → Edge Functions → Secrets

---

## Regras Anti-Loop

1. ✅ **Zero auto-retry**: Se a IA falhar, retorna erro ao frontend
2. ✅ **Fail-fast**: Primeira validação que falhar = abort imediato
3. ✅ **Logs detalhados**: Cada abort gera log com código específico
4. ✅ **Sem UNBLOCKED mode**: Remover o bloco que permitia salvar artigos quebrados

---

## Resultado Esperado

| Cenário | Comportamento Atual | Comportamento Novo |
|---------|--------------------|--------------------|
| Artigo sem título | Salva quebrado | ABORT: missing_title |
| Poucas seções H2 | Salva incompleto | ABORT: insufficient_sections |
| JSON inválido | Retry infinito | ABORT após 2 tentativas |
| Sem cidade | Gera sem território | ABORT: missing_city |
| Imagens sem URL | Preview quebrado | Gemini/Unsplash garantem URL |

---

## Logs Esperados (Sucesso)

```
[QualityGate] Step 1: Validating request context...
[QualityGate] ✅ Context validated: { city: "São Paulo", niche: "pest_control", businessName: "ABC" }
[QualityGate] Step 2: Parsing AI response...
[JSONParser] ✅ Direct parse successful
[QualityGate] ✅ JSON parsed successfully
[Images] Generating 1/6 with Gemini...
[GeminiImage] ✅ Image generated successfully
[Images] ✅ All 6 images have URLs
[QualityGate] Step 4: Running quality validation...
[QualityGate] ✅ PASSED - 8 H2s, 8 FAQs, 6 images, 1847 palavras
[Persist] Saving article to database...
[Success] ✅ Article generated and saved successfully
```

---

## Logs Esperados (Falha)

```
[QualityGate] Step 1: Validating request context...
[QualityGate] ❌ ABORT: Missing city
HTTP 400: { error: 'QUALITY_GATE_FAILED', code: 'missing_city' }
```

```
[QualityGate] Step 4: Running quality validation...
[QualityGate] ❌ ABORT: insufficient_sections
[QualityGate] Details: Sections: 3, mínimo: 8 (modo authority)
HTTP 422: { error: 'QUALITY_GATE_FAILED', code: 'insufficient_sections' }
```

