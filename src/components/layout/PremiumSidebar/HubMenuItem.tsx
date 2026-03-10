import { useState, useRef, useEffect, ReactNode, createContext, useContext, useCallback } from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HubMenuItemProps {
  id: string;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isExpanded?: boolean;
  children: ReactNode;
  onClose?: () => void;
}

interface PanelPosition {
  top: number;
  left: number;
}

// Context para que children (ContentHubPanel) possam fechar o menu ao navegar
export const HubMenuContext = createContext<{ closeMenu: () => void }>({ closeMenu: () => {} });
export const useHubMenu = () => useContext(HubMenuContext);

/**
 * Hub menu item com painel flutuante
 *
 * CORREÇÕES:
 * - Abre no hover INDEPENDENTE do estado isExpanded da sidebar
 * - z-index correto: overlay abaixo do card, ponte e card acima
 * - Recalcula posição via ResizeObserver para não sair da tela
 * - Expõe closeMenu via context para que children possam fechar
 */
export function HubMenuItem({
  id,
  icon: Icon,
  label,
  isActive,
  isExpanded = true,
  children,
  onClose
}: HubMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const recalcPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Garante que o painel não ultrapasse a largura da viewport
      const panelWidth = 320; // w-80
      const margin = 8;
      let left = rect.right + margin;
      if (left + panelWidth > window.innerWidth) {
        left = window.innerWidth - panelWidth - margin;
      }
      // Garante que não ultrapasse a altura da viewport
      const panelMaxHeight = Math.min(window.innerHeight * 0.8, 400);
      let top = rect.top;
      if (top + panelMaxHeight > window.innerHeight) {
        top = window.innerHeight - panelMaxHeight - 8;
      }
      setPanelPosition({ top: Math.max(0, top), left: Math.max(0, left) });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      recalcPosition();
      window.addEventListener('resize', recalcPosition);
      window.addEventListener('scroll', recalcPosition, true);
      return () => {
        window.removeEventListener('resize', recalcPosition);
        window.removeEventListener('scroll', recalcPosition, true);
      };
    }
  }, [isOpen, recalcPosition]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    // Abre SEMPRE no hover, independente de isExpanded
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const handleClick = () => {
    setIsOpen(prev => !prev);
  };

  const handleCloseMenu = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const btn = (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-3 py-3 rounded-lg relative',
        'transition-all duration-200',
        isExpanded ? 'mx-2 px-4' : 'justify-center',
        isActive && [
          'bg-[#EDE9FE] dark:bg-[#7C3AED]/20',
          'text-[#7C3AED] font-semibold',
        ],
        !isActive && [
          'text-[#6B7280] dark:text-gray-400',
          'hover:text-[#111827] dark:hover:text-white',
          'hover:bg-[#F9FAFB] dark:hover:bg-gray-800',
        ]
      )}
      aria-expanded={isOpen}
      aria-haspopup="menu"
    >
      {/* Faixa lateral ativa */}
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
          style={{ background: 'linear-gradient(to bottom, #7C3AED, #F97316)' }}
        />
      )}

      <Icon className={cn(
        'h-5 w-5 shrink-0 transition-colors',
        isActive && 'text-[#7C3AED]'
      )} />

      {isExpanded && (
        <>
          <span className="flex-1 text-left text-sm font-medium whitespace-nowrap">
            {label}
          </span>
          <ChevronRight className={cn(
            'h-4 w-4 text-[#9CA3AF] transition-transform duration-200',
            isOpen && 'rotate-90'
          )} />
        </>
      )}
    </button>
  );

  return (
    <HubMenuContext.Provider value={{ closeMenu: handleCloseMenu }}>
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Botão — com tooltip quando sidebar recolhida */}
        {!isExpanded ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>{btn}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {label}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : btn}

        {/* Painel Flutuante — position:fixed para evitar clipping */}
        {isOpen && (
          <>
            {/* Overlay: fecha ao clicar fora. z inferior ao card */}
            <div
              className="fixed inset-0 z-[118]"
              onClick={handleCloseMenu}
              aria-hidden="true"
            />

            {/* Ponte invisível: cobre o gap entre sidebar e painel */}
            <div
              className="fixed z-[120]"
              style={{
                top: panelPosition.top,
                left: panelPosition.left - 12,
                width: 12,
                height: '80vh',
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              aria-hidden="true"
            />

            {/* Card flutuante */}
            <div
              className={cn(
                'fixed z-[119]',
                'w-80 bg-white dark:bg-gray-900 rounded-xl',
                'shadow-[0_10px_40px_rgba(0,0,0,0.15)]',
                'border border-[#E5E7EB] dark:border-gray-700',
                'animate-in slide-in-from-left-2 duration-200',
                'max-h-[80vh] overflow-y-auto'
              )}
              style={{
                top: panelPosition.top,
                left: panelPosition.left,
              }}
              role="menu"
              aria-label={`Menu ${label}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {children}
            </div>
          </>
        )}
      </div>
    </HubMenuContext.Provider>
  );
}
