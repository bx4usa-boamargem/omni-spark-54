import { useState, useEffect } from 'react';
import { Globe, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { DomainsTable, DomainRow } from '@/components/domains/DomainsTable';
import { AddDomainDialog } from '@/components/domains/AddDomainDialog';
import { DnsInstructionsCard } from '@/components/domains/DnsInstructionsCard';
import { DomainStatus } from '@/components/domains/DomainStatusBadge';

export default function ClientDomains() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<DomainRow | null>(null);

  const fetchDomains = async () => {
    if (!tenant?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_domains')
        .select(`
          id,
          domain,
          domain_type,
          status,
          is_primary,
          blog_id,
          verification_token,
          created_at,
          blogs:blog_id (
            name
          )
        `)
        .eq('tenant_id', tenant.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedDomains: DomainRow[] = (data || []).map((d: any) => ({
        id: d.id,
        domain: d.domain,
        domain_type: d.domain_type as 'subdomain' | 'custom',
        status: d.status as DomainStatus,
        is_primary: d.is_primary || false,
        blog_id: d.blog_id,
        blog_name: d.blogs?.name || null,
        verification_token: d.verification_token,
        created_at: d.created_at,
      }));

      setDomains(formattedDomains);
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchDomains();
    }
  }, [tenant?.id]);

  const handleDomainAdded = () => {
    fetchDomains();
    setIsAddDialogOpen(false);
  };

  const handleSelectDomain = (domain: DomainRow) => {
    setSelectedDomain(domain);
  };

  const handleDomainVerified = () => {
    fetchDomains();
    setSelectedDomain(null);
  };

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Globe className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Tenant não encontrado</h2>
        <p className="text-muted-foreground">
          Não foi possível carregar as informações do tenant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Domínios
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os domínios e subdomínios da sua subconta
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Domínio
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{domains.length}</div>
            <p className="text-xs text-muted-foreground">Total de Domínios</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">
              {domains.filter(d => d.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-500">
              {domains.filter(d => d.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {domains.filter(d => d.domain_type === 'custom').length}
            </div>
            <p className="text-xs text-muted-foreground">Customizados</p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Domains Table */}
        <div className={selectedDomain ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {loading ? (
            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : domains.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum domínio cadastrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione um subdomínio Omniseen ou configure seu domínio próprio
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Domínio
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <DomainsTable
              domains={domains}
              onRefresh={fetchDomains}
              onSelectDomain={handleSelectDomain}
            />
          )}
        </div>

        {/* DNS Instructions Panel */}
        {selectedDomain && selectedDomain.status === 'pending' && selectedDomain.verification_token && (
          <div className="lg:col-span-1">
            <DnsInstructionsCard
              domain={selectedDomain.domain}
              verificationToken={selectedDomain.verification_token}
              blogId={selectedDomain.blog_id || ''}
              onVerified={handleDomainVerified}
            />
          </div>
        )}
      </div>

      {/* Add Domain Dialog */}
      <AddDomainDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        tenantId={tenant.id}
        onDomainAdded={handleDomainAdded}
      />
    </div>
  );
}
