
# Plano: Super Páginas - Grid de Cards + SEO Completo

## Visão Geral

Este plano implementa duas melhorias críticas no módulo de Super Páginas:

1. **Grid de Cards com Preview** - Transformar a listagem atual (lista simples) em um grid visual similar aos Artigos
2. **Painel SEO Completo no Editor** - Adicionar sidebar de SEO com velocímetro, métricas e auto-correção

---

## PARTE 1: Grid de Cards com Preview

### Arquitetura Atual vs. Proposta

| Atual | Proposto |
|-------|----------|
| Lista vertical simples | Grid responsivo (4/3/2/1 colunas) |
| Apenas título + badge | Card com thumbnail, título, data, status, ações |
| Sem filtros | Filtros por status + busca por título |
| Botão "Editar" único | Menu dropdown com duplicar/arquivar/deletar |

### Componentes a Criar

#### 1.1 LandingPageCard.tsx

Novo componente de card visual:

```
┌────────────────────────────────┐
│ ┌────────────────────────────┐ │
│ │                            │ │
│ │      THUMBNAIL/PREVIEW     │ │  ← Imagem hero ou placeholder
│ │                            │ │
│ └────────────────────────────┘ │
│                                │
│ Título da Super Página         │  ← Truncado em 2 linhas
│ Serviços locais • Teresina     │  ← Template + cidade
│                                │
│ ┌──────┐        12 jan 2025    │  ← Badge status + data
│ │ Pub. │                       │
│ └──────┘                       │
│                                │
│ [Abrir] [Editar] [...]         │  ← Ações
└────────────────────────────────┘
```

**Dados exibidos:**
- `featured_image_url` ou `page_data.hero.background_image_url` como thumbnail
- Fallback: placeholder colorido com inicial do título
- Badge de status: Publicada (verde), Rascunho (cinza), Arquivada (amarelo)
- Data de criação formatada
- Template type como subtítulo

**Menu de ações (dropdown ...):**
- Duplicar
- Arquivar/Desarquivar
- Excluir (com confirmação)

#### 1.2 LandingPageFilters.tsx

Barra de filtros no topo:

```
┌─────────────────────────────────────────────────────────────┐
│ [Todas ▼] [Publicadas] [Rascunho] [Arquivadas]   🔍 Buscar  │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Tabs ou select para status: `all | published | draft | archived`
- Input de busca filtrando por título (client-side)
- Ordenação implícita: mais recente primeiro

### 1.3 Modificações no ClientLandingPages.tsx

Substituir a div `grid gap-4` atual por:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {filteredPages.map((page) => (
    <LandingPageCard
      key={page.id}
      page={page}
      publicBaseUrl={publicBaseUrl}
      onEdit={() => navigate(`/client/landing-pages/${page.id}`)}
      onDuplicate={() => handleDuplicate(page.id)}
      onArchive={() => handleArchive(page.id)}
      onDelete={() => handleDelete(page.id)}
    />
  ))}
</div>
```

### 1.4 Thumbnail/Preview Strategy

**Ordem de prioridade para thumbnail:**
1. `featured_image_url` (se existir no banco)
2. `page_data.hero.background_image_url` (imagem do hero)
3. Placeholder elegante com:
   - Cor baseada no `template_type`
   - Inicial do título grande
   - Gradiente sutil

### 1.5 Hook useLandingPages - Novas Funções

Adicionar ao hook existente:

```typescript
duplicatePage: (id: string) => Promise<LandingPage | null>;
archivePage: (id: string) => Promise<boolean>;
unarchivePage: (id: string) => Promise<boolean>;
```

---

## PARTE 2: Painel SEO no Editor

### Arquitetura do SEO para Landing Pages

Reaproveitar o motor de SEO existente dos artigos, adaptando para a estrutura de Super Páginas.

### 2.1 Schema de Banco - Novas Colunas

A tabela `landing_pages` precisa de colunas para armazenar o snapshot SEO:

```sql
ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS seo_score INTEGER,
ADD COLUMN IF NOT EXISTS seo_metrics JSONB,
ADD COLUMN IF NOT EXISTS seo_recommendations JSONB,
ADD COLUMN IF NOT EXISTS seo_analyzed_at TIMESTAMPTZ;
```

**Estrutura de `seo_metrics`:**
```json
{
  "breakdown": {
    "title_points": 15,
    "meta_points": 12,
    "keywords_points": 15,
    "content_points": 18,
    "density_points": 15,
    "image_points": 15
  },
  "diagnostics": {
    "title_length": 58,
    "meta_length": 145,
    "word_count": 1800,
    "density": { "dedetização": 1.2, "pragas": 0.8 },
    "missing": []
  },
  "serp_benchmark": {
    "avg_words_niche": 1500,
    "competitors_analyzed": 10,
    "semantic_coverage": 78
  }
}
```

**Estrutura de `seo_recommendations`:**
```json
[
  {
    "type": "title",
    "severity": "warning",
    "message": "Título poderia ter entre 50-60 caracteres",
    "auto_fixable": true
  },
  {
    "type": "content",
    "severity": "info",
    "message": "Adicione mais 200 palavras para score máximo",
    "auto_fixable": true
  }
]
```

### 2.2 Componente LandingPageSEOPanel.tsx

Sidebar de SEO similar ao `SEOScoreAnalyzer`, adaptado para Landing Pages:

```
┌─────────────────────────────────┐
│  SEO Score                      │
│  ┌───────────────────────┐      │
│  │        78             │      │  ← Velocímetro animado
│  │       Bom             │      │
│  └───────────────────────┘      │
│                                 │
│ ───────────────────────────     │
│  📊 SERP do Nicho               │
│  • Média palavras: 1.500        │
│  • Concorrentes: 10             │
│  • Cobertura: 78%               │
│                                 │
│ ───────────────────────────     │
│  📐 Estrutura                   │
│  ✓ Título: 58 chars (ideal)     │
│  ⚠ Meta: 145 chars (-15)        │
│  ✓ Palavras: 1.800              │
│  ✓ Imagens: 6                   │
│  ⚠ H2s: 4 (recomendado 6+)      │
│                                 │
│ ───────────────────────────     │
│  🔤 Densidade de Keywords       │
│  • dedetização: 1.2% ✓          │
│  • pragas: 0.8% ⚠               │
│                                 │
│ ───────────────────────────     │
│  💡 Recomendações               │
│  • Expandir meta description    │
│  • Adicionar mais H2s           │
│                                 │
│ [⚡ Corrigir automaticamente]   │
│ [🔄 Reanalisar]                 │
└─────────────────────────────────┘
```

**Props esperadas:**
```typescript
interface LandingPageSEOPanelProps {
  pageId: string;
  pageData: LandingPageData;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  seoScore?: number;
  seoMetrics?: any;
  seoRecommendations?: any[];
  seoAnalyzedAt?: string;
  onReanalyze: () => Promise<void>;
  onAutoFix: () => Promise<void>;
  isAnalyzing?: boolean;
  isFixing?: boolean;
}
```

### 2.3 Extração de Conteúdo para Análise SEO

Landing Pages têm estrutura diferente de artigos. O conteúdo a analisar inclui:

```typescript
function extractLandingPageContent(pageData: LandingPageData): string {
  const parts: string[] = [];
  
  // Hero
  if (pageData.hero) {
    parts.push(pageData.hero.title || '');
    parts.push(pageData.hero.subtitle || '');
  }
  
  // Services
  pageData.services?.forEach(s => {
    parts.push(s.title || '');
    parts.push(s.description || '');
  });
  
  // Service Details
  pageData.service_details?.forEach(d => {
    parts.push(d.title || '');
    parts.push(d.content || '');
    d.bullets?.forEach(b => parts.push(b));
  });
  
  // Why Choose Us
  pageData.why_choose_us?.forEach(w => {
    parts.push(w.title || '');
    parts.push(w.description || '');
  });
  
  // FAQ
  pageData.faq?.forEach(f => {
    parts.push(f.question || '');
    parts.push(f.answer || '');
  });
  
  // Authority Content (SEO block)
  if (pageData.authority_content) {
    parts.push(pageData.authority_content);
  }
  
  return parts.join(' ');
}
```

### 2.4 Edge Function: analyze-landing-page-seo

Nova Edge Function para análise SEO de Landing Pages:

```typescript
// supabase/functions/analyze-landing-page-seo/index.ts

interface AnalyzeLandingPageSEORequest {
  landing_page_id: string;
  include_serp?: boolean; // Se deve buscar dados SERP
}

// Retorno
{
  success: true,
  score_total: 78,
  breakdown: { ... },
  diagnostics: { ... },
  recommendations: [ ... ],
  serp_benchmark: { ... } // Se include_serp=true
}
```

**Lógica:**
1. Buscar `landing_pages` pelo ID
2. Extrair conteúdo textual usando `extractLandingPageContent`
3. Usar `computeSeoScore` do módulo compartilhado
4. Gerar recomendações baseadas no breakdown
5. Opcionalmente, buscar dados SERP do cache (`serp_analysis_cache`)
6. Salvar snapshot no banco

### 2.5 Edge Function: fix-landing-page-seo

Nova Edge Function para auto-correção:

```typescript
// supabase/functions/fix-landing-page-seo/index.ts

interface FixLandingPageSEORequest {
  landing_page_id: string;
  fix_types?: ('title' | 'meta' | 'content' | 'keywords')[];
}
```

**Lógica:**
1. Buscar página e business_profile
2. Usar IA (Gemini) para melhorar cada campo solicitado
3. Atualizar `page_data` e campos SEO
4. Recalcular score
5. Retornar nova versão

### 2.6 Integração no LandingPageEditor

Adicionar nova tab "SEO" no painel lateral esquerdo:

```tsx
<TabsList className="w-full rounded-none border-b">
  <TabsTrigger value="preview">Preview</TabsTrigger>
  <TabsTrigger value="settings">Config</TabsTrigger>
  <TabsTrigger value="seo">SEO</TabsTrigger>  {/* NOVO */}
</TabsList>

<TabsContent value="seo">
  <LandingPageSEOPanel
    pageId={page?.id}
    pageData={pageData}
    seoTitle={seoTitle}
    seoDescription={seoDescription}
    seoKeywords={seoKeywords}
    seoScore={page?.seo_score}
    seoMetrics={page?.seo_metrics}
    seoRecommendations={page?.seo_recommendations}
    seoAnalyzedAt={page?.seo_analyzed_at}
    onReanalyze={handleReanalyze}
    onAutoFix={handleAutoFix}
    isAnalyzing={isAnalyzing}
    isFixing={isFixing}
  />
</TabsContent>
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/client/landingpage/LandingPageCard.tsx` | Card visual para o grid |
| `src/components/client/landingpage/LandingPageFilters.tsx` | Barra de filtros |
| `src/components/client/landingpage/LandingPageSEOPanel.tsx` | Sidebar SEO completa |
| `supabase/functions/analyze-landing-page-seo/index.ts` | Análise SEO de LP |
| `supabase/functions/fix-landing-page-seo/index.ts` | Auto-correção SEO |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/client/ClientLandingPages.tsx` | Grid de cards + filtros |
| `src/components/client/landingpage/LandingPageEditor.tsx` | Tab SEO + handlers |
| `src/components/client/landingpage/hooks/useLandingPages.ts` | Duplicate, archive functions |
| `src/components/client/landingpage/types/landingPageTypes.ts` | Tipos SEO |
| `supabase/config.toml` | Novas Edge Functions |

## Migração de Banco

```sql
-- Adicionar colunas de SEO snapshot
ALTER TABLE landing_pages 
ADD COLUMN IF NOT EXISTS seo_score INTEGER,
ADD COLUMN IF NOT EXISTS seo_metrics JSONB,
ADD COLUMN IF NOT EXISTS seo_recommendations JSONB,
ADD COLUMN IF NOT EXISTS seo_analyzed_at TIMESTAMPTZ;

-- Índice para ordenação por score
CREATE INDEX IF NOT EXISTS idx_landing_pages_seo_score 
ON landing_pages(seo_score DESC NULLS LAST);
```

---

## Fluxo de Análise SEO

```text
┌────────────────────────────────────────────────────────────────────┐
│                     FLUXO SEO - LANDING PAGE                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [Usuário abre editor]                                             │
│         ↓                                                          │
│  ┌──────────────────────────────────────────────┐                 │
│  │ Verificar seo_analyzed_at                    │                 │
│  │ → Se existe e < 24h: mostrar cache           │                 │
│  │ → Se não: mostrar "Reanalisar"               │                 │
│  └──────────────────────────────────────────────┘                 │
│         ↓                                                          │
│  [Usuário clica "Reanalisar"]                                      │
│         ↓                                                          │
│  analyze-landing-page-seo                                          │
│  → Extrai conteúdo textual de page_data                            │
│  → Calcula score via computeSeoScore                               │
│  → Gera recomendações                                              │
│  → Busca SERP benchmark (se disponível)                            │
│  → Salva snapshot no banco                                         │
│         ↓                                                          │
│  [Atualiza UI com novo score + métricas]                           │
│                                                                    │
│  [Usuário clica "Corrigir automaticamente"]                        │
│         ↓                                                          │
│  fix-landing-page-seo                                              │
│  → IA melhora título, meta, content                                │
│  → Atualiza page_data                                              │
│  → Recalcula score                                                 │
│  → Retorna delta de melhoria                                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Definition of Done

| Critério | Implementação |
|----------|---------------|
| Grid de cards responsivo | 4/3/2/1 colunas por breakpoint |
| Thumbnail em cada card | Imagem hero ou placeholder colorido |
| Filtros por status | Tabs: Todas/Publicadas/Rascunho/Arquivadas |
| Busca por título | Input com debounce client-side |
| Menu dropdown com ações | Duplicar, Arquivar, Excluir |
| Tab SEO no editor | Nova aba com painel completo |
| Velocímetro de score | Componente SEOScoreGauge reutilizado |
| Métricas SERP/benchmark | Exibir se disponível no cache |
| Estrutura (palavras, H2, imagens) | Indicadores visuais de status |
| Densidade de keywords | Lista com % e status |
| Recomendações | Lista de sugestões acionáveis |
| Botão "Corrigir automaticamente" | Chama fix-landing-page-seo |
| Botão "Reanalisar" | Chama analyze-landing-page-seo |
| SEO persistido | Colunas seo_score, seo_metrics, etc. |
| Score carrega rápido | Cache/snapshot evita recálculo constante |

---

## Resultado Final

### Tela Super Páginas
- Grid visual moderno com thumbnails
- Filtros intuitivos por status
- Busca rápida por título
- Ações rápidas via menu dropdown
- UX consistente com tela de Artigos

### Editor de Super Página
- Nova tab SEO no painel lateral
- Velocímetro animado com score 0-100
- Métricas detalhadas de estrutura
- Benchmark SERP do nicho (quando disponível)
- Auto-correção com IA
- Reanálise manual sob demanda
- Cache de análise para performance
