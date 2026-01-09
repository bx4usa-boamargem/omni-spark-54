import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Tooltip, Legend } from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target,
  Award,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversionData {
  id: string;
  converted_at: string;
  subscription_plan: string;
  subscription_amount_cents: number;
  commission_amount_cents: number;
  status: string;
  referral_id: string;
}

interface ReferralData {
  id: string;
  referrer_user_id: string;
  referral_code: string;
  click_count: number;
}

interface TopReferrer {
  userId: string;
  code: string;
  name: string;
  conversions: number;
  revenue: number;
  commissions: number;
  clicks: number;
  conversionRate: number;
}

export function ReferralAnalytics() {
  const [conversions, setConversions] = useState<ConversionData[]>([]);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();

      const [conversionsRes, referralsRes] = await Promise.all([
        supabase
          .from('referral_conversions')
          .select('*')
          .gte('converted_at', startDate)
          .order('converted_at', { ascending: true }),
        supabase
          .from('referrals')
          .select('*'),
      ]);

      if (conversionsRes.error) throw conversionsRes.error;
      if (referralsRes.error) throw referralsRes.error;

      setConversions(conversionsRes.data || []);
      setReferrals(referralsRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalRevenue = conversions.reduce((sum, c) => sum + c.subscription_amount_cents, 0);
    const totalCommissions = conversions.reduce((sum, c) => sum + c.commission_amount_cents, 0);
    const paidCommissions = conversions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount_cents, 0);
    const pendingCommissions = conversions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount_cents, 0);
    const totalClicks = referrals.reduce((sum, r) => sum + r.click_count, 0);
    const avgTicket = conversions.length > 0 ? totalRevenue / conversions.length : 0;
    const conversionRate = totalClicks > 0 ? (conversions.length / totalClicks) * 100 : 0;
    const roi = totalCommissions > 0 ? ((totalRevenue - totalCommissions) / totalCommissions) * 100 : 0;

    return {
      totalRevenue,
      totalCommissions,
      paidCommissions,
      pendingCommissions,
      totalConversions: conversions.length,
      avgTicket,
      conversionRate,
      roi,
      totalClicks,
    };
  }, [conversions, referrals]);

  // Prepare daily chart data
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({
      start: subDays(new Date(), parseInt(dateRange)),
      end: new Date(),
    });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayConversions = conversions.filter(c => {
        const convDate = startOfDay(new Date(c.converted_at));
        return convDate.getTime() === dayStart.getTime();
      });

      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        conversions: dayConversions.length,
        revenue: dayConversions.reduce((sum, c) => sum + c.subscription_amount_cents, 0) / 100,
        commissions: dayConversions.reduce((sum, c) => sum + c.commission_amount_cents, 0) / 100,
      };
    });
  }, [conversions, dateRange]);

  // Conversions by plan
  const planData = useMemo(() => {
    const plans: Record<string, { count: number; revenue: number }> = {};
    conversions.forEach(c => {
      const plan = c.subscription_plan || 'unknown';
      if (!plans[plan]) plans[plan] = { count: 0, revenue: 0 };
      plans[plan].count++;
      plans[plan].revenue += c.subscription_amount_cents;
    });

    return Object.entries(plans).map(([plan, data]) => ({
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      conversions: data.count,
      revenue: data.revenue / 100,
    })).sort((a, b) => b.conversions - a.conversions);
  }, [conversions]);

  // Top referrers
  const topReferrers = useMemo(() => {
    const referrerStats: Record<string, TopReferrer> = {};

    referrals.forEach(r => {
      referrerStats[r.id] = {
        userId: r.referrer_user_id,
        code: r.referral_code,
        name: r.referral_code,
        conversions: 0,
        revenue: 0,
        commissions: 0,
        clicks: r.click_count,
        conversionRate: 0,
      };
    });

    conversions.forEach(c => {
      if (referrerStats[c.referral_id]) {
        referrerStats[c.referral_id].conversions++;
        referrerStats[c.referral_id].revenue += c.subscription_amount_cents;
        referrerStats[c.referral_id].commissions += c.commission_amount_cents;
      }
    });

    return Object.values(referrerStats)
      .map(r => ({
        ...r,
        conversionRate: r.clicks > 0 ? (r.conversions / r.clicks) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [conversions, referrals]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const chartConfig = {
    conversions: { label: "Conversões", color: "hsl(var(--primary))" },
    revenue: { label: "Receita", color: "hsl(var(--chart-1))" },
    commissions: { label: "Comissões", color: "hsl(var(--chart-2))" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Gerada</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              via {stats.totalConversions} conversões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissões</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCommissions)}</div>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                Pendente: {formatCurrency(stats.pendingCommissions)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROI do Programa</CardTitle>
            {stats.roi > 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.roi.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lucro: {formatCurrency(stats.totalRevenue - stats.totalCommissions)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalClicks} cliques → {stats.totalConversions} vendas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversions Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversões ao Longo do Tempo</CardTitle>
            <CardDescription>Número de conversões e receita diária</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="conversions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue vs Commissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receita x Comissões</CardTitle>
            <CardDescription>Margem entre receita gerada e comissões pagas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="commissions"
                    stackId="2"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversions by Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversões por Plano</CardTitle>
            <CardDescription>Distribuição de vendas por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            {planData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis type="category" dataKey="plan" className="text-xs" width={80} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="conversions" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhuma conversão no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top 10 Indicadores
            </CardTitle>
            <CardDescription>Ranking dos indicadores mais eficientes</CardDescription>
          </CardHeader>
          <CardContent>
            {topReferrers.length > 0 ? (
              <div className="space-y-3">
                {topReferrers.map((referrer, index) => (
                  <div
                    key={referrer.code}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{referrer.code}</div>
                        <div className="text-xs text-muted-foreground">
                          {referrer.conversions} conversões • {referrer.conversionRate.toFixed(1)}% taxa
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-green-600">
                        {formatCurrency(referrer.revenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Comissão: {formatCurrency(referrer.commissions)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum indicador com conversões no período</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funil de Indicações</CardTitle>
          <CardDescription>Jornada do clique até a conversão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="text-center px-6 py-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{stats.totalClicks}</div>
              <div className="text-sm text-muted-foreground">Cliques</div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="text-center px-6 py-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold">{referrals.length}</div>
              <div className="text-sm text-muted-foreground">Indicadores</div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="text-center px-6 py-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-3xl font-bold text-primary">{stats.totalConversions}</div>
              <div className="text-sm text-muted-foreground">Conversões</div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="text-center px-6 py-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</div>
              <div className="text-sm text-muted-foreground">Receita</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
