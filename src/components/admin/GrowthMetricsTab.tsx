import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, UserPlus, ArrowUpRight, Target } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

interface GrowthData {
  month: string;
  newUsers: number;
  totalUsers: number;
  paidUsers: number;
}

interface FunnelStep {
  label: string;
  count: number;
  percentage: number;
}

export function GrowthMetricsTab() {
  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [conversionRate, setConversionRate] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsersThisMonth, setNewUsersThisMonth] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);

  useEffect(() => {
    fetchGrowthData();
  }, []);

  const fetchGrowthData = async () => {
    setLoading(true);

    try {
      const thisMonth = new Date();

      // Fetch all profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("created_at, user_id");

      // Fetch all subscriptions
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("user_id, plan, status, created_at");

      // Fetch all blogs
      const { data: blogs } = await supabase
        .from("blogs")
        .select("id, user_id, created_at");

      // Fetch all articles
      const { data: articles } = await supabase
        .from("articles")
        .select("blog_id, status, created_at")
        .eq("status", "published");

      // Calculate growth data for last 6 months
      const monthlyGrowth: GrowthData[] = [];
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(thisMonth, i);
        const monthEnd = endOfMonth(month);

        const usersUpToMonth = profiles?.filter(p => new Date(p.created_at) <= monthEnd).length || 0;
        const newUsersInMonth = profiles?.filter(p => {
          const createDate = new Date(p.created_at);
          return createDate >= startOfMonth(month) && createDate <= monthEnd;
        }).length || 0;
        const paidUsersUpToMonth = subscriptions?.filter(s => 
          s.plan !== "free" && 
          s.status === "active" && 
          new Date(s.created_at) <= monthEnd
        ).length || 0;

        monthlyGrowth.push({
          month: format(month, "MMM", { locale: ptBR }),
          newUsers: newUsersInMonth,
          totalUsers: usersUpToMonth,
          paidUsers: paidUsersUpToMonth,
        });
      }
      setGrowthData(monthlyGrowth);

      // Calculate current metrics
      const total = profiles?.length || 0;
      const newThisMonth = profiles?.filter(p => {
        const createDate = new Date(p.created_at);
        return createDate >= startOfMonth(thisMonth);
      }).length || 0;

      const lastMonth = subMonths(thisMonth, 1);
      const newLastMonth = profiles?.filter(p => {
        const createDate = new Date(p.created_at);
        return createDate >= startOfMonth(lastMonth) && createDate < startOfMonth(thisMonth);
      }).length || 1;

      const growth = ((newThisMonth - newLastMonth) / newLastMonth) * 100;

      setTotalUsers(total);
      setNewUsersThisMonth(newThisMonth);
      setGrowthRate(growth);

      // Calculate conversion rate
      const paidUsers = subscriptions?.filter(s => s.plan !== "free" && s.status === "active").length || 0;
      const conversion = total > 0 ? (paidUsers / total) * 100 : 0;
      setConversionRate(conversion);

      // Calculate activation funnel
      const usersWithBlogs = new Set(blogs?.map(b => b.user_id) || []);
      const blogsWithArticles = new Set(articles?.map(a => a.blog_id) || []);
      const usersWithPublishedArticles = blogs?.filter(b => blogsWithArticles.has(b.id)).map(b => b.user_id) || [];
      const uniqueUsersWithPublishedArticles = new Set(usersWithPublishedArticles);

      const funnel: FunnelStep[] = [
        { 
          label: "Cadastros", 
          count: total, 
          percentage: 100 
        },
        { 
          label: "Criaram Blog", 
          count: usersWithBlogs.size, 
          percentage: total > 0 ? (usersWithBlogs.size / total) * 100 : 0 
        },
        { 
          label: "Publicaram Artigo", 
          count: uniqueUsersWithPublishedArticles.size, 
          percentage: total > 0 ? (uniqueUsersWithPublishedArticles.size / total) * 100 : 0 
        },
        { 
          label: "Assinaram Plano", 
          count: paidUsers, 
          percentage: total > 0 ? (paidUsers / total) * 100 : 0 
        },
      ];
      setFunnelData(funnel);

    } catch (error) {
      console.error("Error fetching growth data:", error);
    } finally {
      setLoading(false);
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Cadastros totais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Novos este Mês</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newUsersThisMonth}</div>
            <div className="flex items-center gap-1 mt-1">
              {growthRate >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
              )}
              <span className={`text-sm ${growthRate >= 0 ? "text-green-500" : "text-red-500"}`}>
                {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Free → Pago</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meta Mensal</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.min(100, (newUsersThisMonth / 50) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{newUsersThisMonth}/50 novos usuários</p>
          </CardContent>
        </Card>
      </div>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Crescimento de Usuários</CardTitle>
          <CardDescription>Novos cadastros por mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Bar 
                  dataKey="newUsers" 
                  name="Novos Usuários" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Growth Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Crescimento</CardTitle>
          <CardDescription>Total de usuários e usuários pagos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalUsers" 
                  name="Total" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="paidUsers" 
                  name="Pagos" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Activation Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Ativação</CardTitle>
          <CardDescription>Jornada do usuário desde o cadastro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelData.map((step, index) => (
              <div key={step.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{step.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{step.count}</span>
                    <Badge variant="outline">{step.percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${step.percentage}%` }}
                  />
                </div>
                {index < funnelData.length - 1 && (
                  <div className="text-xs text-muted-foreground text-center">
                    ↓ {funnelData[index + 1].count > 0 
                      ? ((funnelData[index + 1].count / step.count) * 100).toFixed(1) 
                      : 0}% de conversão
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
