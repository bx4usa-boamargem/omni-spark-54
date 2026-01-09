import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, Percent, Clock, Target, AlertTriangle } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from "recharts";

interface MonthlyData {
  month: string;
  revenue: number;
  cost: number;
  margin: number;
  newUsers: number;
  canceledUsers: number;
}

interface MonthlyPlanRevenue {
  month: string;
  essential: number;
  plus: number;
  scale: number;
  total: number;
}

interface ProjectionData {
  month: string;
  historical?: number;
  base?: number;
  conservative?: number;
  optimistic?: number;
  isProjection: boolean;
}

interface FinancialMetrics {
  mrr: number;
  arr: number;
  churn: number;
  ltv: number;
  arpu: number;
  margin: number;
  mrrChange: number;
  churnChange: number;
}

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  essential: 29,
  plus: 79,
  scale: 199,
  internal: 0,
};

const PLAN_COLORS: Record<string, string> = {
  essential: "#22c55e",
  plus: "#6366f1",
  scale: "#f59e0b",
};

export function FinancialReportsTab() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    mrr: 0,
    arr: 0,
    churn: 0,
    ltv: 0,
    arpu: 0,
    margin: 0,
    mrrChange: 0,
    churnChange: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [planRevenueData, setPlanRevenueData] = useState<MonthlyPlanRevenue[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);

    try {
      // Fetch all subscriptions
      const { data: subsData } = await supabase
        .from("subscriptions")
        .select("plan, status, created_at, canceled_at");

      const subs = subsData || [];
      setSubscriptions(subs);

      // Calculate MRR
      const activeSubscriptions = subs.filter(s => s.status === "active");
      const mrr = activeSubscriptions.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);
      const arr = mrr * 12;

      // Calculate Churn
      const thisMonth = new Date();
      const lastMonth = subMonths(thisMonth, 1);
      
      const canceledThisMonth = subs.filter(s => {
        if (!s.canceled_at) return false;
        const cancelDate = new Date(s.canceled_at);
        return cancelDate >= startOfMonth(thisMonth) && cancelDate <= endOfMonth(thisMonth);
      }).length;

      const activeLastMonth = subs.filter(s => {
        const createDate = new Date(s.created_at);
        return createDate < startOfMonth(thisMonth) && 
               (!s.canceled_at || new Date(s.canceled_at) >= startOfMonth(thisMonth));
      }).length || 1;

      const churn = (canceledThisMonth / activeLastMonth) * 100;

      // Calculate LTV
      const avgMonthlyChurn = churn / 100 || 0.02;
      const arpu = activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0;
      const ltv = avgMonthlyChurn > 0 ? arpu / avgMonthlyChurn : arpu * 24;

      // Fetch costs
      const { data: costs } = await supabase
        .from("consumption_logs")
        .select("estimated_cost_usd, created_at")
        .gte("created_at", startOfMonth(thisMonth).toISOString());

      const totalCost = costs?.reduce((sum, c) => sum + (c.estimated_cost_usd || 0), 0) || 0;
      const margin = mrr > 0 ? ((mrr - totalCost) / mrr) * 100 : 0;

      // Calculate previous month metrics for comparison
      const prevActiveSubscriptions = subs.filter(s => {
        const createDate = new Date(s.created_at);
        return createDate < startOfMonth(thisMonth) && 
               (!s.canceled_at || new Date(s.canceled_at) >= endOfMonth(lastMonth));
      });

      const prevMrr = prevActiveSubscriptions.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);
      const mrrChange = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0;

      setMetrics({
        mrr,
        arr,
        churn,
        ltv,
        arpu,
        margin,
        mrrChange,
        churnChange: 0,
      });

      // Generate monthly data for charts (last 12 months)
      const monthlyChartData: MonthlyData[] = [];
      const planRevenue: MonthlyPlanRevenue[] = [];
      
      for (let i = 11; i >= 0; i--) {
        const month = subMonths(thisMonth, i);
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthSubscriptions = subs.filter(s => {
          const createDate = new Date(s.created_at);
          return createDate <= monthEnd && 
                 (!s.canceled_at || new Date(s.canceled_at) > monthStart);
        });

        const monthRevenue = monthSubscriptions.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);

        // Count by plan
        const planCounts = { essential: 0, plus: 0, scale: 0 };
        monthSubscriptions.forEach(s => {
          if (s.plan in planCounts) {
            planCounts[s.plan as keyof typeof planCounts]++;
          }
        });

        planRevenue.push({
          month: format(month, "MMM/yy", { locale: ptBR }),
          essential: planCounts.essential * PLAN_PRICES.essential,
          plus: planCounts.plus * PLAN_PRICES.plus,
          scale: planCounts.scale * PLAN_PRICES.scale,
          total: monthRevenue,
        });

        const { data: monthCosts } = await supabase
          .from("consumption_logs")
          .select("estimated_cost_usd")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const monthCost = monthCosts?.reduce((sum, c) => sum + (c.estimated_cost_usd || 0), 0) || 0;

        monthlyChartData.push({
          month: format(month, "MMM", { locale: ptBR }),
          revenue: monthRevenue,
          cost: monthCost,
          margin: monthRevenue > 0 ? ((monthRevenue - monthCost) / monthRevenue) * 100 : 0,
          newUsers: subs.filter(s => {
            const createDate = new Date(s.created_at);
            return createDate >= monthStart && createDate <= monthEnd;
          }).length,
          canceledUsers: subs.filter(s => {
            if (!s.canceled_at) return false;
            const cancelDate = new Date(s.canceled_at);
            return cancelDate >= monthStart && cancelDate <= monthEnd;
          }).length,
        });
      }

      setMonthlyData(monthlyChartData);
      setPlanRevenueData(planRevenue);
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate projections
  const projections = useMemo(() => {
    if (planRevenueData.length < 2) {
      return { threeMonths: null, sixMonths: null, twelveMonths: null, growthRate: 0, confidence: 'low' };
    }

    // Calculate average monthly growth rate from last 6 months
    const recentMonths = planRevenueData.slice(-6);
    let totalGrowth = 0;
    let validMonths = 0;

    for (let i = 1; i < recentMonths.length; i++) {
      if (recentMonths[i - 1].total > 0) {
        const growth = (recentMonths[i].total - recentMonths[i - 1].total) / recentMonths[i - 1].total;
        totalGrowth += growth;
        validMonths++;
      }
    }

    const avgGrowthRate = validMonths > 0 ? totalGrowth / validMonths : 0.05;
    const currentMRR = planRevenueData[planRevenueData.length - 1]?.total || 0;

    const projectRevenue = (months: number) => ({
      base: currentMRR * Math.pow(1 + avgGrowthRate, months),
      conservative: currentMRR * Math.pow(1 + (avgGrowthRate * 0.7), months),
      optimistic: currentMRR * Math.pow(1 + (avgGrowthRate * 1.3), months),
    });

    const confidence = validMonths < 3 ? 'low' : validMonths < 6 ? 'medium' : 'high';

    return {
      threeMonths: projectRevenue(3),
      sixMonths: projectRevenue(6),
      twelveMonths: projectRevenue(12),
      growthRate: avgGrowthRate * 100,
      confidence,
    };
  }, [planRevenueData]);

  // Combined historical + projection data for chart
  const projectionChartData = useMemo((): ProjectionData[] => {
    const data: ProjectionData[] = [];
    
    // Add historical data (last 6 months for cleaner view)
    planRevenueData.slice(-6).forEach(m => {
      data.push({
        month: m.month,
        historical: m.total,
        isProjection: false,
      });
    });

    if (projections.threeMonths) {
      const currentMRR = planRevenueData[planRevenueData.length - 1]?.total || 0;
      const growthRate = (projections.growthRate || 0) / 100;

      // Add projection months
      for (let i = 1; i <= 12; i++) {
        const month = addMonths(new Date(), i);
        data.push({
          month: format(month, "MMM/yy", { locale: ptBR }),
          base: currentMRR * Math.pow(1 + growthRate, i),
          conservative: currentMRR * Math.pow(1 + (growthRate * 0.7), i),
          optimistic: currentMRR * Math.pow(1 + (growthRate * 1.3), i),
          isProjection: true,
        });
      }
    }

    return data;
  }, [planRevenueData, projections]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Alta Confiança</Badge>;
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Média Confiança</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Baixa Confiança</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</div>
            <div className="flex items-center gap-1 mt-1">
              {metrics.mrrChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm ${metrics.mrrChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                {metrics.mrrChange >= 0 ? "+" : ""}{metrics.mrrChange.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.arr)}</div>
            <p className="text-xs text-muted-foreground mt-1">Receita anual recorrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.churn.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Cancelamentos no mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">LTV</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.ltv)}</div>
            <p className="text-xs text-muted-foreground mt-1">Valor vitalício do cliente</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.arpu)}</div>
            <p className="text-xs text-muted-foreground mt-1">Receita média por usuário</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margem Operacional</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.margin.toFixed(1)}%
              <Badge 
                variant="outline" 
                className={`ml-2 ${metrics.margin >= 70 ? "text-green-500 border-green-500" : metrics.margin >= 50 ? "text-amber-500 border-amber-500" : "text-red-500 border-red-500"}`}
              >
                {metrics.margin >= 70 ? "Saudável" : metrics.margin >= 50 ? "Atenção" : "Crítico"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receita - Custos de IA</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Receita vs Custo</CardTitle>
          <CardDescription>Evolução financeira dos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData.slice(-6)}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Receita"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#revenueGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Custo"
                  stroke="hsl(var(--destructive))"
                  fillOpacity={1}
                  fill="url(#costGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Plan Chart - 12 months */}
      <Card>
        <CardHeader>
          <CardTitle>Receita por Plano</CardTitle>
          <CardDescription>Comparativo dos últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={planRevenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`$${value.toFixed(0)}`, ""]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="essential"
                  name="Essential"
                  stroke={PLAN_COLORS.essential}
                  strokeWidth={2}
                  dot={{ fill: PLAN_COLORS.essential, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="plus"
                  name="Plus"
                  stroke={PLAN_COLORS.plus}
                  strokeWidth={2}
                  dot={{ fill: PLAN_COLORS.plus, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="scale"
                  name="Scale"
                  stroke={PLAN_COLORS.scale}
                  strokeWidth={2}
                  dot={{ fill: PLAN_COLORS.scale, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Projection Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              Projeção de Receita
            </h3>
            <p className="text-sm text-muted-foreground">
              Baseado na taxa de crescimento de {projections.growthRate.toFixed(1)}% ao mês
            </p>
          </div>
          {getConfidenceBadge(projections.confidence)}
        </div>

        {/* Projection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 3 Months Projection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                3 Meses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Base</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {formatCurrency(projections.threeMonths?.base || 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400">Conservador</p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {formatCurrency(projections.threeMonths?.conservative || 0)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-xs text-green-600 dark:text-green-400">Otimista</p>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    {formatCurrency(projections.threeMonths?.optimistic || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 6 Months Projection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Base</p>
                <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {formatCurrency(projections.sixMonths?.base || 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400">Conservador</p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {formatCurrency(projections.sixMonths?.conservative || 0)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-xs text-green-600 dark:text-green-400">Otimista</p>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    {formatCurrency(projections.sixMonths?.optimistic || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 12 Months Projection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                12 Meses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Base</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {formatCurrency(projections.twelveMonths?.base || 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400">Conservador</p>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {formatCurrency(projections.twelveMonths?.conservative || 0)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-xs text-green-600 dark:text-green-400">Otimista</p>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                    {formatCurrency(projections.twelveMonths?.optimistic || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projection Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico + Projeção</CardTitle>
            <CardDescription>Receita dos últimos 6 meses e projeção para os próximos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(0)}`,
                      name === 'historical' ? 'Histórico' :
                      name === 'base' ? 'Base' :
                      name === 'conservative' ? 'Conservador' : 'Otimista'
                    ]}
                  />
                  <Legend 
                    formatter={(value) => 
                      value === 'historical' ? 'Histórico' :
                      value === 'base' ? 'Base' :
                      value === 'conservative' ? 'Conservador' : 'Otimista'
                    }
                  />
                  <ReferenceLine 
                    x={projectionChartData.find(d => d.isProjection)?.month} 
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    label={{ value: 'Projeção →', position: 'top', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="historical"
                    name="historical"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 5 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="base"
                    name="base"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#3b82f6", r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="conservative"
                    name="conservative"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ fill: "#f59e0b", r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="optimistic"
                    name="optimistic"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ fill: "#22c55e", r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Warning if low confidence */}
        {projections.confidence === 'low' && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Poucos dados históricos disponíveis
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                As projeções são mais precisas com pelo menos 6 meses de dados. Continue acompanhando para melhorar a confiabilidade.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
