
# Plano: Super Página com Motor SEO Completo

## Problema Identificado

A Super Página está operando como um layout estático sem inteligência SEO real:

| Componente | Estado Atual | Estado Esperado |
|------------|--------------|-----------------|
| SEO Score | Calculado, mas não aciona ações | Score governa otimizações |
| "Corrigir automaticamente" | Apenas ajusta título/meta | Expande texto, insere imagens, injeta keywords |
| "Regenerar Página" | Recarrega edge function básica | Reconstrói todos os blocos via IA |
| Campos SEO | Vazios na criação | Auto-preenchidos com padrão de artigos |
| Foto do Especialista | Placeholder estático | Imagem gerada ou placeholder inteligente |
| Blocos default | Todos desligados às vezes | Lógica editorial por template |

---

## Arquitetura da Solução

### 1. Auto-preenchimento de Campos SEO na Geração

**Arquivo**: `supabase/functions/generate-landing-page/index.ts`

Atualizar a edge function para gerar automaticamente:

```typescript
// Após gerar pageData, adicionar campos SEO
const seoTitle = buildSeoTitle(pageData, company_name, niche, city);
const seoDescription = buildSeoDescription(pageData, niche, city);
const seoKeywords = extractKeywords(pageData, niche, services);
const slug = buildSlug(pageData.hero?.headline || company_name, niche, city);

return {
  success: true,
  page_data: pageData,
  seo_title: seoTitle,
  seo_description: seoDescription,
  seo_keywords: seoKeywords,
  slug: slug
};
```

Funções auxiliares:
- `buildSeoTitle()`: Gera título SEO de 50-60 caracteres
- `buildSeoDescription()`: Gera meta description de 140-160 caracteres
- `extractKeywords()`: Extrai 5-7 keywords do conteúdo gerado
- `buildSlug()`: Gera slug SEO-friendly baseado no headline

**Arquivo**: `src/components/client/landingpage/hooks/useLandingPages.ts`

Atualizar `generatePage` para usar os campos retornados:

```typescript
const insertPayload = {
  // ... existing fields
  seo_title: data.seo_title || pageData.hero?.headline || "Super Página",
  seo_description: data.seo_description || "",
  seo_keywords: data.seo_keywords || [],
  slug: data.slug || finalSlug
};
```

---

### 2. Motor de Auto-Fix Completo

**Arquivo**: `supabase/functions/fix-landing-page-seo/index.ts`

Refatorar para incluir todas as correções:

```typescript
interface FixRequest {
  landing_page_id: string;
  fix_types?: ("title" | "meta" | "content" | "keywords" | "images" | "structure")[];
}

// Adicionar novas funções:
async function expandContent(pageData: any, diagnostics: any, targetWords: number): Promise<any> {
  // Usa IA para expandir blocos de texto até atingir meta de palavras
  // Prioriza: authority_content, service_details, faq
}

async function injectKeywords(pageData: any, keywords: string[], diagnostics: any): Promise<any> {
  // Injeta keywords naturalmente nos textos existentes
  // Evita keyword stuffing (densidade 0.5%-2.5%)
}

async function adjustStructure(pageData: any, diagnostics: any): Promise<any> {
  // Adiciona H2s se faltando
  // Reorganiza blocos para melhor flow
}

async function generateMissingImages(pageData: any, profile: any): Promise<any> {
  // Gera imagens faltantes via generate-image
  // Prioriza: hero, specialist.photo, service_details
}
```

Novo prompt de otimização (similar ao `boost-content-score`):

```typescript
const optimizePrompt = `Você é um editor SEO de PRECISÃO CIRÚRGICA para landing pages.

## REGRA ABSOLUTA
Você APENAS:
1. EXPANDE textos fracos com +200-300 palavras SE abaixo de ${targetWords}
2. INSERE keywords "${keywords.join(', ')}" naturalmente
3. ADICIONA seções H2 SE faltando
4. MELHORA CTAs SE fracos

## CONTEÚDO ATUAL
${extractedContent}

## MÉTRICAS
- Palavras atuais: ${diagnostics.word_count}
- Meta: ${targetWords}
- Keywords faltantes: ${keywords.filter(k => !contentHas(k)).join(', ')}

## RESPOSTA
Retorne JSON com os blocos atualizados:
{
  "hero": { ... },
  "service_details": [ ... ],
  "authority_content": "...",
  "faq": [ ... ]
}`;
```

---

### 3. Regeneração Real de Página

**Arquivo**: `src/components/client/landingpage/hooks/useLandingPages.ts`

Adicionar função `regeneratePage`:

```typescript
const regeneratePage = useCallback(async (pageId: string): Promise<LandingPageData | null> => {
  // 1. Buscar página existente para contexto
  const { data: existingPage } = await supabase
    .from("landing_pages")
    .select("*, blogs(niche_profile_id)")
    .eq("id", pageId)
    .single();

  // 2. Buscar business profile
  const { data: profile } = await supabase
    .from("business_profile")
    .select("*")
    .eq("blog_id", existingPage.blog_id)
    .single();

  // 3. Chamar generate-landing-page com template atual
  const { data, error } = await supabase.functions.invoke("generate-landing-page", {
    body: {
      blog_id: existingPage.blog_id,
      company_name: profile?.company_name,
      niche: profile?.niche,
      city: profile?.city,
      services: profile?.services?.split(','),
      template_type: existingPage.page_data?.template || "service_authority_v1"
    }
  });

  // 4. Atualizar página existente com novo conteúdo
  if (data?.page_data) {
    await supabase.from("landing_pages").update({
      page_data: data.page_data,
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      seo_keywords: data.seo_keywords,
      updated_at: new Date().toISOString()
    }).eq("id", pageId);

    // 5. Re-analisar SEO
    await supabase.functions.invoke("analyze-landing-page-seo", {
      body: { landing_page_id: pageId }
    });
  }

  return data?.page_data;
}, []);
```

**Arquivo**: `src/components/client/landingpage/LandingPageEditor.tsx`

Atualizar botão "Regenerar Página":

```tsx
const handleRegenerate = async () => {
  if (!page?.id) return;
  
  setGenerating(true);
  try {
    const result = await regeneratePage(page.id);
    if (result) {
      await loadPage(); // Recarregar dados atualizados
      toast.success("Página regenerada com sucesso!");
    }
  } finally {
    setGenerating(false);
  }
};
```

---

### 4. Foto do Especialista Automática

**Arquivo**: `supabase/functions/generate-landing-page/index.ts`

Adicionar geração de imagem no prompt do template:

```typescript
specialist_authority_v1: (company, niche, city, services) => `...
IMPORTANTE para "specialist":
- photo_prompt: Prompt fotorrealista para retrato profissional
- photo_url: Deixar null (será gerado depois)

{
  "specialist": { 
    "name": "${company}",
    "title": "Especialista em ${niche}",
    "credentials": "...",
    "photo_prompt": "Professional portrait photography of ${niche} consultant, business attire, confident smile, studio lighting, neutral background, 8k quality, photorealistic",
    "photo_url": null
  },
  ...
}`;
```

**Arquivo**: `src/components/client/landingpage/hooks/useLandingPages.ts`

No `publishPage`, adicionar resolução da foto do especialista:

```typescript
// Resolve Specialist Photo (se template specialist_authority_v1)
if (nextData.specialist?.photo_prompt && !nextData.specialist?.photo_url) {
  const specialistUrl = await generateLandingPageImage({
    prompt: nextData.specialist.photo_prompt,
    context: "specialist_photo",
    pageTitle,
    userId: user?.id,
    blogId,
    fileName: `lp-${id}-specialist-${Date.now()}.png`,
  });

  if (specialistUrl) {
    nextData.specialist = { ...nextData.specialist, photo_url: specialistUrl };
    mutated = true;
  }
}
```

**Arquivo**: `src/components/client/landingpage/layouts/SpecialistAuthorityLayout.tsx`

Atualizar para exibir a foto gerada ou placeholder inteligente:

```tsx
{/* Right: Photo */}
<div className="hidden lg:flex justify-center">
  {specialist.photo_url ? (
    <img 
      src={specialist.photo_url}
      alt={specialist.name || "Especialista"}
      className="w-80 h-96 rounded-2xl object-cover shadow-2xl"
    />
  ) : (
    <div 
      className="w-80 h-96 rounded-2xl flex items-center justify-center shadow-2xl"
      style={{ 
        background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}40)`,
        border: `2px solid ${primaryColor}30`
      }}
    >
      <div className="text-center">
        <div 
          className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-4xl font-black"
          style={{ backgroundColor: primaryColor, color: 'white' }}
        >
          {(specialist.name || "E").charAt(0).toUpperCase()}
        </div>
        <p className="text-sm mt-4 font-medium" style={{ color: primaryColor }}>
          {specialist.title || "Especialista"}
        </p>
      </div>
    </div>
  )}
</div>
```

---

### 5. Lógica de Blocos Default por Template

**Arquivo**: `src/components/client/landingpage/types/landingPageTypes.ts`

Adicionar configuração por template:

```typescript
export const TEMPLATE_DEFAULT_VISIBILITY: Record<LandingPageTemplateType, BlockVisibility> = {
  service_authority_v1: {
    hero: true,
    services: true,
    service_details: true,
    emergency_banner: true,
    materials: false,
    process_steps: true,
    why_choose_us: true,
    testimonials: true,
    areas_served: true,
    faq: true,
    contact: true,
    cta_banner: true,
  },
  institutional_v1: {
    hero: true,
    services: true,  // services_areas no institutional
    service_details: false,
    emergency_banner: false,
    materials: false,
    process_steps: false,
    why_choose_us: false,
    testimonials: true,  // cases
    areas_served: false,
    faq: false,
    contact: true,
    cta_banner: true,
  },
  specialist_authority_v1: {
    hero: true,
    services: false,
    service_details: false,
    emergency_banner: false,
    materials: false,
    process_steps: true,  // methodology
    why_choose_us: false,
    testimonials: true,
    areas_served: false,
    faq: false,
    contact: true,
    cta_banner: true,
  }
};
```

**Arquivo**: `src/components/client/landingpage/LandingPageEditor.tsx`

Aplicar visibilidade baseada no template:

```typescript
// No loadPage(), após carregar os dados
if (!landingPage.page_data?.meta?.block_visibility) {
  const template = landingPage.page_data?.template || 'service_authority_v1';
  const templateVisibility = TEMPLATE_DEFAULT_VISIBILITY[template as LandingPageTemplateType];
  setVisibility({
    ...DEFAULT_BLOCK_VISIBILITY,
    ...templateVisibility
  });
}
```

---

### 6. Atualização do Painel SEO

**Arquivo**: `src/components/client/landingpage/LandingPageSEOPanel.tsx`

Adicionar botão "Regenerar Página" e melhorar feedback:

```tsx
{/* Action Buttons */}
<div className="flex flex-col gap-2 mt-4 w-full">
  <Button 
    variant="outline" 
    size="sm" 
    className="w-full"
    onClick={onReanalyze}
    disabled={isAnalyzing || !pageId}
  >
    {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
    {hasScore ? "Reanalisar" : "Analisar"}
  </Button>
  
  {recommendations.some(r => r.auto_fixable) && (
    <Button 
      className="w-full"
      onClick={onAutoFix}
      disabled={isFixing || !pageId}
    >
      {isFixing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
      Corrigir automaticamente
    </Button>
  )}

  <Button 
    variant="outline"
    className="w-full"
    onClick={onRegenerate}
    disabled={isRegenerating || !pageId}
  >
    {isRegenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
    Regenerar Página
  </Button>
</div>
```

---

## Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/generate-landing-page/index.ts` | Modificar | Auto-preencher SEO + photo_prompt |
| `supabase/functions/fix-landing-page-seo/index.ts` | Modificar | Motor de auto-fix completo |
| `src/components/client/landingpage/hooks/useLandingPages.ts` | Modificar | Adicionar regeneratePage + usar SEO retornado |
| `src/components/client/landingpage/LandingPageEditor.tsx` | Modificar | Handler para regenerar + visibility por template |
| `src/components/client/landingpage/LandingPageSEOPanel.tsx` | Modificar | Botão regenerar + feedback melhorado |
| `src/components/client/landingpage/layouts/SpecialistAuthorityLayout.tsx` | Modificar | Placeholder inteligente para foto |
| `src/components/client/landingpage/types/landingPageTypes.ts` | Modificar | TEMPLATE_DEFAULT_VISIBILITY |

---

## Fluxo de Otimização

```text
┌────────────────────────────────────────────────────────────────────┐
│              FLUXO DE OTIMIZAÇÃO DE SUPER PÁGINA                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. GERAÇÃO                                                        │
│     generate-landing-page                                          │
│         ↓                                                          │
│     Gera pageData + seo_title + seo_description + seo_keywords     │
│         ↓                                                          │
│     Salva com campos SEO preenchidos                               │
│         ↓                                                          │
│     Dispara analyze-landing-page-seo automaticamente               │
│                                                                    │
│  2. ANÁLISE                                                        │
│     analyze-landing-page-seo                                       │
│         ↓                                                          │
│     Extrai conteúdo de todos os blocos                             │
│         ↓                                                          │
│     Calcula score (0-100) com breakdown                            │
│         ↓                                                          │
│     Gera recomendações (title, meta, content, images, density)     │
│                                                                    │
│  3. AUTO-FIX                                                       │
│     fix-landing-page-seo                                           │
│         ↓                                                          │
│     Expande textos (authority_content, service_details, faq)       │
│         ↓                                                          │
│     Injeta keywords naturalmente                                   │
│         ↓                                                          │
│     Ajusta título/meta para tamanho ideal                          │
│         ↓                                                          │
│     Gera imagens faltantes (hero, specialist, services)            │
│         ↓                                                          │
│     Re-analisa SEO → Score aumenta                                 │
│                                                                    │
│  4. REGENERAÇÃO                                                    │
│     regeneratePage()                                               │
│         ↓                                                          │
│     Chama generate-landing-page com contexto atual                 │
│         ↓                                                          │
│     Substitui page_data mantendo ID                                │
│         ↓                                                          │
│     Re-analisa SEO                                                 │
│                                                                    │
│  5. PUBLICAÇÃO                                                     │
│     publishPage()                                                  │
│         ↓                                                          │
│     Resolve imagens faltantes (hero, specialist, services)         │
│         ↓                                                          │
│     Publica com score SEO validado                                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

Após a implementação:

1. **Campos SEO auto-preenchidos**: Título, Meta, Keywords e Slug gerados automaticamente na criação
2. **Auto-fix funcional**: Expande texto, injeta keywords, gera imagens, ajusta estrutura
3. **Regeneração real**: Reconstrói todos os blocos via IA mantendo o ID da página
4. **Foto do especialista**: Gerada automaticamente ou placeholder com inicial + cor primária
5. **Blocos default por template**: Cada template tem sua configuração editorial padrão
6. **Score governante**: SEO Score reflete o conteúdo real e governa as otimizações

A Super Página se comportará como:
**"Um artigo estratégico orientado à conversão, governado por SEO em tempo real"**
