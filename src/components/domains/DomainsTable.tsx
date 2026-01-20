import { useState } from 'react';
import { ExternalLink, MoreHorizontal, Trash2, Star, RefreshCw, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DomainStatusBadge, DomainStatus } from './DomainStatusBadge';

export interface DomainRow {
  id: string;
  domain: string;
  domain_type: 'subdomain' | 'custom';
  status: DomainStatus;
  is_primary: boolean;
  blog_id: string | null;
  blog_name: string | null;
  verification_token: string | null;
  created_at: string;
}

interface DomainsTableProps {
  domains: DomainRow[];
  onRefresh: () => void;
  onSelectDomain: (domain: DomainRow) => void;
}

export function DomainsTable({ domains, onRefresh, onSelectDomain }: DomainsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleSetPrimary = async (domain: DomainRow) => {
    try {
      // First, unset all primary flags for this tenant's domains
      const { error: unsetError } = await supabase
        .from('tenant_domains')
        .update({ is_primary: false })
        .eq('blog_id', domain.blog_id);

      if (unsetError) throw unsetError;

      // Then set this domain as primary
      const { error: setError } = await supabase
        .from('tenant_domains')
        .update({ is_primary: true })
        .eq('id', domain.id);

      if (setError) throw setError;

      toast.success(`${domain.domain} definido como primário`);
      onRefresh();
    } catch (error) {
      console.error('Error setting primary domain:', error);
      toast.error('Erro ao definir domínio primário');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from('tenant_domains')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;

      toast.success('Domínio removido com sucesso');
      onRefresh();
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast.error('Erro ao remover domínio');
    } finally {
      setDeletingId(null);
    }
  };

  const handleVerify = async (domain: DomainRow) => {
    if (!domain.blog_id) return;

    setVerifyingId(domain.id);
    try {
      const { data, error } = await supabase.functions.invoke('verify-domain', {
        body: { blogId: domain.blog_id }
      });

      if (error) throw error;

      if (data?.verified) {
        toast.success('Domínio verificado com sucesso!');
        onRefresh();
      } else {
        toast.error('Verificação falhou. Verifique sua configuração DNS.');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Erro ao verificar domínio');
    } finally {
      setVerifyingId(null);
    }
  };

  const getDomainTypeLabel = (type: string) => {
    return type === 'subdomain' ? 'Subdomínio' : 'Customizado';
  };

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Domínio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Blog</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {domains.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <p>Nenhum domínio cadastrado</p>
                    <p className="text-sm">Adicione um domínio para começar</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {domain.is_primary && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                      {domain.status === 'active' ? (
                        <a
                          href={`https://${domain.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {domain.domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-foreground">{domain.domain}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {getDomainTypeLabel(domain.domain_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {domain.blog_name || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DomainStatusBadge status={domain.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {domain.status === 'pending' && domain.domain_type === 'custom' && (
                          <DropdownMenuItem 
                            onClick={() => onSelectDomain(domain)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver instruções DNS
                          </DropdownMenuItem>
                        )}
                        {domain.status === 'pending' && domain.domain_type === 'custom' && (
                          <DropdownMenuItem 
                            onClick={() => handleVerify(domain)}
                            disabled={verifyingId === domain.id}
                            className="gap-2"
                          >
                            <RefreshCw className={`h-4 w-4 ${verifyingId === domain.id ? 'animate-spin' : ''}`} />
                            Verificar domínio
                          </DropdownMenuItem>
                        )}
                        {domain.status === 'active' && !domain.is_primary && (
                          <DropdownMenuItem 
                            onClick={() => handleSetPrimary(domain)}
                            className="gap-2"
                          >
                            <Star className="h-4 w-4" />
                            Definir como primário
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeletingId(domain.id)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover domínio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O domínio será desvinculado e não funcionará mais.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
