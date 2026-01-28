import { useNavigate } from 'react-router-dom';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarHeaderProps {
  expanded: boolean;
  pinned: boolean;
  onTogglePin: () => void;
}

/**
 * Header da sidebar com logo animada e botão PIN
 * - Colapsado: Logo 40x40px com letra "O"
 * - Expandido: Logo 48x48px + "OmnisEen" + botão PIN
 */
export function SidebarHeader({ expanded, pinned, onTogglePin }: SidebarHeaderProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        'h-16 flex items-center border-b border-[#E5E7EB] dark:border-gray-700',
        'transition-all duration-300',
        expanded ? 'px-4 gap-3' : 'justify-center px-4'
      )}
    >
      {/* Logo - Cresce de 40px para 48px ao expandir */}
      <button
        onClick={() => navigate('/client/dashboard')}
        className={cn(
          'rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6]',
          'flex items-center justify-center',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50',
          expanded ? 'w-12 h-12' : 'w-10 h-10'
        )}
        aria-label="Ir para Dashboard"
      >
        <span
          className={cn(
            'text-white font-bold transition-all duration-300',
            expanded ? 'text-xl' : 'text-lg'
          )}
        >
          O
        </span>
      </button>

      {/* Nome "OmnisEen" - apenas quando expandido */}
      {expanded && (
        <span className="text-lg font-semibold text-[#111827] dark:text-white flex-1 animate-fade-in">
          OmnisEen
        </span>
      )}

      {/* Botão PIN - apenas quando expandido */}
      {expanded && (
        <button
          onClick={onTogglePin}
          className={cn(
            'p-1.5 rounded-md transition-all duration-200',
            pinned
              ? 'text-[#7C3AED] bg-[#EDE9FE] dark:bg-[#7C3AED]/20'
              : 'text-[#9CA3AF] hover:text-[#7C3AED] hover:bg-[#F3F4F6] dark:hover:bg-gray-700'
          )}
          aria-label={pinned ? 'Desafixar sidebar' : 'Fixar sidebar'}
          aria-expanded={pinned}
        >
          <Pin className={cn('h-4 w-4 transition-transform', pinned && 'rotate-45')} />
        </button>
      )}
    </div>
  );
}
