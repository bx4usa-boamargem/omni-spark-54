
# Plano: Templates de Super Página + Rotação Editorial Automática

## Visão Geral

Este plano implementa duas funcionalidades críticas para diversificar o conteúdo entre tenants:

1. **2 Novos Templates de Super Página** com seletor no frontend
2. **Rotação Automática de Editorial Model** nos artigos gerados via Radar/Funil

---

## PARTE 1: Novos Templates de Super Página

### Templates a Criar

| Template | Foco | Público-Alvo |
|----------|------|--------------|
| `institutional_v1` | Empresarial/Corporativo | Escritórios, empresas B2B, consultórias |
| `specialist_authority_v1` | Autoridade Pessoal | Profissionais liberais, coaches, especialistas |

### 1.1 Novos Layouts de Renderização

Criar 2 novos componentes de layout:

**InstitutionalLayout.tsx** - Estrutura corporativa:
- Hero com logo grande e tagline
- Seção "Sobre a Empresa" (história, missão, valores)
- Grid de "Áreas de Atuação"
- Seção de Cases/Resultados
- Equipe/Parceiros (opcional)
- Seção de Contato institucional
- Footer completo

**SpecialistAuthorityLayout.tsx** - Autoridade pessoal:
- Hero com foto do especialista + headline de autoridade
- Seção "Quem Sou" (bio, credenciais, formação)
- Metodologia/Framework proprietário
- Depoimentos de clientes/alunos
- Mídia/Palestras/Publicações
- CTA para consulta/mentoria
- Footer com redes sociais

### 1.2 Schemas JSON por Template

```typescript
// institutional_v1
{
  "template": "institutional_v1",
  "brand": { company_name, tagline, founded_year, city },
  "hero": { headline, subheadline, image_prompt },
  "about": { mission, vision, values: [], history },
  "services_areas": [{ title, description, icon }],
  "cases": [{ title, result, client }],
  "team": [{ name, role, photo_prompt }],
  "contact": { address, phone, email, map_embed },
  "authority_content": "..." // SEO block
}

// specialist_authority_v1
{
  "template": "specialist_authority_v1",
  "specialist": { name, title, credentials, photo_prompt },
  "hero": { headline, subheadline, tagline },
  "about": { bio, experience_years, specializations: [] },
  "methodology": { name, steps: [], unique_selling_point },
  "testimonials": [{ quote, name, context }],
  "media": [{ type, title, source }],
  "cta": { headline, description, action_text },
  "authority_content": "..."
}
```

### 1.3 Atualização da Edge Function `generate-landing-page`

Modificar `supabase/functions/generate-landing-page/index.ts`:

1. Aceitar novo parâmetro: `template_type: 'service_authority_v1' | 'institutional_v1' | 'specialist_authority_v1'`
2. Criar prompts específicos para cada template
3. Retornar estrutura JSON correspondente

```typescript
// Pseudocódigo da lógica
const TEMPLATE_PROMPTS = {
  service_authority_v1: "...", // Prompt atual
  institutional_v1: `Você é um Especialista em Páginas Institucionais...
    REGRAS:
    - Tom formal e corporativo
    - Destacar história e credibilidade da empresa
    - Focar em B2B e parcerias
    SCHEMA: { template: "institutional_v1", ... }`,
  specialist_authority_v1: `Você é um Especialista em Branding Pessoal...
    REGRAS:
    - Foco no especialista como autoridade
    - Destacar credenciais e resultados
    - Tom de confiança e expertise
    SCHEMA: { template: "specialist_authority_v1", ... }`
};
```

### 1.4 Seletor de Template no Frontend

Atualizar `src/components/client/landingpage/LandingPageEditor.tsx`:

1. Adicionar estado para template selecionado
2. Criar componente `TemplateSelector` com 3 opções visuais
3. Passar `template_type` na chamada de geração

```tsx
// Novo componente
<TemplateSelector
  value={selectedTemplate}
  onChange={setSelectedTemplate}
  options={[
    { id: 'service_authority_v1', name: 'Serviços Locais', icon: Briefcase },
    { id: 'institutional_v1', name: 'Institucional', icon: Building },
    { id: 'specialist_authority_v1', name: 'Autoridade', icon: User }
  ]}
/>
```

### 1.5 Tipos TypeScript

Atualizar `src/components/client/landingpage/types/landingPageTypes.ts`:

```typescript
export type LandingPageTemplate = 
  | 'service_authority_v1' 
  | 'institutional_v1' 
  | 'specialist_authority_v1';

// Adicionar interfaces para novos schemas
export interface InstitutionalPageData { ... }
export interface SpecialistPageData { ... }
```

---

## PARTE 2: Rotação Automática de Editorial Model

### Objetivo

Garantir que artigos gerados automaticamente (via Radar/Funil/Oportunidades) alternem entre os 3 modelos editoriais para evitar uniformidade:

- `traditional` - Artigo Clássico (SEO & Autoridade)
- `strategic` - Artigo de Impacto (Conversão & Persuasão)
- `visual_guided` - Artigo Visual (Mobile-first)

### 2.1 Criar Módulo `editorialRotation.ts`

Novo arquivo: `supabase/functions/_shared/editorialRotation.ts`

```typescript
export type EditorialModel = 'traditional' | 'strategic' | 'visual_guided';

// Ordem de rotação
const EDITORIAL_ROTATION: EditorialModel[] = [
  'traditional',
  'strategic', 
  'visual_guided'
];

// Mapeamento de nicho para modelo preferencial
const NICHE_PREFERRED_MODEL: Record<string, EditorialModel> = {
  'advocacia': 'traditional',     // Formal
  'saude': 'traditional',         // Técnico
  'tecnologia': 'strategic',      // Conversão
  'estetica': 'visual_guided',    // Visual
  'alimentacao': 'visual_guided', // Visual
  'construcao': 'strategic',      // Prático
  // ... outros nichos
};

/**
 * Busca último editorial_model usado pelo blog
 */
export async function getLastEditorialModel(
  supabase: any, 
  blogId: string
): Promise<EditorialModel | null>;

/**
 * Calcula próximo modelo na rotação
 */
export function calculateNextEditorialModel(
  lastModel: EditorialModel | null,
  niche?: string
): EditorialModel;

/**
 * Obtém próximo modelo considerando:
 * 1. Histórico do blog (evita repetição)
 * 2. Preferência do nicho (peso inicial)
 */
export async function getNextEditorialModel(
  supabase: any,
  blogId: string,
  niche?: string
): Promise<EditorialModel>;
```

### 2.2 Lógica de Rotação Inteligente

A rotação considera:

1. **Histórico do Blog**: Evita repetir o mesmo modelo 3x seguidas
2. **Preferência de Nicho**: Peso inicial baseado no perfil de negócio
3. **Balanceamento**: Mantém distribuição equilibrada a longo prazo

```typescript
// Exemplo de lógica
async function getNextEditorialModel(supabase, blogId, niche) {
  // 1. Buscar últimos 3 artigos
  const recentModels = await getRecentEditorialModels(supabase, blogId, 3);
  
  // 2. Se todos iguais, forçar rotação
  if (allSame(recentModels)) {
    return rotateToNext(recentModels[0]);
  }
  
  // 3. Verificar distribuição geral
  const distribution = await getEditorialDistribution(supabase, blogId);
  
  // 4. Preferir modelo menos usado
  const leastUsed = findLeastUsed(distribution);
  
  // 5. Considerar preferência do nicho
  const nichePreferred = NICHE_PREFERRED_MODEL[niche] || 'traditional';
  
  // 6. Combinar fatores
  return weightedSelection(leastUsed, nichePreferred, recentModels);
}
```

### 2.3 Integrar no `convert-opportunity-to-article`

Modificar `supabase/functions/convert-opportunity-to-article/index.ts`:

```typescript
// Antes da chamada a generate-article-structured
import { getNextEditorialModel } from '../_shared/editorialRotation.ts';

// ...

// 3b. ROTAÇÃO EDITORIAL - Determinar próximo modelo
const editorialModel = await getNextEditorialModel(
  supabase,
  blogId,
  profile?.niche
);

console.log(`[CONVERT] Editorial rotation: model=${editorialModel}`);

// Na chamada de geração
body: JSON.stringify({
  // ... outros parâmetros
  editorial_model: editorialModel, // NOVO
  article_structure_type: structureType,
  // ...
})
```

### 2.4 Integrar no Gerador de Artigos via Radar

Atualizar `src/utils/streamArticle.ts` para permitir override:

```typescript
// Quando source é 'opportunity' ou 'radar', usar rotação automática
if (options.source === 'opportunity' || options.source === 'radar') {
  // Backend já calcula via getNextEditorialModel
  editorialModel = undefined; // Deixar backend decidir
}
```

### 2.5 Persistir no Artigo

Garantir que `editorial_model` seja salvo na tabela `articles` para rastreamento:

```sql
-- Se a coluna não existir
ALTER TABLE articles ADD COLUMN IF NOT EXISTS editorial_model TEXT;
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/client/landingpage/layouts/InstitutionalLayout.tsx` | Layout institucional |
| `src/components/client/landingpage/layouts/SpecialistAuthorityLayout.tsx` | Layout autoridade pessoal |
| `src/components/client/landingpage/TemplateSelector.tsx` | Seletor visual de template |
| `supabase/functions/_shared/editorialRotation.ts` | Módulo de rotação editorial |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-landing-page/index.ts` | Aceitar `template_type`, prompts por template |
| `src/components/client/landingpage/LandingPageEditor.tsx` | Integrar seletor de template |
| `src/components/client/landingpage/types/landingPageTypes.ts` | Novos tipos |
| `supabase/functions/convert-opportunity-to-article/index.ts` | Usar `getNextEditorialModel` |
| `src/pages/PublicLandingPage.tsx` | Renderizar novos templates |

---

## Resultado Esperado

### Super Páginas
- 3 templates visuais distintos selecionáveis no editor
- Cada template gera conteúdo com estrutura única
- Empresas diferentes = páginas diferentes

### Artigos
- Rotação automática entre traditional, strategic e visual_guided
- Consideração do nicho para preferência inicial
- Distribuição equilibrada ao longo do tempo
- Nenhum artigo consecutivo com mesmo estilo editorial

---

## Diagrama de Fluxo - Rotação Editorial

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ROTAÇÃO EDITORIAL AUTOMÁTICA                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Oportunidade/Radar → convert-opportunity-to-article               │
│          ↓                                                          │
│   ┌──────────────────────────────────────────────┐                 │
│   │ getNextEditorialModel(blogId, niche)         │                 │
│   │   1. Buscar últimos 3 artigos                │                 │
│   │   2. Verificar se todos iguais → forçar rot. │                 │
│   │   3. Calcular distribuição geral             │                 │
│   │   4. Considerar preferência do nicho         │                 │
│   │   5. Retornar modelo balanceado              │                 │
│   └──────────────────────────────────────────────┘                 │
│          ↓                                                          │
│   editorial_model = 'strategic' (exemplo)                           │
│          ↓                                                          │
│   generate-article-structured (com modelo definido)                 │
│          ↓                                                          │
│   Artigo gerado com estilo visual distinto                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```
