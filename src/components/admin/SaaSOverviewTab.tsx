import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  ImageIcon, 
  Activity,
  Target,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SaaSMetrics {
  mrr: number;
  mrrChange: number;
  activeClients: number;
  newClientsThisMonth: number;
  churnRate: number;
  articlesGenerated: number;
  imagesGenerated: number;
  totalAICost: number;
  revenue: number;
  margin: number;
}

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  essential: 97,
  plus: 197,
  scale: 397,
};

const MRR_TARGET = 10000; // Meta de MRR em USD

export function SaaSOverviewTab() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SaaSMetrics>({
    mrr: 0,
    mrrChange: 0,
    activeClients: 0,
    newClientsThisMonth: 0,
    churnRate: 0,
    articlesGenerated: 0,
    imagesGenerated: 0,
    totalAICost: 0,
    revenue: 0,
    margin: 0,
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);

    try {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const last30Days = subDays(now, 30);

      // Fetch active subscriptions
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("plan, status, created_at")
        .eq("status", "active");

      // Calculate MRR
      let mrr = 0;
      subscriptions?.forEach((sub) => {
        mrr += PLAN_PRICES[sub.plan || "free"] || 0;
      });

      // Fetch previous month subscriptions for MRR change
      const { data: prevMonthSubs } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("status", "active")
        .lt("created_at", startOfCurrentMonth.toISOString());

      let prevMrr = 0;
      prevMonthSubs?.forEach((sub) => {
        prevMrr += PLAN_PRICES[sub.plan || "free"] || 0;
      });

      const mrrChange = prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0;

      // Fetch new clients this month
      const { data: newClients } = await supabase
        .from("profiles")
        .select("user_id")
        .gte("created_at", startOfCurrentMonth.toISOString());

      // Fetch consumption logs for AI costs
      const { data: consumptionLogs } = await supabase
        .from("consumption_logs")
        .select("estimated_cost_usd, images_generated, action_type")
        .gte("created_at", last30Days.toISOString());

      let totalAICost = 0;
      let articlesGenerated = 0;
      let imagesGenerated = 0;

      consumptionLogs?.forEach((log) => {
        totalAICost += log.estimated_cost_usd || 0;
        imagesGenerated += log.images_generated || 0;
        if (log.action_type === "article_generation") articlesGenerated++;
      });

      // Calculate churn (canceled / total active)
      const { data: canceledSubs } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("status", "canceled")
        .gte("updated_at", startOfCurrentMonth.toISOString());

      const totalSubs = (subscriptions?.length || 0) + (canceledSubs?.length || 0);
      const churnRate = totalSubs > 0 ? ((canceledSubs?.length || 0) / totalSubs) * 100 : 0;

      // Revenue and margin
      const revenue = mrr;
      const margin = revenue > 0 ? ((revenue - totalAICost) / revenue) * 100 : 0;

      setMetrics({
        mrr,
        mrrChange,
        activeClients: subscriptions?.length || 0,
        newClientsThisMonth: newClients?.length || 0,
        churnRate,
        articlesGenerated,
        imagesGenerated,
        totalAICost,
        revenue,
        margin,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const mrrProgress = (metrics.mrr / MRR_TARGET) * 100;

  return (
    <div className="space-y-6 mt-4">
      {/* MRR Target Progress */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Meta de MRR
              </CardTitle>
              <CardDescription>Progresso mensal em direção à meta</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{formatCurrency(metrics.mrr)}</p>
              <p className="text-sm text-muted-foreground">de {formatCurrency(MRR_TARGET)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={Math.min(mrrProgress, 100)} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {mrrProgress.toFixed(1)}% da meta alcançada
          </p>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</div>
            <div className="flex items-center gap-1 text-sm">
              {metrics.mrrChange >= 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{metrics.mrrChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{metrics.mrrChange.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeClients}</div>
            <p className="text-sm text-muted-foreground">
              +{metrics.newClientsThisMonth} este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.churnRate.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">
              {metrics.churnRate > 5 ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Acima do ideal
                </span>
              ) : (
                <span className="text-green-500">Saudável</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Margem</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.margin.toFixed(0)}%</div>
            <p className="text-sm text-muted-foreground">
              Receita - Custos IA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity & Costs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividade (últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Artigos gerados</span>
              </div>
              <Badge variant="secondary" className="text-lg px-3">
                {metrics.articlesGenerated}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <span>Imagens geradas</span>
              </div>
              <Badge variant="secondary" className="text-lg px-3">
                {metrics.imagesGenerated}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Receita Mensal</span>
              <span className="font-bold text-green-500">{formatCurrency(metrics.revenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Custos de IA</span>
              <span className="font-bold text-red-500">-{formatCurrency(metrics.totalAICost)}</span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="font-medium">Lucro Bruto</span>
              <span className="font-bold text-primary">
                {formatCurrency(metrics.revenue - metrics.totalAICost)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {metrics.churnRate > 5 && (
        <Card className="border-red-500/50 bg-red-50 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Churn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 dark:text-red-300">
              A taxa de churn está acima de 5%. Considere implementar estratégias de retenção como
              onboarding melhorado, suporte proativo ou recursos exclusivos para clientes ativos.
            </p>
          </CardContent>
        </Card>
      )}

      {metrics.margin < 50 && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Margem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-600 dark:text-yellow-300">
              A margem está abaixo de 50%. Considere otimizar custos de IA ou ajustar preços dos planos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
