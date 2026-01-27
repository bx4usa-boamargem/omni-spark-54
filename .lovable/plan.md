
# Plano: Reestruturação Completa do Dashboard e Sidebar da Omniseen

## Visão Geral

Reestruturar completamente o Dashboard (Painel) e o Sidebar da subconta para seguir o modelo estrutural do concorrente SEOwriting, mantendo 100% da identidade visual Omniseen (cores, tipografia, efeitos hover, ícones).

**Escopo CONGELADO (não será modificado):**
- Geração de imagens
- Edição de imagens
- Pipelines de IA
- Edge functions
- Super Página Pro

---

## Parte 1: Sidebar (SubAccountLayout)

### Alterações Necessárias

**Arquivo:** `src/components/layout/SubAccountLayout.tsx`

| Item Atual | Ação | Novo Comportamento |
|------------|------|-------------------|
| Dashboard no sidebar (admin) | **Remover** | Logo clicável leva ao Dashboard |
| Estrutura MVP_NAV_SECTIONS | **Manter** | Já está correta |
| Logo OmniseenLogo | **Modificar** | Adicionar onClick para /client/dashboard |

### Estrutura Final do Sidebar (MVP)

```
[Logo Omniseen] → clicável → /client/dashboard
──────────────────
1) OPORTUNIDADES
   └── Radar
2) CRIAR
   ├── Artigos
   └── Super Páginas
3) PUBLICAR
   ├── Portal Público
   └── Domínios
4) PROVA DE VALOR
   └── Leads
5) CONFIG
   └── Minha Conta
──────────────────
Tema (toggle)
Sair
```

### Modificações no Código

1. **Remover item Dashboard do modo admin:**
   - Linha 224-227: Remover o bloco condicional que adiciona Dashboard para admins
   - O Dashboard será acessado clicando no logo

2. **Tornar logo clicável:**
   - Linha 217-219: Envolver OmniseenLogo em um button/link que navega para `/client/dashboard`

---

## Parte 2: Dashboard (ClientDashboardMvp)

### Refatoração Completa

**Arquivo:** `src/pages/client/ClientDashboardMvp.tsx`

O arquivo atual tem ~195 linhas e precisa ser completamente reescrito para conter 6 blocos distintos.

### Estrutura dos 6 Blocos

```
┌─────────────────────────────────────────────────────────────────┐
│ BLOCO 1: BOAS-VINDAS                                            │
│ "Bem-vindo, {Nome} 👋"                                          │
│ [subdomínio]                           [✨ Gerar Artigo]        │
├─────────────────────────────────────────────────────────────────┤
│ BLOCO 2: STATUS RÁPIDO (4 cards)                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ Total    │ │Publicados│ │ Visualiz.│ │ Leads    │            │
│ │ Artigos  │ │          │ │          │ │ Gerados  │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────────────────┤
│ BLOCO 3: PROVA DE VALOR                                         │
│ "Últimos 7 dias vs período anterior"    [Ver detalhes →]       │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │ 👁 Visitas   │ │ 🎯 Cliques   │ │ 💬 Leads    │             │
│ │   Totais     │ │   nos CTAs   │ │   Reais     │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│ BLOCO 4: FERRAMENTAS (Grid 2x2)                                 │
│ ┌───────────────────────────┐ ┌───────────────────────────┐    │
│ │ 📝 Postagem 1 Clique     │ │ 📦 Geração em Massa      │    │
│ │    ⚡ Relâmpago           │ │    😱 Poder que assusta  │    │
│ └───────────────────────────┘ └───────────────────────────┘    │
│ ┌───────────────────────────┐ ┌───────────────────────────┐    │
│ │ 🚀 Super Página          │ │ ✍️ Ferramenta Reescrita  │    │
│ │    Foguete de Conversão  │ │    🆕 Novo               │    │
│ └───────────────────────────┘ └───────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│ BLOCO 5: ÚLTIMOS DOCUMENTOS                                     │
│ Título           | Tipo         | Palavras | Data  | Score    │
│ ─────────────────────────────────────────────────────────────  │
│ Como escolher... | Artigo       | 1.234    | 21Jan | 83%      │
│ Página Inicial   | Super Página | 2.100    | 18Jan | 100%     │
├─────────────────────────────────────────────────────────────────┤
│ BLOCO 6: SEU PLANO                                              │
│ 🏷 Plano: Trial (7 dias)                                       │
│ Status: Ativo | Dias restantes: 5                              │
│ [Atualizar Plano]              [Cancelar Conta]                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Parte 3: Novos Componentes a Criar

### 3.1 ToolsGrid.tsx

**Arquivo:** `src/components/dashboard/ToolsGrid.tsx`

Grid 2x2 de cards de produtos com:
- Ícone grande
- Nome da ferramenta
- Descrição curta
- Tag opcional (emoji + texto)
- Navegação ao clicar

```typescript
interface Tool {
  id: string;
  icon: React.ElementType;
  name: string;
  description: string;
  tag?: { emoji: string; text: string };
  path: string;
  comingSoon?: boolean;
}

const TOOLS: Tool[] = [
  {
    id: 'one-click',
    icon: FileText,
    name: 'Postagem de Blog com 1 Clique',
    description: 'Crie o artigo perfeito usando apenas o título. Gere e publique com um clique.',
    tag: { emoji: '⚡', text: 'Relâmpago' },
    path: '/client/create',
  },
  {
    id: 'bulk',
    icon: Layers,
    name: 'Geração de Artigos em Massa',
    description: 'Gere até 100 artigos automaticamente em lote.',
    tag: { emoji: '😱', text: 'Poder que assusta' },
    path: '/client/bulk-create',
    comingSoon: true,
  },
  {
    id: 'super-page',
    icon: LayoutTemplate,
    name: 'Super Página',
    description: 'Crie páginas de alta conversão baseadas na SERP.',
    tag: { emoji: '🚀', text: 'Foguete de Conversão' },
    path: '/client/landing-pages/new',
  },
  {
    id: 'rewrite',
    icon: RefreshCw,
    name: 'Ferramenta de Reescrita',
    description: 'Transforme textos em conteúdo pronto para SEO.',
    tag: { emoji: '🆕', text: 'Novo' },
    path: '/client/rewrite',
    comingSoon: true,
  },
];
```

### 3.2 RecentDocuments.tsx

**Arquivo:** `src/components/dashboard/RecentDocuments.tsx`

Lista combinada de artigos e super páginas com:
- Título
- Tipo (badge colorido)
- Contagem de palavras
- Data de criação
- Score/Percentual baseado no status

**Regra do percentual (MVP):**
- Draft = 30%
- Ready/Scheduled = 70%
- Published = 100%

### 3.3 PlanStatusCard.tsx

**Arquivo:** `src/components/dashboard/PlanStatusCard.tsx`

Card com:
- Nome do plano atual
- Status visual (badge)
- Dias restantes (se trial)
- Botão "Atualizar Plano"
- Botão "Cancelar Conta"

---

## Parte 4: Atualização do Sistema de Planos

### useSubscription.ts

**Arquivo:** `src/hooks/useSubscription.ts`

Atualizar PLAN_DISPLAY_NAMES:

```typescript
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
  internal: 'Interno',
};

const PLAN_PRICES: Record<string, string> = {
  trial: '7 dias grátis',
  starter: '$14.97/mês',
  growth: '$39/mês',
  scale: '$79/mês',
};
```

### Novo hook: useRecentDocuments.ts

**Arquivo:** `src/hooks/useRecentDocuments.ts`

Hook para buscar últimos documentos combinados:

```typescript
interface RecentDocument {
  id: string;
  title: string;
  type: 'article' | 'landing_page';
  wordCount: number;
  createdAt: Date;
  status: string;
  score: number; // Calculado: draft=30, ready=70, published=100
}

export function useRecentDocuments(blogId: string, limit = 5)
```

### Novo arquivo: metricsDefinitions.ts

**Arquivo:** `src/lib/metricsDefinitions.ts`

Centralizar definições de métricas:

```typescript
export const METRIC_DEFINITIONS = {
  VISITS_TOTAL: {
    label: 'Visitas Totais',
    description: 'Pageviews de artigos + super páginas + portal público',
    source: ['articles.view_count', 'landing_pages.view_count', 'portal_views'],
  },
  CTA_CLICKS: {
    label: 'Cliques nos CTAs',
    description: 'Cliques em botões de conversão (call, whatsapp, form)',
    source: ['funnel_events.cta_click'],
  },
  REAL_LEADS: {
    label: 'Leads Reais',
    description: 'Criação efetiva de lead (form ou integração)',
    source: ['real_leads'],
  },
};
```

---

## Parte 5: Redirecionamentos e Rotas

### App.tsx

**Linha ~196:** Já existe o redirect `/client` → `/client/dashboard`

Verificar e garantir que:
- `/client` redireciona para `/client/dashboard`
- Rotas não implementadas (`/client/bulk-create`, `/client/rewrite`) retornam "Em breve"

### Rotas "Em Breve"

Criar componente genérico `ComingSoon.tsx` ou usar toast/modal quando rota não existe.

---

## Parte 6: Mobile Responsivo

### MobileBottomNav.tsx

**Arquivo:** `src/components/mobile/MobileBottomNav.tsx`

O MVP_NAV_ITEMS atual está correto. Manter sem Dashboard no mobile (acessado pelo logo).

### Responsividade do Dashboard

- Grid de ferramentas: `grid-cols-1 sm:grid-cols-2`
- Cards de status: `grid-cols-2 md:grid-cols-4`
- Documentos recentes: Scroll horizontal em mobile ou cards empilhados

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/layout/SubAccountLayout.tsx` | Modificar | Remover Dashboard do sidebar, logo clicável |
| `src/pages/client/ClientDashboardMvp.tsx` | Refatorar | 6 blocos estruturados |
| `src/hooks/useSubscription.ts` | Modificar | Novos nomes de planos |
| `src/components/dashboard/WelcomeHeader.tsx` | Modificar | Adicionar subdomínio |

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/dashboard/ToolsGrid.tsx` | Grid 2x2 de produtos |
| `src/components/dashboard/ToolCard.tsx` | Card individual de produto |
| `src/components/dashboard/RecentDocuments.tsx` | Lista de documentos recentes |
| `src/components/dashboard/PlanStatusCard.tsx` | Card de status do plano |
| `src/hooks/useRecentDocuments.ts` | Hook para buscar documentos |
| `src/lib/metricsDefinitions.ts` | Definições centralizadas de métricas |
| `src/components/shared/ComingSoonModal.tsx` | Modal "Em breve" |

---

## Comportamentos Garantidos

| Comportamento | Implementação |
|---------------|---------------|
| /client → /client/dashboard | Já existe em App.tsx linha 248 |
| Logo leva ao Dashboard | Modificar SubAccountLayout |
| Rotas não implementadas | Modal "Em breve" |
| Empty states claros | Cada bloco terá fallback |
| Mobile responsivo | Grids adaptativos |
| Métricas reais | Hooks existentes + novo hook |
| Identidade Omniseen | Reutilizar classes client-card, cores, hover |

---

## Componentes Reutilizados

| Componente | Uso |
|------------|-----|
| `WelcomeHeader.tsx` | Bloco 1 - ajustar para mostrar subdomínio |
| `MetricCardsRow.tsx` | Bloco 2 - já pronto |
| `ValueProofDashboard.tsx` | Bloco 3 - já pronto |
| `OmniseenLogo.tsx` | Sidebar - adicionar onClick |

---

## Resultado Final

O usuário verá um Dashboard premium onde em **5 segundos** entende:

1. ✅ **O que pode criar** → Bloco Ferramentas (4 cards clicáveis)
2. ✅ **O que já criou** → Bloco Status + Documentos Recentes
3. ✅ **Qual valor está recebendo** → Bloco Prova de Valor
4. ✅ **Qual é o plano dele** → Bloco Seu Plano

O sidebar será **estrutural, não catálogo**, guiando o fluxo em passos lógicos.
