import { LucideIcon, Star, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface NavItemProps {
  id: string;
  icon: LucideIcon;
  label: string;
  tooltip?: string;
  path?: string;
  expanded: boolean;
  isActive: boolean;
  isSecondary?: boolean;
  highlight?: boolean;
  badge?: string | number;
  badgeType?: 'default' | 'success' | 'purple';
  badgeIcon?: LucideIcon;
  pulseDot?: boolean;
  isThemeToggle?: boolean;
  onClick: () => void;
}

/**
 * Item de navegação individual
 * - Colapsado: Apenas ícone + tooltip com delay 300ms
 * - Expandido: Ícone + label + badges opcionais
 */
export function NavItem({
  icon: Icon,
  label,
  tooltip,
  expanded,
  isActive,
  isSecondary,
  highlight,
  badge,
  badgeType = 'default',
  badgeIcon: BadgeIcon,
  pulseDot,
  isThemeToggle,
  onClick,
}: NavItemProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  // Renderiza toggle de tema
  if (isThemeToggle && expanded) {
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={cn(
          'w-full flex items-center gap-3 rounded-lg mx-2',
          'transition-all duration-200',
          'text-[#6B7280] hover:text-[#374151] hover:bg-[#F3F4F6] dark:hover:bg-gray-700',
          isSecondary ? 'px-3.5 py-2.5' : 'px-4 py-3'
        )}
        aria-label="Alternar tema"
      >
        {isDark ? (
          <Moon className="h-5 w-5 shrink-0" />
        ) : (
          <Sun className="h-5 w-5 shrink-0" />
        )}
        <span className="flex-1 text-left text-sm font-medium">{label}</span>

        {/* Toggle Switch */}
        <div
          className={cn(
            'w-10 h-6 rounded-full transition-colors duration-200 relative',
            isDark ? 'bg-[#7C3AED]' : 'bg-[#E5E7EB]'
          )}
        >
          <div
            className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
              isDark ? 'translate-x-5' : 'translate-x-1'
            )}
          />
        </div>
      </button>
    );
  }

  // Estado colapsado: apenas ícone + tooltip
  if (!expanded) {
    return (
      <div className="group relative">
        <button
          onClick={isThemeToggle ? () => setTheme(isDark ? 'light' : 'dark') : onClick}
          className={cn(
            'w-12 h-12 flex items-center justify-center rounded-[10px] mx-auto',
            'transition-all duration-200',
            isActive && !isSecondary && 'bg-[#EDE9FE] text-[#7C3AED] dark:bg-[#7C3AED]/20',
            highlight && 'bg-gradient-to-r from-[#EDE9FE] to-[#DBEAFE] dark:from-[#7C3AED]/20 dark:to-[#3B82F6]/20',
            !isActive && !highlight && 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] dark:hover:bg-gray-700'
          )}
          aria-label={tooltip || label}
          aria-current={isActive ? 'page' : undefined}
        >
          {isThemeToggle ? (
            isDark ? <Moon className="h-[22px] w-[22px]" /> : <Sun className="h-[22px] w-[22px]" />
          ) : (
            <Icon className={cn('h-[22px] w-[22px]', highlight && 'text-[#7C3AED]')} />
          )}
        </button>

        {/* Tooltip */}
        <div
          className={cn(
            'absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100]',
            'px-3 py-2 bg-[#111827] text-white text-[13px] font-medium rounded-lg',
            'whitespace-nowrap shadow-lg',
            'opacity-0 invisible translate-x-1',
            'group-hover:opacity-100 group-hover:visible group-hover:translate-x-0',
            'transition-all duration-150 delay-300',
            'pointer-events-none'
          )}
        >
          {tooltip || label}
          {/* Seta apontando para esquerda */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#111827]" />
        </div>
      </div>
    );
  }

  // Estado expandido: ícone + label + badges
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 rounded-[10px] mx-2',
        'transition-all duration-200',

        // Item ativo (seção principal)
        isActive && !isSecondary && [
          'bg-[#EDE9FE] text-[#7C3AED] font-semibold dark:bg-[#7C3AED]/20',
          'border-l-[3px] border-[#7C3AED] -ml-0.5',
        ],

        // Item CTA especial (Gerar Artigo)
        highlight && [
          'bg-gradient-to-r from-[#EDE9FE] to-[#DBEAFE] dark:from-[#7C3AED]/20 dark:to-[#3B82F6]/20',
          'border border-[#C4B5FD] dark:border-[#7C3AED]/50',
        ],

        // Normal
        !isActive && !highlight && [
          'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] dark:hover:bg-gray-700 dark:hover:text-white',
          !isSecondary && 'hover:scale-[1.02] hover:shadow-sm',
        ],

        // Padding diferente por seção
        isSecondary ? 'px-3.5 py-2.5' : 'px-4 py-3'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={cn(
          'shrink-0 transition-colors',
          highlight && 'text-[#7C3AED]',
          isSecondary ? 'h-5 w-5' : 'h-[22px] w-[22px]'
        )}
      />

      <span className="flex-1 text-left text-sm font-medium">{label}</span>

      {/* Badge "Novo" para CTA */}
      {highlight && (
        <span className="px-2 py-0.5 bg-[#7C3AED] text-white text-xs font-semibold rounded-full">
          Novo
        </span>
      )}

      {/* Badge numérico ou texto */}
      {badge && !highlight && (
        <span
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full',
            badgeType === 'default' && 'bg-[#F3F4F6] text-[#4B5563] dark:bg-gray-700 dark:text-gray-300',
            badgeType === 'success' && 'bg-[#DCFCE7] text-[#16A34A] dark:bg-green-900/30 dark:text-green-400',
            badgeType === 'purple' && 'bg-[#EDE9FE] text-[#7C3AED] dark:bg-[#7C3AED]/20 badge-pulse'
          )}
        >
          {/* Ícone Star para badge purple */}
          {BadgeIcon && <BadgeIcon className="h-2.5 w-2.5 fill-current" />}

          {/* Dot pulsante para success */}
          {pulseDot && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#16A34A]" />
            </span>
          )}

          {badge}
        </span>
      )}
    </button>
  );
}
