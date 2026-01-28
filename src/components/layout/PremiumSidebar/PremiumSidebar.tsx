import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Sparkles,
  FileText,
  BarChart3,
  Globe,
  MessageSquare,
  CreditCard,
  Link2,
  Settings,
  HelpCircle,
  Sun,
  Star,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarHeader } from './SidebarHeader';
import { NavSection, NavItemConfig } from './NavSection';
import { SidebarFooter } from './SidebarFooter';
import { UserMenu } from './UserMenu';
import { MobileDrawer, MobileMenuButton } from './MobileDrawer';

interface PremiumSidebarProps {
  isPlatformAdmin?: boolean;
  onHelpClick?: () => void;
}

/**
 * Premium Sidebar SaaS
 * - Colapsada (padrão): 72px
 * - Expandida (hover/PIN): 280px
 * - Duas seções distintas: PRINCIPAL e CONFIGURAÇÕES
 */
export function PremiumSidebar({ isPlatformAdmin, onHelpClick }: PremiumSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Determinar item ativo baseado na rota atual
  const getActiveItem = useCallback(() => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/articles/new')) return 'generate';
    if (path.includes('/articles')) return 'articles';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/portal')) return 'publish';
    if (path.includes('/leads')) return 'leads';
    if (path.includes('/settings')) return 'settings';
    if (path.includes('/integrations')) return 'integrations';
    if (path.includes('/help')) return 'help';
    return 'dashboard';
  }, [location.pathname]);

  const [activeItem, setActiveItem] = useState(getActiveItem);

  // Atualizar item ativo quando a rota mudar
  useEffect(() => {
    setActiveItem(getActiveItem());
  }, [getActiveItem]);

  // Sidebar está expandida se hover OU pinned
  const isExpanded = expanded || pinned;

  // Handlers de hover
  const handleMouseEnter = () => {
    if (!pinned) setExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!pinned) setExpanded(false);
  };

  // Handler de navegação
  const handleNavigation = (id: string, path?: string) => {
    setActiveItem(id);
    
    // Fechar menu mobile ao navegar
    setMobileOpen(false);
    
    // Handler especial para ajuda
    if (id === 'help' && onHelpClick) {
      onHelpClick();
      return;
    }
    
    if (path) {
      navigate(path);
    }
  };

  // Itens da seção PRINCIPAL
  const mainItems: NavItemConfig[] = [
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
      highlight: true,
    },
    {
      id: 'articles',
      icon: FileText,
      label: 'Meus Artigos',
      path: '/client/articles',
      tooltip: 'Gerenciar conteúdo',
      badge: 15,
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
      badge: 3,
      badgeType: 'success',
      pulseDot: true,
    },
    {
      id: 'leads',
      icon: MessageSquare,
      label: 'Conversões',
      path: '/client/leads',
      tooltip: 'Leads e chatbot',
    },
  ];

  // Itens da seção CONFIGURAÇÕES
  const settingsItems: NavItemConfig[] = [
    {
      id: 'billing',
      icon: CreditCard,
      label: 'Plano & Cobrança',
      path: '/client/settings?tab=billing',
      tooltip: 'Assinatura e pagamentos',
      badge: 'Growth',
      badgeType: 'purple',
      badgeIcon: Star,
    },
    {
      id: 'integrations',
      icon: Link2,
      label: 'Integrações',
      path: '/client/integrations',
      tooltip: 'WordPress, APIs, webhooks',
      badge: 3,
      badgeType: 'default',
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
      icon: Sun,
      label: 'Tema',
      tooltip: 'Alternar claro/escuro',
      isThemeToggle: true,
    },
  ];

  // Adicionar item Admin se for platform admin
  if (isPlatformAdmin) {
    settingsItems.push({
      id: 'admin',
      icon: Shield,
      label: 'Admin Panel',
      path: '/admin',
      tooltip: 'Painel administrativo',
    });
  }

  return (
    <>
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          'hidden lg:flex fixed left-0 top-0 h-screen z-50',
          'flex-col bg-white dark:bg-gray-900',
          'border-r border-[#E5E7EB] dark:border-gray-700',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          isExpanded ? 'w-[280px]' : 'w-[72px]'
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="navigation"
        aria-label="Sidebar principal"
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

        {/* Divisor Visual */}
        {isExpanded && (
          <div className="px-8 py-5">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D1D5DB] to-transparent opacity-60 divider-breathing" />
          </div>
        )}

        {/* SEÇÃO INFERIOR - Fundo diferente */}
        <div
          className={cn(
            'transition-colors duration-300',
            isExpanded ? 'bg-[#FAFAFA] dark:bg-gray-800/50' : ''
          )}
        >
          <NavSection
            title="CONFIGURAÇÕES"
            items={settingsItems}
            expanded={isExpanded}
            isSecondary
            onItemClick={handleNavigation}
          />
        </div>

        {/* Footer - Área do Usuário */}
        <SidebarFooter expanded={isExpanded} onMenuToggle={() => setMenuOpen(!menuOpen)} />
      </aside>

      {/* Menu Flutuante do Usuário */}
      {menuOpen && (
        <UserMenu onClose={() => setMenuOpen(false)} sidebarExpanded={isExpanded} />
      )}

      {/* Mobile: Botão Hamburguer */}
      <MobileMenuButton onClick={() => setMobileOpen(true)} />

      {/* Mobile: Drawer */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        mainItems={mainItems}
        settingsItems={settingsItems}
        activeItem={activeItem}
        onItemClick={handleNavigation}
        onMenuToggle={() => setMenuOpen(!menuOpen)}
      />
    </>
  );
}
