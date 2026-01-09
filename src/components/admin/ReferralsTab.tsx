import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  RefreshCw,
  Download,
  Search,
  Settings,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReferralSettingsCard } from "./ReferralSettingsCard";
import { ReferralAnalytics } from "./ReferralAnalytics";

interface ReferralWithUser {
  id: string;
  referrer_user_id: string;
  referral_code: string;
  click_count: number;
  is_active: boolean;
  created_at: string;
  referrer_email?: string;
}

interface ConversionWithDetails {
  id: string;
  referral_id: string;
  referred_user_id: string;
  subscription_id: string | null;
  subscription_plan: string | null;
  subscription_amount_cents: number;
  commission_amount_cents: number;
  status: string;
  converted_at: string;
  payment_due_date: string;
  paid_at: string | null;
  notes: string | null;
  referrer_code?: string;
  referrer_email?: string;
  referred_email?: string;
}

interface ReferralStats {
  totalReferrers: number;
  totalConversions: number;
  pendingConversions: number;
  totalPendingAmount: number;
  totalPaidAmount: number;
}

export function ReferralsTab() {
  const { toast } = useToast();
  const [conversions, setConversions] = useState<ConversionWithDetails[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrers: 0,
    totalConversions: 0,
    pendingConversions: 0,
    totalPendingAmount: 0,
    totalPaidAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all referrals
      const { data: referrals, error: refError } = await supabase
        .from('referrals')
        .select('*');

      if (refError) throw refError;

      // Fetch all conversions
      const { data: conversionsData, error: convError } = await supabase
        .from('referral_conversions')
        .select('*')
        .order('converted_at', { ascending: false });

      if (convError) throw convError;

      // Build referral map
      const referralMap = new Map(referrals?.map(r => [r.id, r]) || []);

      // Get unique user IDs
      const userIds = new Set<string>();
      referrals?.forEach(r => userIds.add(r.referrer_user_id));
      conversionsData?.forEach(c => userIds.add(c.referred_user_id));

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', Array.from(userIds));

      // Create profile map
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Enrich conversions with referrer info
      const enrichedConversions: ConversionWithDetails[] = (conversionsData || []).map(c => {
        const referral = referralMap.get(c.referral_id);
        return {
          ...c,
          referrer_code: referral?.referral_code || 'N/A',
          referrer_email: profileMap.get(referral?.referrer_user_id || '') || referral?.referrer_user_id || 'Unknown',
          referred_email: profileMap.get(c.referred_user_id) || c.referred_user_id,
        };
      });

      setConversions(enrichedConversions);

      // Calculate stats
      const pendingConversions = enrichedConversions.filter(c => c.status === 'pending');
      const paidConversions = enrichedConversions.filter(c => c.status === 'paid');

      setStats({
        totalReferrers: referrals?.length || 0,
        totalConversions: enrichedConversions.length,
        pendingConversions: pendingConversions.length,
        totalPendingAmount: pendingConversions.reduce((sum, c) => sum + c.commission_amount_cents, 0),
        totalPaidAmount: paidConversions.reduce((sum, c) => sum + c.commission_amount_cents, 0),
      });

      // Initialize notes
      const notesMap: Record<string, string> = {};
      enrichedConversions.forEach(c => {
        notesMap[c.id] = c.notes || '';
      });
      setNotes(notesMap);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de indicações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (conversionId: string) => {
    setUpdatingId(conversionId);
    try {
      const { error } = await supabase
        .from('referral_conversions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          notes: notes[conversionId] || null,
        })
        .eq('id', conversionId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pagamento marcado como realizado.",
      });

      fetchData();
    } catch (error) {
      console.error('Error updating conversion:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const updateNotes = async (conversionId: string) => {
    try {
      const { error } = await supabase
        .from('referral_conversions')
        .update({ notes: notes[conversionId] || null })
        .eq('id', conversionId);

      if (error) throw error;

      toast({
        title: "Notas salvas",
        description: "As anotações foram atualizadas.",
      });
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Indicador', 'Código', 'Indicado', 'Plano', 'Valor Assinatura', 'Comissão', 'Status', 'Vencimento', 'Pago em', 'Notas'];
    const rows = filteredConversions.map(c => [
      format(new Date(c.converted_at), 'dd/MM/yyyy'),
      c.referrer_email,
      c.referrer_code,
      c.referred_email,
      c.subscription_plan || 'N/A',
      (c.subscription_amount_cents / 100).toFixed(2),
      (c.commission_amount_cents / 100).toFixed(2),
      c.status,
      format(new Date(c.payment_due_date), 'dd/MM/yyyy'),
      c.paid_at ? format(new Date(c.paid_at), 'dd/MM/yyyy') : '',
      c.notes || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `indicacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Aprovado</Badge>;
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Pago</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredConversions = conversions.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      c.referrer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.referred_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.referrer_code?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <Tabs defaultValue="conversions" className="space-y-6">
      <TabsList>
        <TabsTrigger value="conversions" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Conversões
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configurações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="conversions" className="space-y-6">
        {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Indicadores Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Conversões
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingConversions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              A Pagar
            </CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats.totalPendingAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pago
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalPaidAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle>Conversões de Indicações</CardTitle>
              <CardDescription>Gerencie os pagamentos de comissões aos indicadores.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pendentes
              </Button>
              <Button
                variant={statusFilter === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('paid')}
              >
                Pagos
              </Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredConversions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conversão encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Indicador</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Indicado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plano</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Comissão</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Vencimento</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConversions.map((conversion) => (
                    <tr key={conversion.id} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        {format(new Date(conversion.converted_at), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{conversion.referrer_email}</span>
                          <span className="text-xs text-muted-foreground">Código: {conversion.referrer_code}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {conversion.referred_email}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">
                          {conversion.subscription_plan || 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-primary">
                        {formatCurrency(conversion.commission_amount_cents)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {format(new Date(conversion.payment_due_date), "dd/MM/yyyy", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(conversion.status)}
                      </td>
                      <td className="py-3 px-4">
                        {conversion.status === 'pending' && (
                          <div className="flex flex-col gap-2">
                            <Textarea
                              placeholder="Notas (opcional)"
                              value={notes[conversion.id] || ''}
                              onChange={(e) => setNotes(prev => ({ ...prev, [conversion.id]: e.target.value }))}
                              className="text-xs min-h-[60px]"
                              onBlur={() => updateNotes(conversion.id)}
                            />
                            <Button
                              size="sm"
                              onClick={() => markAsPaid(conversion.id)}
                              disabled={updatingId === conversion.id}
                            >
                              {updatingId === conversion.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              Marcar como Pago
                            </Button>
                          </div>
                        )}
                        {conversion.status === 'paid' && conversion.paid_at && (
                          <span className="text-xs text-muted-foreground">
                            Pago em {format(new Date(conversion.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="analytics">
        <ReferralAnalytics />
      </TabsContent>

      <TabsContent value="settings">
        <ReferralSettingsCard />
      </TabsContent>
    </Tabs>
  );
}
