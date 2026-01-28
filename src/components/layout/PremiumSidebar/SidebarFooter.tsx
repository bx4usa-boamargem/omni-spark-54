import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useBlog } from '@/hooks/useBlog';

interface SidebarFooterProps {
  expanded: boolean;
  onMenuToggle: () => void;
}

/**
 * Footer da sidebar com informações do usuário
 * - Colapsado: Avatar circular com iniciais
 * - Expandido: Avatar + nome do blog + status do plano
 */
export function SidebarFooter({ expanded, onMenuToggle }: SidebarFooterProps) {
  const { user } = useAuth();
  const { blog } = useBlog();

  // Pegar iniciais do nome do blog ou email
  const displayName = blog?.name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="border-t-2 border-[#E5E7EB] dark:border-gray-700 p-4">
      <button
        onClick={onMenuToggle}
        className={cn(
          'transition-all duration-200 cursor-pointer',
          expanded
            ? 'w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F9FAFB] hover:shadow-sm dark:hover:bg-gray-800'
            : 'w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center hover:ring-2 hover:ring-[#7C3AED]/20'
        )}
        aria-label="Abrir menu do usuário"
        aria-haspopup="true"
      >
        {/* Avatar */}
        {expanded ? (
          <>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center shrink-0">
              <span className="text-white font-semibold text-sm">{initials}</span>
            </div>

            {/* Info */}
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5">
                {/* Dot verde pulsante (status online) */}
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-xs text-[#6B7280]">Plano Growth</span>
              </div>
            </div>

            {/* Chevron */}
            <ChevronDown className="h-4 w-4 text-[#9CA3AF] shrink-0" />
          </>
        ) : (
          <span className="text-white font-semibold text-sm">{initials}</span>
        )}
      </button>
    </div>
  );
}
