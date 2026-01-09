import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, User, CreditCard, FileText, Users, Shield, CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  onboarding_progress: unknown;
  created_at: string;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  account_type: string | null;
  billing_required: boolean | null;
  is_internal_account: boolean | null;
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
}

interface UserBlog {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  onboarding_completed: boolean | null;
  custom_domain: string | null;
  created_at: string;
}

interface TeamMembership {
  id: string;
  user_id: string;
  blog_id: string;
  role: string;
  created_at: string;
  blog: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface DiagnosticResult {
  profile: UserProfile | null;
  subscription: UserSubscription | null;
  blogs: UserBlog[];
  memberships: TeamMembership[];
  roles: UserRole[];
  email: string | null;
}

export function SessionDiagnosticsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const searchUser = async () => {
    if (!searchTerm.trim()) {
      toast.error("Digite um email, nome ou ID para buscar");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // First, try to find by profile (name or user_id)
      let userId: string | null = null;
      let email: string | null = null;

      // Check if it's a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);

      if (isUUID) {
        userId = searchTerm;
      } else {
        // Search by name in profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("full_name", `%${searchTerm}%`)
          .limit(1);

        if (profiles && profiles.length > 0) {
          userId = profiles[0].user_id;
        }
      }

      // If we still don't have a userId, it might be an email - check subscriptions
      if (!userId) {
        // We can't query auth.users directly, so we'll check if there's a subscription or blog
        // with metadata containing this email, or just search broadly
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("user_id")
          .limit(100);

        // For now, show error if not found by name/UUID
        if (!subs || subs.length === 0) {
          toast.error("Usuário não encontrado. Tente buscar por nome ou ID.");
          setLoading(false);
          return;
        }

        // If search term looks like email, we need to find it differently
        // Since we can't query auth.users, we'll just report this limitation
        if (searchTerm.includes("@")) {
          email = searchTerm;
          // Try to find by checking if any profile mentions this
          toast.info("Busca por email limitada. Use o ID do usuário ou nome para resultados precisos.");
        }
        
        setLoading(false);
        return;
      }

      // Fetch all data for this user
      const [profileRes, subscriptionRes, blogsRes, membershipsRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("blogs").select("*").eq("user_id", userId),
        supabase.from("team_members").select("*, blog:blogs(id, name, slug)").eq("user_id", userId),
        supabase.from("user_roles").select("*").eq("user_id", userId),
      ]);

      setResult({
        profile: profileRes.data as UserProfile | null,
        subscription: subscriptionRes.data as UserSubscription | null,
        blogs: (blogsRes.data || []) as UserBlog[],
        memberships: (membershipsRes.data || []) as TeamMembership[],
        roles: (rolesRes.data || []) as UserRole[],
        email,
      });

    } catch (error) {
      console.error("Error searching user:", error);
      toast.error("Erro ao buscar usuário");
    } finally {
      setLoading(false);
    }
  };

  const getDiagnostics = () => {
    if (!result) return [];

    const issues: { level: "critical" | "warning" | "info" | "success"; message: string }[] = [];

    // Check profile
    if (!result.profile) {
      issues.push({ level: "critical", message: "Sem perfil criado" });
    }

    // Check subscription
    if (!result.subscription) {
      issues.push({ level: "critical", message: "Sem subscription" });
    } else {
      if (result.subscription.status !== "active" && result.subscription.status !== "trialing") {
        issues.push({ level: "warning", message: `Subscription ${result.subscription.status}` });
      }
      if (result.subscription.billing_required && !result.subscription.stripe_customer_id) {
        issues.push({ level: "warning", message: "Billing pendente (sem Stripe)" });
      }
    }

    // Check blog access
    const hasOwnBlog = result.blogs.length > 0;
    const hasTeamAccess = result.memberships.length > 0;
    const isAdmin = result.roles.some(r => r.role === "admin" || r.role === "platform_admin");

    if (!hasOwnBlog && !hasTeamAccess && !isAdmin) {
      issues.push({ level: "critical", message: "Sem acesso a nenhum blog" });
    }

    // Check onboarding
    if (hasOwnBlog) {
      const incompleteBlogs = result.blogs.filter(b => !b.onboarding_completed);
      if (incompleteBlogs.length > 0) {
        issues.push({ level: "info", message: `${incompleteBlogs.length} blog(s) com onboarding incompleto` });
      }
    }

    // Check roles
    if (result.roles.length === 0) {
      issues.push({ level: "warning", message: "Sem role definido" });
    }

    // All good
    if (issues.length === 0) {
      issues.push({ level: "success", message: "Usuário saudável - todos os estados OK" });
    }

    return issues;
  };

  const forceActivateSubscription = async () => {
    if (!result?.subscription) return;
    setActionLoading("activate");

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "active" })
      .eq("id", result.subscription.id);

    setActionLoading(null);

    if (error) {
      toast.error("Erro ao ativar subscription");
      return;
    }

    toast.success("Subscription ativada");
    searchUser();
  };

  const completeOnboarding = async (blogId: string) => {
    setActionLoading(`onboarding-${blogId}`);

    const { error } = await supabase
      .from("blogs")
      .update({ onboarding_completed: true })
      .eq("id", blogId);

    setActionLoading(null);

    if (error) {
      toast.error("Erro ao completar onboarding");
      return;
    }

    toast.success("Onboarding marcado como completo");
    searchUser();
  };

  const removeBillingRequirement = async () => {
    if (!result?.subscription) return;
    setActionLoading("billing");

    const { error } = await supabase
      .from("subscriptions")
      .update({ billing_required: false })
      .eq("id", result.subscription.id);

    setActionLoading(null);

    if (error) {
      toast.error("Erro ao remover billing");
      return;
    }

    toast.success("Billing removido");
    searchUser();
  };

  const diagnostics = getDiagnostics();
  const hasCritical = diagnostics.some(d => d.level === "critical");
  const hasWarning = diagnostics.some(d => d.level === "warning");

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Diagnóstico de Sessão
          </CardTitle>
          <CardDescription>
            Busque por email, nome ou ID para visualizar o estado completo do usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Email, nome ou user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUser()}
              className="flex-1"
            />
            <Button onClick={searchUser} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Quick Diagnostics */}
          <Card className={hasCritical ? "border-destructive" : hasWarning ? "border-yellow-500" : "border-green-500"}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Diagnóstico Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {diagnostics.map((d, i) => (
                  <Badge
                    key={i}
                    variant={d.level === "critical" ? "destructive" : d.level === "warning" ? "secondary" : d.level === "success" ? "default" : "outline"}
                    className={`gap-1 ${d.level === "success" ? "bg-green-500 hover:bg-green-600" : d.level === "warning" ? "bg-yellow-500 text-black hover:bg-yellow-600" : ""}`}
                  >
                    {d.level === "critical" && <XCircle className="h-3 w-3" />}
                    {d.level === "warning" && <AlertTriangle className="h-3 w-3" />}
                    {d.level === "success" && <CheckCircle className="h-3 w-3" />}
                    {d.message}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profile */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.profile ? (
                  <div className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span> {result.profile.full_name || "—"}</div>
                    <div><span className="text-muted-foreground">Idioma:</span> {result.profile.preferred_language || "—"}</div>
                    <div><span className="text-muted-foreground">User ID:</span> <code className="text-xs bg-muted px-1 rounded">{result.profile.user_id}</code></div>
                    <div><span className="text-muted-foreground">Criado:</span> {new Date(result.profile.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">Perfil não encontrado</p>
                )}
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.subscription ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Plano:</span> 
                      <Badge variant="outline">{result.subscription.plan}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={result.subscription.status === "active" ? "default" : "secondary"}>
                        {result.subscription.status}
                      </Badge>
                    </div>
                    <div><span className="text-muted-foreground">Tipo:</span> {result.subscription.account_type || "—"}</div>
                    <div><span className="text-muted-foreground">Billing:</span> {result.subscription.billing_required ? "Sim" : "Não"}</div>
                    <div><span className="text-muted-foreground">Stripe:</span> {result.subscription.stripe_customer_id || "—"}</div>
                    {result.subscription.trial_ends_at && (
                      <div><span className="text-muted-foreground">Trial até:</span> {new Date(result.subscription.trial_ends_at).toLocaleDateString("pt-BR")}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-destructive">Subscription não encontrada</p>
                )}
              </CardContent>
            </Card>

            {/* Blogs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Blogs (Owner)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.blogs.length > 0 ? (
                  <div className="space-y-3">
                    {result.blogs.map((blog) => (
                      <div key={blog.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <div className="font-medium text-sm">{blog.name}</div>
                          <div className="text-xs text-muted-foreground">/{blog.slug}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {blog.onboarding_completed ? (
                            <Badge variant="default" className="bg-green-500">Completo</Badge>
                          ) : (
                            <>
                              <Badge variant="secondary">Pendente</Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => completeOnboarding(blog.id)}
                                disabled={actionLoading === `onboarding-${blog.id}`}
                              >
                                {actionLoading === `onboarding-${blog.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum blog como owner</p>
                )}
              </CardContent>
            </Card>

            {/* Team Memberships */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Membros de Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.memberships.length > 0 ? (
                  <div className="space-y-2">
                    {result.memberships.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="text-sm">{m.blog?.name || "Blog desconhecido"}</div>
                        <Badge variant="outline">{m.role}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Não é membro de nenhuma equipe</p>
                )}
              </CardContent>
            </Card>

            {/* Roles */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Roles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.roles.map((r) => (
                      <Badge key={r.id} variant={r.role === "admin" || r.role === "platform_admin" ? "default" : "secondary"}>
                        {r.role}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum role atribuído</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={forceActivateSubscription}
                    disabled={!result.subscription || result.subscription.status === "active" || actionLoading === "activate"}
                  >
                    {actionLoading === "activate" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Forçar Ativação
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={removeBillingRequirement}
                    disabled={!result.subscription || !result.subscription.billing_required || actionLoading === "billing"}
                  >
                    {actionLoading === "billing" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Remover Billing
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={searchUser}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Atualizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
