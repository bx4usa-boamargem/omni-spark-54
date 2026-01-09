import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Users, FileText, Image, Globe, Download, Eye, MoreHorizontal, Mail, Calendar, TrendingUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  plan: string | null;
  status: string | null;
  blog_count: number;
  article_count: number;
  articles_generated: number;
  images_generated: number;
  created_at: string;
  last_activity: string | null;
  total_cost: number;
  blogs: Array<{ id: string; name: string; slug: string }>;
}

export const ClientsTab = () => {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);

    // Fetch profiles with their subscription and usage data
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        user_id,
        full_name,
        avatar_url,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setLoading(false);
      return;
    }

    // Fetch all subscriptions
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("user_id, plan, status");

    // Fetch blog counts per user with blog names
    const { data: blogs } = await supabase
      .from("blogs")
      .select("user_id, id, name, slug");

    // Fetch article counts per blog
    const { data: articles } = await supabase
      .from("articles")
      .select("blog_id, created_at");

    // Fetch usage tracking for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const { data: usageData } = await supabase
      .from("usage_tracking")
      .select("user_id, articles_generated, images_generated")
      .gte("month", currentMonth.toISOString());

    // Fetch consumption logs for cost calculation
    const { data: consumptionLogs } = await supabase
      .from("consumption_logs")
      .select("user_id, estimated_cost_usd, created_at");

    // Create maps for efficient lookup
    const subscriptionMap = new Map(subscriptions?.map(s => [s.user_id, s]) || []);
    const blogMap = new Map<string, Array<{ id: string; name: string; slug: string }>>();
    blogs?.forEach(b => {
      const existing = blogMap.get(b.user_id) || [];
      existing.push({ id: b.id, name: b.name, slug: b.slug });
      blogMap.set(b.user_id, existing);
    });

    const blogIdToUserMap = new Map(blogs?.map(b => [b.id, b.user_id]) || []);
    const articleCountByUser = new Map<string, number>();
    const lastActivityByUser = new Map<string, string>();
    
    articles?.forEach(a => {
      const userId = blogIdToUserMap.get(a.blog_id);
      if (userId) {
        articleCountByUser.set(userId, (articleCountByUser.get(userId) || 0) + 1);
        const currentLast = lastActivityByUser.get(userId);
        if (!currentLast || new Date(a.created_at) > new Date(currentLast)) {
          lastActivityByUser.set(userId, a.created_at);
        }
      }
    });

    const usageMap = new Map(usageData?.map(u => [u.user_id, u]) || []);
    
    // Calculate total cost per user
    const costByUser = new Map<string, number>();
    consumptionLogs?.forEach(log => {
      costByUser.set(log.user_id, (costByUser.get(log.user_id) || 0) + (log.estimated_cost_usd || 0));
    });

    // Build client data
    const clientData: ClientData[] = profiles?.map(profile => {
      const subscription = subscriptionMap.get(profile.user_id);
      const userBlogs = blogMap.get(profile.user_id) || [];
      const usage = usageMap.get(profile.user_id);

      return {
        user_id: profile.user_id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        email: null, // Will be fetched on demand
        plan: subscription?.plan || "free",
        status: subscription?.status || "active",
        blog_count: userBlogs.length,
        article_count: articleCountByUser.get(profile.user_id) || 0,
        articles_generated: usage?.articles_generated || 0,
        images_generated: usage?.images_generated || 0,
        created_at: profile.created_at,
        last_activity: lastActivityByUser.get(profile.user_id) || null,
        total_cost: costByUser.get(profile.user_id) || 0,
        blogs: userBlogs,
      };
    }) || [];

    setClients(clientData);
    setLoading(false);
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = planFilter === "all" || client.plan === planFilter;
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanBadge = (plan: string | null) => {
    const planColors: Record<string, string> = {
      free: "bg-muted text-muted-foreground",
      essential: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      plus: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      scale: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
    return planColors[plan || "free"] || planColors.free;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "trialing":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "canceled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "past_due":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const exportToCSV = () => {
    const headers = ["Nome", "Plano", "Status", "Blogs", "Artigos", "Artigos/mês", "Imagens/mês", "Custo Total", "Cadastro", "Última Atividade"];
    const rows = filteredClients.map(c => [
      c.full_name || "Sem nome",
      c.plan || "free",
      c.status || "active",
      c.blog_count,
      c.article_count,
      c.articles_generated,
      c.images_generated,
      `$${c.total_cost.toFixed(2)}`,
      format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR }),
      c.last_activity ? format(new Date(c.last_activity), "dd/MM/yyyy", { locale: ptBR }) : "N/A",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `clientes-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const openClientDetails = (client: ClientData) => {
    setSelectedClient(client);
    setShowDetails(true);
  };

  // Summary stats
  const totalClients = clients.length;
  const totalBlogs = clients.reduce((sum, c) => sum + c.blog_count, 0);
  const totalArticles = clients.reduce((sum, c) => sum + c.article_count, 0);
  const paidClients = clients.filter(c => c.plan && c.plan !== "free").length;
  const totalCost = clients.reduce((sum, c) => sum + c.total_cost, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">{paidClients} pagantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Blogs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBlogs}</div>
            <p className="text-xs text-muted-foreground">Ativos na plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Artigos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArticles}</div>
            <p className="text-xs text-muted-foreground">Criados na plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média/Cliente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalClients > 0 ? (totalArticles / totalClients).toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Artigos por cliente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total IA</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Todos os clientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Gestão de Clientes</CardTitle>
              <CardDescription>Todos os clientes cadastrados na plataforma</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="essential">Essential</SelectItem>
                <SelectItem value="plus">Plus</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
                <SelectItem value="past_due">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Blogs</TableHead>
                  <TableHead className="text-center">Artigos</TableHead>
                  <TableHead className="text-center">Custo IA</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => openClientDetails(client)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {client.avatar_url ? (
                            <img
                              src={client.avatar_url}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">
                              {client.full_name || "Sem nome"}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {client.user_id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPlanBadge(client.plan)}>
                          {client.plan || "free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(client.status)}>
                          {client.status === "active" ? "Ativo" : 
                           client.status === "trialing" ? "Trial" :
                           client.status === "canceled" ? "Cancelado" : 
                           client.status === "past_due" ? "Vencido" : client.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {client.blog_count}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {client.article_count}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        ${client.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {client.last_activity 
                          ? formatDistanceToNow(new Date(client.last_activity), { addSuffix: true, locale: ptBR })
                          : "Sem atividade"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openClientDetails(client); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
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
        </CardContent>
      </Card>

      {/* Client Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedClient?.avatar_url ? (
                <img
                  src={selectedClient.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <span>{selectedClient?.full_name || "Sem nome"}</span>
                <p className="text-sm font-normal text-muted-foreground font-mono">
                  {selectedClient?.user_id}
                </p>
              </div>
            </DialogTitle>
            <DialogDescription>
              Detalhes completos do cliente
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{selectedClient.blog_count}</p>
                  <p className="text-sm text-muted-foreground">Blogs</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{selectedClient.article_count}</p>
                  <p className="text-sm text-muted-foreground">Artigos</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">${selectedClient.total_cost.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Custo IA Total</p>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Plano</span>
                  <Badge className={getPlanBadge(selectedClient.plan)}>
                    {selectedClient.plan || "free"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className={getStatusBadge(selectedClient.status)}>
                    {selectedClient.status === "active" ? "Ativo" : 
                     selectedClient.status === "trialing" ? "Trial" :
                     selectedClient.status === "canceled" ? "Cancelado" : 
                     selectedClient.status === "past_due" ? "Vencido" : selectedClient.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Cadastro
                  </span>
                  <span>{format(new Date(selectedClient.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Última Atividade</span>
                  <span>
                    {selectedClient.last_activity 
                      ? formatDistanceToNow(new Date(selectedClient.last_activity), { addSuffix: true, locale: ptBR })
                      : "Sem atividade"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Uso este mês</span>
                  <span>
                    {selectedClient.articles_generated} artigos · {selectedClient.images_generated} imagens
                  </span>
                </div>
              </div>

              {/* Blogs */}
              {selectedClient.blogs.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Blogs do Cliente</h4>
                  <div className="space-y-2">
                    {selectedClient.blogs.map((blog) => (
                      <div key={blog.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{blog.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{blog.slug}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/blog/${blog.slug}`, "_blank")}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
