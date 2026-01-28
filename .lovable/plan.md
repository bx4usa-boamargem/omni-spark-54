
# Plano: Premium Sidebar SaaS - Expansível com Hover e PIN

## Visão Geral

Criar uma sidebar moderna e profissional seguindo padrão SaaS premium (estilo Notion/Linear) com:

- **Colapsada (padrão)**: 72px - apenas ícones com tooltips
- **Expandida (hover/PIN)**: 280px - labels, badges e informações completas
- **Duas seções visuais distintas**: Superior (PRINCIPAL) e Inferior (CONFIGURAÇÕES)
- **Menu flutuante do usuário** com perfil, empresa, estratégia e logout
- **Responsividade mobile** com drawer lateral

---

## Arquitetura de Componentes

```text
src/components/layout/PremiumSidebar/
├── PremiumSidebar.tsx        (~200 linhas) - Container principal com lógica de hover/pin
├── SidebarHeader.tsx         (~80 linhas)  - Logo animada + botão PIN
├── NavSection.tsx            (~60 linhas)  - Seção com label + grupo de itens
├── NavItem.tsx               (~150 linhas) - Item individual com tooltip/badge
├── SidebarFooter.tsx         (~100 linhas) - Área do usuário
├── UserMenu.tsx              (~180 linhas) - Menu flutuante completo
├── MobileDrawer.tsx          (~100 linhas) - Drawer para mobile
└── index.ts                  (~10 linhas)  - Barrel export
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/layout/PremiumSidebar/PremiumSidebar.tsx` | **CRIAR** | Container principal |
| `src/components/layout/PremiumSidebar/SidebarHeader.tsx` | **CRIAR** | Logo + PIN |
| `src/components/layout/PremiumSidebar/NavSection.tsx` | **CRIAR** | Seção com label |
| `src/components/layout/PremiumSidebar/NavItem.tsx` | **CRIAR** | Item com tooltip/badge |
| `src/components/layout/PremiumSidebar/SidebarFooter.tsx` | **CRIAR** | Avatar + info usuário |
| `src/components/layout/PremiumSidebar/UserMenu.tsx` | **CRIAR** | Menu flutuante |
| `src/components/layout/PremiumSidebar/MobileDrawer.tsx` | **CRIAR** | Drawer mobile |
| `src/components/layout/PremiumSidebar/index.ts` | **CRIAR** | Export barrel |
| `src/components/layout/SubAccountLayout.tsx` | **MODIFICAR** | Integrar nova sidebar |
| `src/index.css` | **MODIFICAR** | Adicionar animações e scrollbar custom |

---

## 1. PremiumSidebar.tsx - Container Principal

### Estados React

```tsx
const [expanded, setExpanded] = useState(false);      // Estado hover
const [pinned, setPinned] = useState(false);          // Fixar sidebar aberta
const [menuOpen, setMenuOpen] = useState(false);      // Menu do usuário
const [activeItem, setActiveItem] = useState('dashboard');
const [mobileOpen, setMobileOpen] = useState(false);  // Drawer mobile
```

### Comportamento Hover

```tsx
// Hover expande apenas se NÃO estiver "pinada"
const handleMouseEnter = () => {
  if (!pinned) setExpanded(true);
};

const handleMouseLeave = () => {
  if (!pinned) setExpanded(false);
};
```

### Estrutura Visual

```tsx
<aside
  className={cn(
    "fixed left-0 top-0 h-screen z-50",
    "flex flex-col bg-white dark:bg-gray-900",
    "border-r border-[#E5E7EB] dark:border-gray-700",
    "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
    isExpanded ? "w-[280px]" : "w-[72px]"
  )}
  onMouseEnter={handleMouseEnter}
  onMouseLeave={handleMouseLeave}
>
  {/* Header com Logo + PIN */}
  <SidebarHeader 
    expanded={isExpanded} 
    pinned={pinned} 
    onTogglePin={() => setPinned(!pinned)} 
  />
  
  {/* SEÇÃO SUPERIOR - Scroll se necessário */}
  <div className="flex-1 overflow-y-auto scrollbar-custom">
    <NavSection 
      title="PRINCIPAL" 
      items={mainItems} 
      expanded={isExpanded}
      activeItem={activeItem}
      onItemClick={handleNavigation}
    />
  </div>
  
  {/* Divisor Visual com efeito fade gradient */}
  {isExpanded && (
    <div className="px-8 py-5">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D1D5DB] to-transparent opacity-60" />
    </div>
  )}
  
  {/* SEÇÃO INFERIOR - Fundo diferente */}
  <div className={cn(
    "transition-colors duration-300",
    isExpanded ? "bg-[#FAFAFA] dark:bg-gray-800/50" : ""
  )}>
    <NavSection 
      title="CONFIGURAÇÕES" 
      items={settingsItems}
      expanded={isExpanded}
      isSecondary
    />
  </div>
  
  {/* Footer - Área do Usuário */}
  <SidebarFooter 
    expanded={isExpanded}
    onMenuToggle={() => setMenuOpen(!menuOpen)}
  />
</aside>

{/* Menu Flutuante do Usuário */}
{menuOpen && (
  <UserMenu 
    onClose={() => setMenuOpen(false)}
    sidebarExpanded={isExpanded}
  />
)}

{/* Mobile Drawer */}
<MobileDrawer 
  open={mobileOpen} 
  onClose={() => setMobileOpen(false)} 
/>
```

---

## 2. SidebarHeader.tsx - Logo + PIN

### Estado Colapsado (72px)

```tsx
<div className="h-16 flex items-center justify-center px-4 border-b border-[#E5E7EB]">
  <button
    onClick={() => navigate('/client/dashboard')}
    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center transition-all duration-300"
  >
    <span className="text-white font-bold text-lg">O</span>
  </button>
</div>
```

### Estado Expandido (280px)

```tsx
<div className="h-16 flex items-center px-4 gap-3 border-b border-[#E5E7EB]">
  {/* Logo cresce para 48px */}
  <button
    onClick={() => navigate('/client/dashboard')}
    className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center transition-all duration-300 hover:scale-105"
  >
    <span className="text-white font-bold text-xl">O</span>
  </button>
  
  {/* Nome "OmnisEen" */}
  <span className="text-lg font-semibold text-[#111827] dark:text-white flex-1">
    OmnisEen
  </span>
  
  {/* Botão PIN */}
  <button
    onClick={onTogglePin}
    className={cn(
      "p-1.5 rounded-md transition-colors",
      pinned 
        ? "text-[#7C3AED] bg-[#EDE9FE]" 
        : "text-[#9CA3AF] hover:text-[#7C3AED] hover:bg-[#F3F4F6]"
    )}
    aria-label={pinned ? "Desafixar sidebar" : "Fixar sidebar"}
  >
    <Pin className="h-4 w-4" />
  </button>
</div>
```

---

## 3. NavSection.tsx - Seção de Navegação

### Diferenciação Visual

```tsx
interface NavSectionProps {
  title: string;           // "PRINCIPAL" ou "CONFIGURAÇÕES"
  items: NavItemConfig[];
  expanded: boolean;
  activeItem?: string;
  onItemClick?: (id: string, path: string) => void;
  isSecondary?: boolean;   // Diferencia seção inferior
}

// Renderização
<div className={cn(
  "py-2",
  isSecondary && expanded && "bg-[#FAFAFA] dark:bg-gray-800/50"
)}>
  {/* Label da seção - apenas quando expandido */}
  {expanded && (
    <div className="px-5 py-2 mt-2">
      <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.05em]">
        {title}
      </span>
    </div>
  )}
  
  {/* Itens com stagger animation */}
  <div className="space-y-0.5 px-2">
    {items.map((item, index) => (
      <div 
        key={item.id}
        style={{ animationDelay: `${index * 50}ms` }}
        className={expanded ? "animate-slide-in" : ""}
      >
        <NavItem 
          {...item}
          expanded={expanded}
          isActive={activeItem === item.id}
          isSecondary={isSecondary}
          onClick={() => onItemClick?.(item.id, item.path)}
        />
      </div>
    ))}
  </div>
</div>
```

---

## 4. NavItem.tsx - Item Individual

### Estado Colapsado - Tooltip

```tsx
{!expanded && (
  <div className="group relative">
    <button
      onClick={onClick}
      className={cn(
        "w-12 h-12 flex items-center justify-center rounded-[10px] mx-1",
        "transition-all duration-200",
        isActive && !isSecondary && "bg-[#EDE9FE] text-[#7C3AED]",
        !isActive && "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
      )}
    >
      <Icon className="h-[22px] w-[22px]" />
    </button>
    
    {/* Tooltip */}
    <div className={cn(
      "absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100]",
      "px-3 py-2 bg-[#111827] text-white text-[13px] font-medium rounded-lg",
      "whitespace-nowrap shadow-lg",
      "opacity-0 invisible translate-x-1",
      "group-hover:opacity-100 group-hover:visible group-hover:translate-x-0",
      "transition-all duration-150 delay-300",
      "pointer-events-none"
    )}>
      {tooltip || label}
      {/* Seta apontando para esquerda */}
      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111827]" />
    </div>
  </div>
)}
```

### Estado Expandido - Labels + Badges

```tsx
{expanded && (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-[10px] mx-2",
      "transition-all duration-200",
      
      // Item ativo (seção principal)
      isActive && !isSecondary && [
        "bg-[#EDE9FE] text-[#7C3AED] font-semibold",
        "border-l-[3px] border-[#7C3AED] -ml-0.5"
      ],
      
      // Item CTA especial (Gerar Artigo)
      highlight && [
        "bg-gradient-to-r from-[#EDE9FE] to-[#DBEAFE]",
        "border border-[#C4B5FD]"
      ],
      
      // Normal
      !isActive && !highlight && [
        "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]",
        !isSecondary && "hover:scale-[1.02] hover:shadow-sm"
      ]
    )}
  >
    <Icon className={cn(
      "h-[22px] w-[22px] shrink-0",
      highlight && "text-[#7C3AED]",
      isSecondary && "h-5 w-5"  // Menor na seção inferior
    )} />
    
    <span className="flex-1 text-left text-sm font-medium">{label}</span>
    
    {/* Badge numérico ou texto */}
    {badge && <Badge type={badgeType}>{badge}</Badge>}
    
    {/* Badge "Novo" para CTA */}
    {highlight && (
      <span className="px-2 py-0.5 bg-[#7C3AED] text-white text-xs font-semibold rounded-full">
        Novo
      </span>
    )}
  </button>
)}
```

---

## 5. Itens de Menu - Mapeamento Completo

### Seção PRINCIPAL (mainItems)

```tsx
const mainItems = [
  {
    id: 'dashboard',
    icon: Home,
    label: 'Dashboard',
    path: '/client/dashboard',
    tooltip: 'Visão geral e métricas',
  },
  {
    id: 'generate',
    icon: Sparkles,
    label: 'Gerar Artigo',
    path: '/client/articles/new',
    tooltip: 'Criar novo conteúdo',
    highlight: true,  // CTA com destaque visual
    badge: 'Novo',
  },
  {
    id: 'articles',
    icon: FileText,
    label: 'Meus Artigos',
    path: '/client/articles',
    tooltip: 'Gerenciar conteúdo',
    badge: 15,         // Contador numérico dinâmico
    badgeType: 'default',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    label: 'Analytics',
    path: '/client/analytics',
    tooltip: 'Métricas e desempenho',
  },
  {
    id: 'publish',
    icon: Globe,
    label: 'Publicar',
    path: '/client/portal',
    tooltip: 'Sites e integrações',
    badge: 3,          // Sites conectados
    badgeType: 'success',
    pulseDot: true,    // Dot pulsante verde
  },
  {
    id: 'leads',
    icon: MessageSquare,
    label: 'Conversões',
    path: '/client/leads',
    tooltip: 'Leads e chatbot',
  },
];
```

### Seção CONFIGURAÇÕES (settingsItems)

```tsx
const settingsItems = [
  {
    id: 'billing',
    icon: CreditCard,
    label: 'Plano & Cobrança',
    path: '/client/settings?tab=billing',
    tooltip: 'Assinatura e pagamentos',
    badge: 'Growth',
    badgeType: 'purple',
    badgeIcon: Star,   // Ícone estrela antes do texto
  },
  {
    id: 'integrations',
    icon: Link2,
    label: 'Integrações',
    path: '/client/integrations',
    tooltip: 'WordPress, APIs, webhooks',
    badge: 3,
  },
  {
    id: 'settings',
    icon: Settings,
    label: 'Configurações',
    path: '/client/settings',
    tooltip: 'Preferências do sistema',
  },
  {
    id: 'help',
    icon: HelpCircle,
    label: 'Ajuda & Suporte',
    path: '/help',
    tooltip: 'Documentação e tickets',
  },
  {
    id: 'theme',
    icon: Sun,  // ou Moon se dark mode ativo
    label: 'Tema',
    tooltip: 'Alternar claro/escuro',
    isThemeToggle: true,  // Comportamento especial: toggle switch
  },
];
```

---

## 6. SidebarFooter.tsx - Área do Usuário

### Estado Colapsado

```tsx
<div className="border-t-2 border-[#E5E7EB] p-4">
  <button
    onClick={onMenuToggle}
    className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center hover:ring-2 hover:ring-[#7C3AED]/20 transition-all cursor-pointer"
  >
    <span className="text-white font-semibold text-sm">{initials}</span>
  </button>
</div>
```

### Estado Expandido

```tsx
<div className="border-t-2 border-[#E5E7EB] p-4">
  <button
    onClick={onMenuToggle}
    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F9FAFB] hover:shadow-sm transition-all cursor-pointer"
  >
    {/* Avatar */}
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center">
      <span className="text-white font-semibold text-sm">{initials}</span>
    </div>
    
    {/* Info */}
    <div className="flex-1 text-left min-w-0">
      <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">
        {blogName}
      </p>
      <div className="flex items-center gap-1.5">
        {/* Dot verde pulsante (status online) */}
        <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
        <span className="text-xs text-[#6B7280]">Plano Growth</span>
      </div>
    </div>
    
    {/* Chevron */}
    <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
  </button>
</div>
```

---

## 7. UserMenu.tsx - Menu Flutuante

### Posicionamento Dinâmico

```tsx
// Posição se ajusta conforme sidebar está expandida ou não
const menuPosition = sidebarExpanded 
  ? "left-[296px]"   // 280px + 16px gap
  : "left-[88px]";   // 72px + 16px gap
```

### Estrutura Completa

```tsx
<>
  {/* Overlay */}
  <div 
    className="fixed inset-0 bg-black/25 z-50 animate-in fade-in duration-150 cursor-pointer"
    onClick={onClose}
  />
  
  {/* Menu Flutuante */}
  <div 
    className={cn(
      "fixed bottom-[88px] z-[51] w-[280px] bg-white dark:bg-gray-900 rounded-xl",
      "shadow-[0_10px_40px_rgba(0,0,0,0.15),0_0_1px_rgba(0,0,0,0.1)]",
      "border border-[#E5E7EB] dark:border-gray-700",
      "animate-in zoom-in-95 fade-in duration-200",
      "transition-[left] duration-300",
      menuPosition
    )}
  >
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-4 border-b border-[#F3F4F6]">
      <span className="font-semibold text-[15px] text-[#111827]">Minha Conta</span>
      <button onClick={onClose} className="p-1 rounded hover:bg-[#F3F4F6]">
        <X className="h-[18px] w-[18px] text-[#9CA3AF] hover:text-[#111827]" />
      </button>
    </div>
    
    {/* Menu Items */}
    <div className="p-2 space-y-1">
      {accountMenuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => { navigate(item.path); onClose(); }}
          className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[#F9FAFB] hover:scale-[1.02] transition-all cursor-pointer"
        >
          {/* Ícone circular colorido */}
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", item.iconBg)}>
            <item.icon className="h-4 w-4" />
          </div>
          
          {/* Texto */}
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">{item.subtitle}</p>
          </div>
          
          {/* Toggle opcional (Notificações) */}
          {item.toggle && <ToggleSwitch />}
        </button>
      ))}
    </div>
    
    {/* Footer - Sair */}
    <div className="border-t border-[#F3F4F6] p-2">
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg transition-colors"
      >
        <LogOut className="h-4 w-4" />
        <span className="text-sm font-medium">Sair</span>
      </button>
    </div>
  </div>
</>
```

### Itens do Menu do Usuário

```tsx
const accountMenuItems = [
  {
    id: 'profile',
    icon: User,
    iconBg: 'bg-blue-100 text-blue-600',
    title: 'Perfil',
    subtitle: 'Dados pessoais e preferências',
    path: '/client/account',
  },
  {
    id: 'company',
    icon: Building2,
    iconBg: 'bg-emerald-100 text-emerald-600',
    title: 'Empresa',
    subtitle: 'Informações do negócio',
    path: '/client/company',
  },
  {
    id: 'strategy',
    icon: Target,
    iconBg: 'bg-purple-100 text-purple-600',
    title: 'Estratégia SEO',
    subtitle: 'Palavras-chave e configurações',
    path: '/client/radar',
  },
  {
    id: 'notifications',
    icon: Bell,
    iconBg: 'bg-amber-100 text-amber-600',
    title: 'Notificações',
    subtitle: 'E-mails e alertas',
    path: '/client/settings?tab=notifications',
    toggle: true,  // Mostra switch on/off
  },
];
```

---

## 8. MobileDrawer.tsx - Responsividade

### Estrutura

```tsx
{/* Botão Hamburguer - Apenas Mobile */}
<button 
  onClick={() => setMobileOpen(true)}
  className="fixed top-4 right-4 z-50 md:hidden p-2 rounded-lg bg-white shadow-md"
>
  <Menu className="h-6 w-6" />
</button>

{/* Drawer + Overlay */}
{mobileOpen && (
  <>
    {/* Overlay mais escuro */}
    <div 
      className="fixed inset-0 bg-black/50 z-[59] md:hidden animate-in fade-in cursor-pointer"
      onClick={() => setMobileOpen(false)}
    />
    
    {/* Drawer Content - sempre expandido */}
    <aside className="fixed left-0 top-0 h-screen w-[320px] bg-white z-[60] md:hidden animate-in slide-in-from-left duration-300">
      {/* Botão fechar */}
      <button
        onClick={() => setMobileOpen(false)}
        className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-[#F3F4F6]"
      >
        <X className="h-6 w-6 text-[#6B7280]" />
      </button>
      
      {/* Conteúdo sempre no estado expandido */}
      <SidebarHeader expanded pinned={false} />
      <NavSection title="PRINCIPAL" items={mainItems} expanded />
      <div className="px-8 py-5">
        <div className="h-px bg-gradient-to-r from-transparent via-[#D1D5DB] to-transparent" />
      </div>
      <NavSection title="CONFIGURAÇÕES" items={settingsItems} expanded isSecondary />
      <SidebarFooter expanded />
    </aside>
  </>
)}
```

---

## 9. Estilos CSS - index.css

### Adicionar ao final do arquivo

```css
/* ================================================
   PREMIUM SIDEBAR - Animações e Scrollbar
   ================================================ */

/* Scrollbar customizada */
.scrollbar-custom {
  scrollbar-width: thin;
  scrollbar-color: #D1D5DB transparent;
}

.scrollbar-custom::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-custom::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-custom::-webkit-scrollbar-thumb {
  background: #D1D5DB;
  border-radius: 9999px;
}

.scrollbar-custom::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}

/* Slide-in animation para itens */
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in {
  animation: slide-in 300ms ease-out forwards;
}

/* Badge pulse (Growth) */
@keyframes badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.badge-pulse {
  animation: badge-pulse 2s ease-in-out infinite;
}

/* Breathing divider */
@keyframes breathing {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

.divider-breathing {
  animation: breathing 3s ease-in-out infinite;
}
```

---

## 10. SubAccountLayout.tsx - Integração

### Modificações Necessárias

```tsx
// Imports
import { PremiumSidebar } from '@/components/layout/PremiumSidebar';

// No return do componente - SUBSTITUIR sidebar atual
return (
  <div className="min-h-screen client-bg flex">
    {/* Nova Premium Sidebar - Desktop */}
    <div className="hidden md:block">
      <PremiumSidebar 
        isPlatformAdmin={isPlatformAdmin}
        onHelpClick={handleHelpClick}
      />
    </div>

    {/* Main Content - Margin dinâmica (72px colapsada) */}
    <main className="flex-1 md:ml-[72px] transition-[margin] duration-300">
      <div className={cn('min-h-screen', isMobile ? 'pb-20' : '')}>
        <div className="p-4 md:p-8 max-w-5xl mx-auto">{children}</div>
      </div>
    </main>

    {/* Mobile Bottom Nav (mantém existente) */}
    {isMobile && <MobileBottomNav showAdvanced={showAdvancedNav} />}

    {/* Floating Chat (mantém existente) */}
    {!isMobile && <FloatingSupportChat />}
  </div>
);
```

---

## Resumo de Badges

| Tipo | Estilo | Exemplo |
|------|--------|---------|
| Contador (default) | `bg-[#F3F4F6] text-[#4B5563]` | "15", "3" |
| Sucesso (sites conectados) | `bg-[#DCFCE7] text-[#16A34A]` + dot pulsante | "3" sites |
| Purple (plano) | `bg-[#EDE9FE] text-[#7C3AED]` + ícone Star | "Growth" |
| CTA (novo) | `bg-[#7C3AED] text-white` | "Novo" |

---

## Paleta de Cores Consolidada

| Token | Cor | Uso |
|-------|-----|-----|
| Primary | `#7C3AED` | Itens ativos, badges, PIN |
| Primary Light | `#EDE9FE` | Background item ativo |
| Secondary | `#3B82F6` | Gradientes do logo |
| Success | `#16A34A` | Badge sites conectados |
| Success Light | `#DCFCE7` | Background badge sucesso |
| Danger | `#EF4444` | Botão "Sair" |
| Background | `#FFFFFF` | Sidebar principal |
| Background Alt | `#FAFAFA` | Seção CONFIGURAÇÕES |
| Border | `#E5E7EB` | Bordas |
| Text Primary | `#111827` | Texto principal |
| Text Secondary | `#6B7280` | Texto secundário |
| Text Muted | `#9CA3AF` | Labels, hints |

---

## Critérios de Aceite (QA)

| # | Critério | Validação |
|---|----------|-----------|
| 1 | Sidebar colapsada: 72px exatos | Inspecionar elemento |
| 2 | Sidebar expandida: 280px exatos | Inspecionar elemento |
| 3 | Hover expande sidebar | Testar mouse enter |
| 4 | Sair mouse colapsa sidebar | Testar mouse leave |
| 5 | PIN mantém expandida | Clicar no botão PIN |
| 6 | Logo cresce 40px → 48px ao expandir | Verificar transição |
| 7 | Seção PRINCIPAL: fundo branco | Verificar cor |
| 8 | Seção CONFIGURAÇÕES: fundo #FAFAFA | Verificar cor |
| 9 | Divisor com fade gradient | Verificar visual |
| 10 | Tooltips aparecem após 300ms | Testar delay |
| 11 | Item ativo: borda roxa + background | Verificar visual |
| 12 | Badge "15" em Artigos | Verificar numérico |
| 13 | Badge "3" verde pulsante em Publicar | Verificar dot animado |
| 14 | Badge "Growth" roxo em Plano | Verificar com ícone Star |
| 15 | Menu flutuante abre ao clicar usuário | Testar interação |
| 16 | Overlay fecha menu ao clicar | Testar interação |
| 17 | Menu se reposiciona com sidebar | Verificar left dinâmico |
| 18 | Botão "Sair" vermelho funcional | Testar logout |
| 19 | Mobile drawer abre em < 1024px | Testar responsivo |
| 20 | Drawer sempre expandido no mobile | Verificar visual |
| 21 | Todas as 12 rotas navegam | Testar cada item |
| 22 | Keyboard navigation (Tab, Enter, Esc) | Testar acessibilidade |
| 23 | Transições 300ms suaves | Verificar performance |
| 24 | Dark mode suportado | Alternar tema |
| 25 | F5 mantém estado correto | Testar reload |

---

## Estimativa de Código

| Arquivo | Linhas | Complexidade |
|---------|--------|--------------|
| `PremiumSidebar.tsx` | ~200 | Alta |
| `SidebarHeader.tsx` | ~80 | Média |
| `NavSection.tsx` | ~60 | Baixa |
| `NavItem.tsx` | ~150 | Alta |
| `SidebarFooter.tsx` | ~100 | Média |
| `UserMenu.tsx` | ~180 | Alta |
| `MobileDrawer.tsx` | ~100 | Média |
| `index.ts` | ~10 | Baixa |
| `index.css` (adicional) | ~50 | Baixa |
| `SubAccountLayout.tsx` (mod) | ~20 | Baixa |

**Total estimado**: ~950 linhas de código novo

---

## Impacto

- **UX Premium**: Navegação fluida estilo Notion/Linear/Slack
- **Produtividade**: Acesso rápido a todas as funcionalidades core
- **Diferenciação visual clara**: Seções PRINCIPAL vs CONFIGURAÇÕES
- **Acessibilidade total**: Keyboard + screen reader
- **Mobile-first**: Drawer responsivo funcional
- **Dark mode**: Suporte completo
- **Zero breaking changes**: Compatível com todas as rotas existentes
- **Performance**: Transições 300ms CSS nativo, sem re-renders desnecessários
