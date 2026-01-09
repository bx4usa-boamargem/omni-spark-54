import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Users, Building2, FileText, Globe, Download, TrendingUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  plan: string | null;
  status: string | null;
  account_type: string | null;
  billing_required: boolean | null;
  created_at: string | null;
  owner_name: string | null;
  owner_email: string | null;
  blog_count: number;
  article_count: number;
  member_count: number;
  total_cost: number;
}

export function TenantsTab() {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);

    try {
      // Fetch tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantsError) {
        console.error("Error fetching tenants:", tenantsError);
        setLoading(false);
        return;
      }

      // Fetch profiles for owner names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      // Fetch blogs per tenant
      const { data: blogs } = await supabase
        .from("blogs")
        .select("id, tenant_id");

      // Fetch articles per blog
      const { data: articles } = await supabase
        .from("articles")
        .select("id, blog_id");

      // Fetch tenant members
      const { data: members } = await supabase
        .from("tenant_members")
        .select("tenant_id");

      // Fetch consumption logs
      const { data: consumptionLogs } = await supabase
        .from("consumption_logs")
        .select("blog_id, estimated_cost_usd");

      // Create maps for efficient lookup
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      const blogsByTenant = new Map<string, string[]>();
      blogs?.forEach(b => {
        if (b.tenant_id) {
          const existing = blogsByTenant.get(b.tenant_id) || [];
          existing.push(b.id);
          blogsByTenant.set(b.tenant_id, existing);
        }
      });

      const articlesByBlog = new Map<string, number>();
      articles?.forEach(a => {
        articlesByBlog.set(a.blog_id, (articlesByBlog.get(a.blog_id) || 0) + 1);
      });

      const membersByTenant = new Map<string, number>();
      members?.forEach(m => {
        membersByTenant.set(m.tenant_id, (membersByTenant.get(m.tenant_id) || 0) + 1);
      });

      const costByBlog = new Map<string, number>();
      consumptionLogs?.forEach(log => {
        if (log.blog_id) {
          costByBlog.set(log.blog_id, (costByBlog.get(log.blog_id) || 0) + (log.estimated_cost_usd || 0));
        }
      });

      // Build tenant data
      const tenantData: TenantData[] = tenantsData?.map(tenant => {
        const tenantBlogs = blogsByTenant.get(tenant.id) || [];
        const articleCount = tenantBlogs.reduce((sum, blogId) => sum + (articlesByBlog.get(blogId) || 0), 0);
        const totalCost = tenantBlogs.reduce((sum, blogId) => sum + (costByBlog.get(blogId) || 0), 0);

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          owner_user_id: tenant.owner_user_id,
          plan: tenant.plan,
          status: tenant.status,
          account_type: tenant.account_type,
          billing_required: tenant.billing_required,
          created_at: tenant.created_at,
          owner_name: tenant.owner_user_id ? profileMap.get(tenant.owner_user_id) || null : null,
          owner_email: null,
          blog_count: tenantBlogs.length,
          article_count: articleCount,
          member_count: membersByTenant.get(tenant.id) || 0,
          total_cost: totalCost,
        };
      }) || [];

      setTenants(tenantData);
    } catch (error) {
      console.error("Error in fetchTenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = !searchTerm || 
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlan = planFilter === "all" || tenant.plan === planFilter;
    const matchesStatus = statusFilter === "all" || tenant.status === statusFilter;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanBadge = (plan: string | null) => {
    const planColors: Record<string, string> = {
      essential: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      plus: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      scale: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      internal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
    return planColors[plan || "essential"] || planColors.essential;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "suspended":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getAccountTypeBadge = (accountType: string | null) => {
    switch (accountType) {
      case "self_registered":
        return <Badge variant="outline">Self-registered</Badge>;
      case "internal_team":
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Equipe Interna</Badge>;
      case "client_free":
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Cliente Grátis</Badge>;
      case "client_paid":
        return <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30">Cliente Pago</Badge>;
      default:
        return <Badge variant="secondary">{accountType || "N/A"}</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ["Nome", "Slug", "Proprietário", "Plano", "Status", "Tipo", "Blogs", "Artigos", "Membros", "Custo IA", "Criado em"];
    const rows = filteredTenants.map(t => [
      t.name,
      t.slug,
      t.owner_name || "N/A",
      t.plan || "essential",
      t.status || "active",
      t.account_type || "self_registered",
      t.blog_count,
      t.article_count,
      t.member_count,
      `$${t.total_cost.toFixed(2)}`,
      t.created_at ? format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR }) : "N/A",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tenants-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  // Summary stats
  const totalTenants = tenants.length;
  const totalBlogs = tenants.reduce((sum, t) => sum + t.blog_count, 0);
  const totalArticles = tenants.reduce((sum, t) => sum + t.article_count, 0);
  const activeTenants = tenants.filter(t => t.status === "active").length;
  const totalCost = tenants.reduce((sum, t) => sum + t.total_cost, 0);

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
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants}</div>
            <p className="text-xs text-muted-foreground">{activeTenants} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Blogs</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBlogs}</div>
            <p className="text-xs text-muted-foreground">Na plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Artigos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArticles}</div>
            <p className="text-xs text-muted-foreground">Criados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média/Tenant</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTenants > 0 ? (totalArticles / totalTenants).toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Artigos por tenant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total IA</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Todos os tenants</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Gestão de Tenants (Clientes)
              </CardTitle>
              <CardDescription>Todas as empresas/clientes cadastrados na plataforma</CardDescription>
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
                placeholder="Buscar por nome, slug ou proprietário..."
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
                <SelectItem value="essential">Essential</SelectItem>
                <SelectItem value="plus">Plus</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="internal">Interno</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Blogs</TableHead>
                  <TableHead className="text-center">Artigos</TableHead>
                  <TableHead className="text-center">Custo IA</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum tenant encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTenants.map((tenant) => (
                    <TableRow 
                      key={tenant.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setShowDetails(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{tenant.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{tenant.owner_name || "Sem proprietário"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPlanBadge(tenant.plan)}>
                          {tenant.plan || "essential"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(tenant.status)}>
                          {tenant.status === "active" ? "Ativo" : 
                           tenant.status === "suspended" ? "Suspenso" :
                           tenant.status === "cancelled" ? "Cancelado" : tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getAccountTypeBadge(tenant.account_type)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {tenant.blog_count}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {tenant.article_count}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        ${tenant.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {tenant.created_at 
                          ? formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true, locale: ptBR })
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedTenant?.name}
            </DialogTitle>
            <DialogDescription>
              Detalhes do tenant e suas métricas
            </DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-mono">{selectedTenant.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Proprietário</p>
                  <p>{selectedTenant.owner_name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <Badge className={getPlanBadge(selectedTenant.plan)}>
                    {selectedTenant.plan || "essential"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusBadge(selectedTenant.status)}>
                    {selectedTenant.status || "active"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Conta</p>
                  {getAccountTypeBadge(selectedTenant.account_type)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billing Required</p>
                  <p>{selectedTenant.billing_required ? "Sim" : "Não"}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{selectedTenant.blog_count}</div>
                    <p className="text-xs text-muted-foreground">Blogs</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{selectedTenant.article_count}</div>
                    <p className="text-xs text-muted-foreground">Artigos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{selectedTenant.member_count}</div>
                    <p className="text-xs text-muted-foreground">Membros</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">${selectedTenant.total_cost.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Custo IA</p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p>
                  {selectedTenant.created_at 
                    ? format(new Date(selectedTenant.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
