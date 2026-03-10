import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Pencil, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { SidebarHeader } from './SidebarHeader';
import { NavItem } from './NavItem';
import { HubMenuItem } from './HubMenuItem';
import { ContentHubPanel } from './ContentHubPanel';
import { AccountFooter } from './AccountFooter';
import { MobileDrawer } from './MobileDrawer';

interface PremiumSidebarProps {
  isPlatformAdmin?: boolean;
  onHelpClick?: () => void;
}

/**
 * Premium Sidebar - Colapsável com expansão por hover
 *
 * Recolhido: mostra apenas ícones (64px)
 * Hover: expande suavemente para 280px mostrando labels
 */
export function PremiumSidebar({ isPlatformAdmin, onHelpClick }: PremiumSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const expandTimeoutRef = useRef<NodeJS.Timeout>();

  // Determinar hub/item ativo baseado na rota
  const getActiveHub = useCallback(() => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (
      path.includes('/articles') ||
      path.includes('/radar') ||
      path.includes('/portal') ||
      path.includes('/landing-pages')
    )
      return 'content';
    if (path.includes('/leads')) return 'conversions';
    return 'dashboard';
  }, [location.pathname]);

  const [activeHub, setActiveHub] = useState(getActiveHub);

  useEffect(() => {
    setActiveHub(getActiveHub());
  }, [getActiveHub]);

  const handleNavigate = useCallback(
    (path: string) => {
      // Fechamento imediato de estados que afetam o DOM flutuante
      setMobileOpen(false);
      setIsExpanded(false);

      // Navegação direta. O React Router gerencia a transição.
      // Removido requestAnimationFrame que causava atrasos e possíveis race conditions.
      navigate(path);
    },
    [navigate]
  );

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  return (
    <>
      {/* ========== SIDEBAR DESKTOP ========== */}
      <aside
        onMouseEnter={() => {
          if (expandTimeoutRef.current) {
            clearTimeout(expandTimeoutRef.current);
            expandTimeoutRef.current = undefined;
          }
          setIsExpanded(true);
        }}
        onMouseLeave={() => {
          // Delay para não fechar antes do painel flutuante (HubMenuItem) capturar o mouse
          expandTimeoutRef.current = setTimeout(() => setIsExpanded(false), 250);
        }}
        className={cn(
          'flex flex-col fixed left-0 top-0 h-screen z-[100]',
          'bg-white dark:bg-gray-900',
          'border-r border-[#E5E7EB] dark:border-gray-700',
          'transition-all duration-300 overflow-hidden',
          isExpanded ? 'w-60 shadow-lg' : 'w-16'
        )}
        role="navigation"
        aria-label="Sidebar principal"
      >
        <SidebarHeader isExpanded={isExpanded} />

        <nav className="flex-1 py-4 overflow-y-auto scrollbar-custom">
          <NavItem
            id="dashboard"
            icon={Home}
            label="Dashboard"
            isActive={activeHub === 'dashboard'}
            isExpanded={isExpanded}
            onClick={() => handleNavigate('/client/dashboard')}
          />

          <HubMenuItem
            id="content"
            icon={Pencil}
            label="Conteúdo"
            isActive={activeHub === 'content'}
            isExpanded={isExpanded}
          >
            <ContentHubPanel
              onNavigate={handleNavigate}
              currentPath={location.pathname}
            />
          </HubMenuItem>

          <NavItem
            id="conversions"
            icon={MessageSquare}
            label="Conversões"
            isActive={activeHub === 'conversions'}
            isExpanded={isExpanded}
            onClick={() => handleNavigate('/client/leads')}
          />
        </nav>

        <AccountFooter
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          currentPath={location.pathname}
          isExpanded={isExpanded}
          isPlatformAdmin={isPlatformAdmin}
        />
      </aside>

      {/* ========== MOBILE ========== */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        currentPath={location.pathname}
        isPlatformAdmin={isPlatformAdmin}
      />
    </>
  );
}
