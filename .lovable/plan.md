
# Plano: Refatoração Premium da Navegação OmniSeen

## Resumo Executivo

Refatorar completamente a navegação da OmniSeen seguindo padrão SaaS premium (Notion/Linear/Slack), com:
- Sidebar de 64px com acento laranja (#FF8A00)
- Separação absoluta entre hover (UI) e click (navegação)
- Restauração de TODAS as funcionalidades desconectadas
- Zero menus travados ou rotas mortas

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/layout/MinimalSidebar.tsx` | Refatorar estrutura completa |
| `src/components/layout/SidebarNavItem.tsx` | Atualizar estilos para acento laranja |
| `src/components/layout/AccountBlock.tsx` | Atualizar menu hover com rotas corretas |
| `src/components/layout/SubAccountLayout.tsx` | Ajustar largura do sidebar para 64px |

---

## 1. MinimalSidebar.tsx - Nova Estrutura

### Estrutura Visual Obrigatória

```text
┌────────────────────────────────────┐
│           🟠 OMNISEEN              │  ← Logo (clique → dashboard)
├────────────────────────────────────┤
│                                    │
│  OPORTUNIDADES                     │  ← Label de seção
│  🎯 Radar                          │  → /client/radar
│                                    │
│  CRIAR                             │
│  ✏️ Artigos                        │  → /client/articles
│  📄 Páginas SEO                    │  → /client/landing-pages
│                                    │
│  PÚBLICO                           │
│  🌐 Portal                         │  → /client/portal
│                                    │
│  CONVERSÕES                        │
│  👥 Leads                          │  → /client/leads
│                                    │
│  CONTA                             │
│  ⚙️ Conta (hover → painel)         │
│                                    │
├────────────────────────────────────┤
│  🌙 Tema                           │  ← Toggle tema
│  👤 AccountBlock                   │  ← Bloco do usuário
└────────────────────────────────────┘
```

### Código Principal

```tsx
// Imports atualizados
import { 
  Radar, 
  FileText, 
  LayoutTemplate, 
  Globe, 
  Users, 
  Settings,
  HelpCircle 
} from 'lucide-react';

// Itens de navegação - TODOS com onClick direto
const navSections = [
  {
    label: 'OPORTUNIDADES',
    items: [
      { icon: Radar, label: 'Radar', path: '/client/radar' },
    ]
  },
  {
    label: 'CRIAR',
    items: [
      { icon: FileText, label: 'Artigos', path: '/client/articles' },
      { icon: LayoutTemplate, label: 'Páginas SEO', path: '/client/landing-pages' },
    ]
  },
  {
    label: 'PÚBLICO',
    items: [
      { icon: Globe, label: 'Portal', path: '/client/portal' },
    ]
  },
  {
    label: 'CONVERSÕES',
    items: [
      { icon: Users, label: 'Leads', path: '/client/leads' },
    ]
  },
  {
    label: 'CONTA',
    items: [
      { 
        icon: Settings, 
        label: 'Conta', 
        path: '/client/account',
        panel: accountPanelItems  // Painel hover com subitens
      },
    ]
  },
];
```

### Painel Hover de Conta

```tsx
const accountPanelItems: PanelItem[] = [
  {
    id: 'my-account',
    icon: User,
    iconColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconTextColor: 'text-blue-600 dark:text-blue-400',
    title: 'Minha Conta',
    subtitle: 'Gerencie seu perfil e preferências.',
    path: '/client/account',
  },
  {
    id: 'my-company',
    icon: Building2,
    iconColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconTextColor: 'text-emerald-600 dark:text-emerald-400',
    title: 'Minha Empresa',
    subtitle: 'Configure informações do negócio.',
    path: '/client/company',
  },
  {
    id: 'strategy',
    icon: Compass,
    iconColor: 'bg-purple-100 dark:bg-purple-900/30',
    iconTextColor: 'text-purple-600 dark:text-purple-400',
    title: 'Estratégia',
    subtitle: 'Defina sua estratégia de conteúdo.',
    path: '/client/radar',  // Usa /client/radar (já existe redirect de /client/strategy)
  },
  {
    id: 'billing',
    icon: CreditCard,
    iconColor: 'bg-amber-100 dark:bg-amber-900/30',
    iconTextColor: 'text-amber-600 dark:text-amber-400',
    title: 'Plano & Cobrança',
    subtitle: 'Gerencie sua assinatura e faturas.',
    path: '/client/settings?tab=billing',
  },
];
```

---

## 2. SidebarNavItem.tsx - Estilos Premium

### Cores de Acento Laranja

```tsx
// ANTES (roxo/primary)
isActive && 'text-primary bg-primary/15 shadow-[0_0_12px_hsla(277,76%,50%,0.2)]'

// DEPOIS (laranja #FF8A00)
isActive && [
  'text-orange-500',
  'bg-orange-500/15',
  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
  'before:w-[3px] before:h-6 before:bg-orange-500 before:rounded-r-full'
]
```

### Hover Laranja

```tsx
// ANTES
'text-muted-foreground hover:text-primary hover:bg-primary/10'

// DEPOIS
'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10'
```

---

## 3. AccountBlock.tsx - Menu Atualizado

### Novos Itens de Menu

```tsx
const menuItems: AccountMenuItem[] = [
  {
    icon: User,
    label: 'Minha Conta',
    action: () => navigateTo('/client/account'),
  },
  {
    icon: Building2,
    label: 'Minha Empresa',
    action: () => navigateTo('/client/company'),
  },
  {
    icon: Compass,
    label: 'Estratégia',
    action: () => navigateTo('/client/radar'),
  },
  {
    icon: CreditCard,
    label: 'Plano & Cobrança',
    action: () => navigateTo('/client/settings?tab=billing'),
  },
];
```

### Imports Necessários

```tsx
import { 
  User, 
  Building2,   // NOVO
  Compass,     // NOVO
  CreditCard, 
  LogOut,
  Sparkles
} from 'lucide-react';
```

---

## 4. SubAccountLayout.tsx - Largura 64px

```tsx
// ANTES
<aside className="hidden md:flex w-20 client-sidebar flex-col ...">

// DEPOIS
<aside className="hidden md:flex w-16 client-sidebar flex-col ...">

// ANTES
<main className="flex-1 md:ml-20">

// DEPOIS
<main className="flex-1 md:ml-16">
```

---

## Regras de Interação (Implementação Obrigatória)

### Padrão React Correto

```tsx
// ✅ CORRETO - Separação absoluta
<div
  onMouseEnter={() => setHover(true)}   // Apenas UI
  onMouseLeave={() => setHover(false)}  // Apenas UI
  onClick={() => navigate('/client/articles')}  // Apenas navegação
>

// ❌ PROIBIDO
onClick={(e) => {
  e.preventDefault();      // NUNCA
  e.stopPropagation();     // NUNCA
  setMenuOpen(!menuOpen);  // NUNCA travar menu
}}
```

### Comportamento Garantido

| Ação | Resultado |
|------|-----------|
| Mouse entra no ícone | Painel/tooltip aparece |
| Mouse sai do ícone | Painel/tooltip desaparece |
| Clique no ícone | Navega para rota principal |
| Clique em item do painel | Navega para rota específica |
| F5 em qualquer rota | Página carrega corretamente |

---

## Mapeamento de Rotas (Validação)

Todas as rotas já existem em `App.tsx`:

| Funcionalidade | Rota | Componente | Status |
|----------------|------|------------|--------|
| Radar | `/client/radar` | `ClientStrategy` | ✅ Existe |
| Artigos | `/client/articles` | `ClientArticles` | ✅ Existe |
| Páginas SEO | `/client/landing-pages` | `ClientLandingPages` | ✅ Existe |
| Portal | `/client/portal` | `ClientSite` | ✅ Existe |
| Leads | `/client/leads` | `ClientLeads` | ✅ Existe |
| Minha Conta | `/client/account` | `ClientAccount` | ✅ Existe |
| Minha Empresa | `/client/company` | `ClientCompany` | ✅ Existe |
| Estratégia | `/client/radar` | Redirect existe | ✅ Existe |
| Plano & Cobrança | `/client/settings?tab=billing` | `ClientSettings` | ✅ Existe |

---

## Critérios de Aceite (QA)

| # | Critério | Validação |
|---|----------|-----------|
| 1 | Sidebar tem 64px de largura | Inspecionar elemento |
| 2 | Cor de acento é laranja (#FF8A00) | Verificar hover e ativo |
| 3 | Item ativo tem barra lateral laranja | Verificar visualmente |
| 4 | Todos os itens do sidebar navegam | Testar clique em cada um |
| 5 | Nenhum menu fica preso após clique | Testar hover + click |
| 6 | Hover apenas mostra UI | Testar mouse enter/leave |
| 7 | Click sempre navega | Testar cada item |
| 8 | Portal acessível | `/client/portal` |
| 9 | Artigos acessível | `/client/articles` |
| 10 | Páginas SEO acessível | `/client/landing-pages` |
| 11 | Minha Conta acessível | `/client/account` |
| 12 | Minha Empresa acessível | `/client/company` |
| 13 | Estratégia acessível | Via painel hover |
| 14 | Plano & Cobrança acessível | Via painel hover |
| 15 | F5 mantém todas as rotas | Testar reload |
| 16 | Animações em 200ms | Verificar transições |

---

## Resumo de Mudanças

| Arquivo | Linhas Afetadas | Tipo de Mudança |
|---------|-----------------|-----------------|
| `MinimalSidebar.tsx` | ~100 linhas | Refatoração completa da estrutura |
| `SidebarNavItem.tsx` | ~10 linhas | Atualizar cores para laranja |
| `AccountBlock.tsx` | ~30 linhas | Substituir menuItems |
| `SubAccountLayout.tsx` | 2 linhas | Mudar w-20 → w-16 |

---

## Impacto

- **Zero breaking changes** nas rotas (todas já existem)
- **Restauração completa** de funcionalidades desconectadas
- **UX premium** com padrão SaaS moderno
- **Navegação fluida** sem fricção ou menus travados
- **OmniSeen utilizável** como plataforma SaaS real
