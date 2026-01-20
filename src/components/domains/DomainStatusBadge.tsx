import { CheckCircle2, Clock, XCircle, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type DomainStatus = 'active' | 'pending' | 'error' | 'suspended';

interface DomainStatusBadgeProps {
  status: DomainStatus;
  className?: string;
}

const statusConfig: Record<DomainStatus, { 
  label: string; 
  icon: React.ElementType; 
  className: string;
}> = {
  active: {
    label: 'Ativo',
    icon: CheckCircle2,
    className: 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20',
  },
  pending: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20',
  },
  error: {
    label: 'Erro',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20',
  },
  suspended: {
    label: 'Suspenso',
    icon: Ban,
    className: 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500/20',
  },
};

export function DomainStatusBadge({ status, className }: DomainStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center gap-1.5 font-medium',
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
