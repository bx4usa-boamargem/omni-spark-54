import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationCard } from "@/components/automation/AutomationCard";
import { ArticleQueue } from "@/components/automation/ArticleQueue";
import { AnalyticsSummaryWidget } from "@/components/dashboard/AnalyticsSummaryWidget";
import { GenerationHistoryCard } from "@/components/dashboard/GenerationHistoryCard";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { BlogSelector } from "@/components/admin/BlogSelector";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { GlobalOnboardingGuide, ONBOARDING_STEPS } from "@/components/onboarding/GlobalOnboardingGuide";
import {
  Sparkles,
  FileText,
  Plus,
  BarChart3,
  Loader2,
  PenTool,
  Eye,
  Palette,
  Target,
  Zap,
  TrendingUp,
  Calendar,
  Upload,
  ChevronRight,
  Check,
  Users
} from "lucide-react";
import { SectionHelper } from "@/components/blog-editor/SectionHelper";
import { DashboardQuickGrid } from "@/components/dashboard/DashboardQuickGrid";

interface Article {
  id: string;
  title: string;
  status: string;
  created_at: string;
  featured_image_url: string | null;
  view_count: number | null;
}

interface Profile {
  full_name: string | null;
}

import { DashboardProofOfValue } from "@/components/dashboard/DashboardProofOfValue";
import { DashboardRadarWidget } from "@/components/dashboard/DashboardRadarWidget";
import { DashboardTerritoryPerformance } from "@/components/dashboard/DashboardTerritoryPerformance";
import { AgentsStatusWidget } from "@/components/dashboard/AgentsStatusWidget";

interface RoiDashboardData {
  total_articles: number;
  published_articles: number;
  total_views: number;
  total_cta_clicks: number;
  total_leads: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { blog, loading: blogLoading, role, isPlatformAdmin, refetch: refetchBlog } = useBlog();
  const { showOnboarding, completeOnboarding, skipOnboarding, startTour } = useOnboarding('dashboard');
  const [articles, setArticles] = useState<Article[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roiMetrics, setRoiMetrics] = useState<RoiDashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const refreshTimer = useRef<number | null>(null);

  const blogId = useMemo(() => blog?.id ?? null, [blog?.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchArticles = async (currentBlogId: string) => {
    const { data: articlesData } = await supabase
      .from("articles")
      .select("*")
      .eq("blog_id", currentBlogId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (articlesData) {
      setArticles(articlesData as Article[]);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!user || !blog) return;

      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);
        }

        // Fetch ROI metrics
        const { data: roiData, error: roiError } = await supabase
          .rpc("get_client_roi_dashboard", { p_blog_id: blog.id })
          .maybeSingle();

        if (!roiError && roiData) {
          setRoiMetrics(roiData as RoiDashboardData);
        }

        // Fetch articles for the blog
        await fetchArticles(blog.id);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingData(false);
      }
    }

    if (user && blog) {
      fetchData();
    } else if (!blogLoading) {
      setLoadingData(false);
    }
  }, [user, blog, blogLoading]);

  useEffect(() => {
    if (!blogId) return;

    const channel = supabase
      .channel(`articles-live-${blogId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "articles",
          filter: `blog_id=eq.${blogId}`,
        },
        () => {
          if (refreshTimer.current) {
            window.clearTimeout(refreshTimer.current);
          }
          refreshTimer.current = window.setTimeout(() => {
            fetchArticles(blogId);
            // Optionally refetch ROI metrics here
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) {
        window.clearTimeout(refreshTimer.current);
      }
      supabase.removeChannel(channel);
    };
  }, [blogId]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const userName = profile?.full_name?.split(" ")[0] || "usuário";

  // Use DB data if available, fallback to client-side calc
  const totalArticlesCard = roiMetrics?.total_articles ?? articles.length;
  const publishedCountCard = roiMetrics?.published_articles ?? articles.filter((a) => a.status === "published").length;
  const totalViewsCard = roiMetrics?.total_views ?? articles.reduce((sum, a) => sum + (a.view_count || 0), 0);
  const leadsGeneratedCard = roiMetrics?.total_leads ?? 0;
  const ctaClicksCard = roiMetrics?.total_cta_clicks ?? 0;

  if (authLoading || blogLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="p-4 rounded-2xl gradient-primary inline-block mb-6">
            <PenTool className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-4">Vamos criar seu blog!</h1>
          <p className="text-muted-foreground mb-8">
            Em poucos passos você terá um blog profissional pronto para receber artigos gerados por IA.
          </p>
          <Button size="lg" onClick={() => navigate("/onboarding")}>
            Começar configuração
            <Sparkles className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  if (!blog.onboarding_completed) {
    navigate("/onboarding");
    return null;
  }

  // Create a compatible blog object for components that need it
  const blogData = {
    id: blog.id,
    name: blog.name,
    slug: blog.slug,
    description: blog.description,
    logo_url: blog.logo_url,
    primary_color: blog.primary_color,
    secondary_color: blog.secondary_color,
    onboarding_completed: blog.onboarding_completed || false,
  };

  return (
    <DashboardLayout>
      {/* Onboarding Tour */}
      {showOnboarding && (
        <GlobalOnboardingGuide
          steps={ONBOARDING_STEPS.dashboard}
          title="Bem-vindo ao Dashboard"
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}

      <div className="container py-8 max-w-6xl">
        {/* Admin Mode Banner */}
        {isPlatformAdmin && (
          <div className="mb-6">
            <BlogSelector selectedBlogId={blog.id} onSelectBlog={() => { }} />
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
              Bem-vindo, {blog.name}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {blog.slug}
            </p>
          </div>
          <Button onClick={() => navigate("/app/articles/new")} className="bg-[#FF6B00] hover:bg-[#E56000] text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            Gerar Artigo
          </Button>
        </div>

        {/* Setup Checklist (Conditional) */}
        {user && blog && !blog.onboarding_completed && (
          <div className="mb-8 space-y-4">
            <p className="text-muted-foreground">
              Para que você tenha maior desempenho e organização, é necessário que você faça as configurações iniciais do seu blog.
            </p>
            <SetupChecklist blogId={blog.id} userId={user.id} />
          </div>
        )}

        {/* Core KPIs matches V1 exactly */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="border-muted/60 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total de Artigos</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold">{articles.length}</h3>
                <span className="text-xs font-medium text-emerald-500 flex items-center gap-1.5 ml-auto">
                  <TrendingUp className="h-3 w-3" /> ~100%
                </span>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors"></div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Check className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Publicados</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold">{publishedCountCard}</h3>
                <span className="text-xs font-medium text-emerald-500 flex items-center gap-1.5 ml-auto">
                  <TrendingUp className="h-3 w-3" /> ~100%
                </span>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Eye className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Visualizações</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold">{totalViewsCard.toLocaleString("pt-BR")}</h3>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 ml-auto">
                  — 0%
                </span>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Leads Gerados</p>
              <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold">0</h3>
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 ml-auto">
                  — 0%
                </span>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors"></div>
            </CardContent>
          </Card>
        </div>

        {/* Agentes AIOS */}
        <AgentsStatusWidget tenantId={user?.id} />

        {/* Proof of Value Component */}
        <DashboardProofOfValue />

        {/* Radar Opportunities Widget */}
        <div className="mb-8">
          <DashboardRadarWidget blogId={blog.id} />
        </div>

        {/* Territory Performance Component */}
        <div className="mb-8">
          <DashboardTerritoryPerformance />
        </div>

        {/* Orientation Message + Setup Checklist */}
        {user && blog && (
          <div className="mb-8 space-y-4">
            <p className="text-muted-foreground">
              Para que você tenha maior desempenho e organização, é necessário que você faça as configurações iniciais do seu blog.
            </p>
            <SetupChecklist blogId={blog.id} userId={user.id} />
          </div>
        )}



        {/* Create Content Section - Hidden for viewers */}
        <PermissionGate permission="articles.create">
          <div className="mb-8">
            <SectionHelper
              title="Criação de Conteúdo"
              description="Escolha uma fonte para criar seu próximo artigo com IA otimizada para SEO."
              action="Clique em uma das opções para iniciar."
            />
            <div className="grid gap-4 md:grid-cols-4">
              <Card
                className="border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                onClick={() => navigate("/app/articles/new")}
              >
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="p-3 rounded-full bg-primary/10 inline-block mb-3 group-hover:bg-primary/20 transition-colors">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold">Sugestão da IA</h3>
                    <p className="text-sm text-muted-foreground mt-1">Deixe a IA sugerir</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate("/app/keywords")}
              >
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="p-3 rounded-full bg-secondary inline-block mb-3">
                      <Target className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <h3 className="font-display font-semibold">Palavra-chave</h3>
                    <p className="text-sm text-muted-foreground mt-1">Pesquisar keyword</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate("/app/strategy")}
              >
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="p-3 rounded-full bg-secondary inline-block mb-3">
                      <Upload className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <h3 className="font-display font-semibold">Documento</h3>
                    <p className="text-sm text-muted-foreground mt-1">Usar PDF/Doc</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate("/app/clusters")}
              >
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="p-3 rounded-full bg-secondary inline-block mb-3">
                      <Zap className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <h3 className="font-display font-semibold">Cluster SEO</h3>
                    <p className="text-sm text-muted-foreground mt-1">Estratégia de conteúdo</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </PermissionGate>

        {/* Analytics Summary + Generation History */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {/* Analytics Summary Widget */}
          <AnalyticsSummaryWidget blogId={blog.id} />

          {/* Generation History */}
          <GenerationHistoryCard blogId={blog.id} />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/app/calendar")}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Calendário</h3>
                <p className="text-sm text-muted-foreground">Ver programação</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/app/performance")}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Desempenho</h3>
                <p className="text-sm text-muted-foreground">Ver métricas</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/app/articles")}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Gerenciar Artigos</h3>
                <p className="text-sm text-muted-foreground">Ver todos os artigos</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 border-primary/20"
            onClick={() => navigate("/app/my-blog")}
          >
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-primary to-secondary">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold">Editor de Blog</h3>
                <p className="text-sm text-muted-foreground">Personalizar aparência</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Automation Section - Hidden for editors and viewers */}
        <PermissionGate permission="blog.settings">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-[70%_30%] mb-8">
            <ArticleQueue blogId={blog.id} />
            <AutomationCard blogId={blog.id} compact />
          </div>
        </PermissionGate>

        {/* Recent Articles */}
        <Card>
          <CardHeader>
            <CardTitle>Artigos Recentes</CardTitle>
            <CardDescription>Seus últimos artigos criados</CardDescription>
          </CardHeader>
          <CardContent>
            {articles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum artigo ainda.</p>
                <Button variant="link" onClick={() => navigate("/app/articles/new")}>
                  Criar seu primeiro artigo
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/articles/${article.id}/edit`)}
                  >
                    <div>
                      <h4 className="font-medium">{article.title}</h4>
                      <p className="text-sm text-muted-foreground">{new Date(article.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${article.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}
                    >
                      {article.status === "published" ? "Publicado" : "Rascunho"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
