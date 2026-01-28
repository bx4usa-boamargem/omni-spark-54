import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavItem } from './NavItem';

export interface NavItemConfig {
  id: string;
  icon: LucideIcon;
  label: string;
  path?: string;
  tooltip?: string;
  highlight?: boolean;
  badge?: string | number;
  badgeType?: 'default' | 'success' | 'purple';
  badgeIcon?: LucideIcon;
  pulseDot?: boolean;
  isThemeToggle?: boolean;
}

interface NavSectionProps {
  title: string;
  items: NavItemConfig[];
  expanded: boolean;
  activeItem?: string;
  onItemClick?: (id: string, path?: string) => void;
  isSecondary?: boolean;
}

/**
 * Seção de navegação com label e grupo de itens
 * - PRINCIPAL: fundo branco, itens maiores
 * - CONFIGURAÇÕES: fundo #FAFAFA, itens compactos
 */
export function NavSection({
  title,
  items,
  expanded,
  activeItem,
  onItemClick,
  isSecondary,
}: NavSectionProps) {
  return (
    <div
      className={cn(
        'py-2 transition-colors duration-300',
        isSecondary && expanded && 'bg-[#FAFAFA] dark:bg-gray-800/50'
      )}
    >
      {/* Label da seção - apenas quando expandido */}
      {expanded && (
        <div className="px-5 py-2 mt-2">
          <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.05em]">
            {title}
          </span>
        </div>
      )}

      {/* Itens com stagger animation */}
      <div className={cn('space-y-0.5', expanded ? 'px-2' : 'px-1')}>
        {items.map((item, index) => (
          <div
            key={item.id}
            style={{ animationDelay: expanded ? `${index * 50}ms` : undefined }}
            className={expanded ? 'animate-slide-in' : ''}
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
  );
}
