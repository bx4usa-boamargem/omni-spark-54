import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Bot, DollarSign, MessageSquare, Users, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgentData {
  blog_id: string;
  blog_name: string;
  is_enabled: boolean;
  agent_subscription_status: string | null;
  agent_subscription_started_at: string | null;
  tokens_used_today: number;
  max_tokens_per_day: number;
  conversations_count: number;
  leads_count: number;
  total_cost_usd: number;
  monthly_price_usd: number;
}

export function BrandAgentsTab() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const AGENT_PRICE_USD = 47.00;

  useEffect(() => {
    fetchAgentsData();
  }, []);

  const fetchAgentsData = async () => {
    setLoading(true);
    try {
      // Get all brand agent configs with blog info
      const { data: configs, error: configError } = await supabase
        .from('brand_agent_config')
        .select(`
          blog_id,
          is_enabled,
          agent_subscription_status,
          agent_subscription_started_at,
          tokens_used_today,
          max_tokens_per_day,
          monthly_price_usd,
          blogs!brand_agent_config_blog_id_fkey(name)
        `);

      if (configError) throw configError;

      // Get conversations and leads counts for current month
      const startOfCurrentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endOfCurrentMonth = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data: conversations } = await supabase
        .from('brand_agent_conversations')
        .select('blog_id')
        .gte('created_at', startOfCurrentMonth)
        .lte('created_at', endOfCurrentMonth);

      const { data: leads } = await supabase
        .from('brand_agent_leads')
        .select('blog_id')
        .gte('created_at', startOfCurrentMonth)
        .lte('created_at', endOfCurrentMonth);

      // Get consumption costs
      const { data: costs } = await supabase
        .from('consumption_logs')
        .select('blog_id, estimated_cost_usd')
        .in('action_type', ['brand_agent_chat', 'brand_agent_lead'])
        .gte('created_at', startOfCurrentMonth)
        .lte('created_at', endOfCurrentMonth);

      // Aggregate data per blog
      const conversationsByBlog = new Map<string, number>();
      conversations?.forEach(c => {
        conversationsByBlog.set(c.blog_id, (conversationsByBlog.get(c.blog_id) || 0) + 1);
      });

      const leadsByBlog = new Map<string, number>();
      leads?.forEach(l => {
        leadsByBlog.set(l.blog_id, (leadsByBlog.get(l.blog_id) || 0) + 1);
      });

      const costsByBlog = new Map<string, number>();
      costs?.forEach(c => {
        if (c.blog_id) {
          costsByBlog.set(c.blog_id, (costsByBlog.get(c.blog_id) || 0) + (c.estimated_cost_usd || 0));
        }
      });

      // Build agents array
      const agentsData: AgentData[] = (configs || []).map(config => ({
        blog_id: config.blog_id,
        blog_name: (config.blogs as any)?.name || 'Blog',
        is_enabled: config.is_enabled || false,
        agent_subscription_status: config.agent_subscription_status,
        agent_subscription_started_at: config.agent_subscription_started_at,
        tokens_used_today: config.tokens_used_today || 0,
        max_tokens_per_day: config.max_tokens_per_day || 10000,
        conversations_count: conversationsByBlog.get(config.blog_id) || 0,
        leads_count: leadsByBlog.get(config.blog_id) || 0,
        total_cost_usd: costsByBlog.get(config.blog_id) || 0,
        monthly_price_usd: config.monthly_price_usd || AGENT_PRICE_USD,
      }));

      setAgents(agentsData);
    } catch (error) {
      console.error('Error fetching agents data:', error);
      toast.error('Erro ao carregar dados dos agentes');
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentSubscription = async (blogId: string, newStatus: boolean) => {
    setToggling(blogId);
    try {
      const { error } = await supabase
        .from('brand_agent_config')
        .update({
          is_enabled: newStatus,
          agent_subscription_status: newStatus ? 'active' : 'inactive',
          agent_subscription_started_at: newStatus ? new Date().toISOString() : null,
        })
        .eq('blog_id', blogId);

      if (error) throw error;

      setAgents(prev => prev.map(a => 
        a.blog_id === blogId 
          ? { ...a, is_enabled: newStatus, agent_subscription_status: newStatus ? 'active' : 'inactive' }
          : a
      ));

      toast.success(newStatus ? 'Agente ativado!' : 'Agente desativado');
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast.error('Erro ao alterar status do agente');
    } finally {
      setToggling(null);
    }
  };

  // Calculate summary metrics
  const activeAgents = agents.filter(a => a.agent_subscription_status === 'active').length;
  const mrrAgents = activeAgents * AGENT_PRICE_USD;
  const totalCost = agents.reduce((sum, a) => sum + a.total_cost_usd, 0);
  const netMargin = mrrAgents > 0 ? ((mrrAgents - totalCost) / mrrAgents * 100) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Ativo</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">Trial</Badge>;
      case 'canceled':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">Inativo</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Agentes de IA - Upsell
          </h2>
          <p className="text-muted-foreground">
            Gerencie os agentes de vendas IA das subcontas • ${AGENT_PRICE_USD}/mês por agente
          </p>
        </div>
        <Button variant="outline" onClick={fetchAgentsData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Agentes Ativos</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAgents}</div>
            <p className="text-xs text-muted-foreground">de {agents.length} configurados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR de Agentes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(mrrAgents)}</div>
            <p className="text-xs text-muted-foreground">{activeAgents} × ${AGENT_PRICE_USD}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total IA</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
            {netMargin >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Lucro: {formatCurrency(mrrAgents - totalCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agentes por Subconta</CardTitle>
          <CardDescription>
            Controle de ativação e métricas de uso dos agentes de vendas IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blog</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Conversas</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-right">Custo IA</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum agente configurado
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => {
                  const revenue = agent.agent_subscription_status === 'active' ? agent.monthly_price_usd : 0;
                  const profit = revenue - agent.total_cost_usd;
                  
                  return (
                    <TableRow key={agent.blog_id}>
                      <TableCell className="font-medium">{agent.blog_name}</TableCell>
                      <TableCell>{getStatusBadge(agent.agent_subscription_status)}</TableCell>
                      <TableCell className="text-center">{agent.conversations_count}</TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3" />
                          {agent.leads_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(agent.total_cost_usd)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">
                        {formatCurrency(revenue)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                      </TableCell>
                      <TableCell className="text-center">
                        {toggling === agent.blog_id ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        ) : (
                          <Switch
                            checked={agent.agent_subscription_status === 'active'}
                            onCheckedChange={(checked) => toggleAgentSubscription(agent.blog_id, checked)}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Modelo de Upsell</h3>
              <p className="text-sm text-muted-foreground">
                Cada agente ativo gera uma receita de <strong>${AGENT_PRICE_USD}/mês</strong> (R$ 197/mês). 
                O custo de IA por agente varia conforme o uso. Agentes com alto volume de conversas 
                podem ter custo maior, mas geram mais leads qualificados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}