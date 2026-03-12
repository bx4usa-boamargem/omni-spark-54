// UNIFICADO: Usando apenas Sonner para evitar conflitos de DOM
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "react-error-boundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TenantProvider } from "@/contexts/TenantContext";
import { TenantGuard } from "@/components/auth/TenantGuard";
import { PlatformAdminGuard } from "@/components/auth/PlatformAdminGuard";
import { SubAccountGuard } from "@/components/auth/SubAccountGuard";
import { SubAccountLayout } from "@/components/layout/SubAccountLayout";
import { isPlatformHost, isSubaccountHost, isCustomDomainHost } from "@/utils/platformUrls";
import { BlogRoutes } from "@/routes/BlogRoutes";

// New Auth Pages
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Onboarding from "./pages/auth/Onboarding";
import PublicLanding from "./pages/PublicLanding";

// Legacy pages (to be migrated)
import Dashboard from "./pages/Dashboard";
import Articles from "./pages/Articles";
import NewArticle from "./pages/NewArticle";
import NewArticleChat from "./pages/NewArticleChat";
import EditArticle from "./pages/EditArticle";
import AutomationSettings from "./pages/AutomationSettings";
import PublicBlog from "./pages/PublicBlog";
import PublicArticle from "./pages/PublicArticle";
import PublicLandingPage from "./pages/PublicLandingPage";
import CustomDomainBlog from "./pages/CustomDomainBlog";
import CustomDomainArticle from "./pages/CustomDomainArticle";
import CustomDomainLandingPage from "./pages/CustomDomainLandingPage";
import Pricing from "./pages/Pricing";
import Subscription from "./pages/Subscription";
import Analytics from "./pages/Analytics";
import Clusters from "./pages/Clusters";
import Keywords from "./pages/Keywords";
import Settings from "./pages/Settings";
import Strategy from "./pages/Strategy";
import Calendar from "./pages/Calendar";
import Performance from "./pages/Performance";
import QueryDetails from "./pages/QueryDetails";
import Ebooks from "./pages/Ebooks";
import EbookDetails from "./pages/EbookDetails";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import PublicEbook from "./pages/PublicEbook";
import PublicSmartLink from "./pages/PublicSmartLink";
import ClientReview from "./pages/ClientReview";
import Help from "./pages/Help";
import HelpArticle from "./pages/HelpArticle";
import Account from "./pages/Account";
import AccessDenied from "./pages/AccessDenied";
import AcceptInvite from "./pages/AcceptInvite";
import Profile from "./pages/Profile";
import MyBlog from "./pages/MyBlog";
import ValidationDashboard from "./pages/ValidationDashboard";
import Referrals from "./pages/Referrals";
import QuickAccess from "./pages/QuickAccess";
import ResetPassword from "./pages/ResetPassword";
import Blocked from "./pages/Blocked";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Services from "./pages/Services";
import TermsOfUseEN from "./pages/en/TermsOfUseEN";
import PrivacyPolicyEN from "./pages/en/PrivacyPolicyEN";
import ServicesEN from "./pages/en/ServicesEN";
import Integrations from "./pages/Integrations";
import OAuthCallback from "./pages/auth/OAuthCallback";
import ArticleQueuePage from "./pages/ArticleQueuePage";
import SocialCallback from "./pages/SocialCallback";

// Client (SubAccount) pages
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientArticleEditor from "./pages/client/ClientArticleEditor";
import ClientSite from "./pages/client/ClientSite";
import ClientAutomation from "./pages/client/ClientAutomation";
import ClientCompany from "./pages/client/ClientCompany";
import ClientAccount from "./pages/client/ClientAccount";
import ClientProfile from "./pages/client/ClientProfile";
import ClientLandingPages from "./pages/client/ClientLandingPages";
import ClientLandingPageEditor from "./pages/client/ClientLandingPageEditor";
import ClientSEO from "./pages/client/ClientSEO";
import ClientArticles from "./pages/client/ClientArticles";
import ClientReviewCenter from "./pages/client/ClientReviewCenter";
import ClientStrategy from "./pages/client/ClientStrategy";
import RadarV3Page from "./pages/client/RadarV3Page";
import ClientConsultantMetrics from "./pages/client/ClientConsultantMetrics";
import ClientNotificationSettings from "./pages/client/ClientNotificationSettings";
import ClientPosts from "./pages/client/ClientPosts";
import ClientTerritoryAnalytics from "./pages/client/ClientTerritoryAnalytics";
import ClientHelp from "./pages/client/ClientHelp";
import ClientHelpCategory from "./pages/client/ClientHelpCategory";
import ClientHelpArticle from "./pages/client/ClientHelpArticle";
import ClientHelpSearch from "./pages/client/ClientHelpSearch";
import ClientLeads from "./pages/client/ClientLeads";
import ClientEbooks from "./pages/client/ClientEbooks";
import ClientEbookEditor from "./pages/client/ClientEbookEditor";
import ClientDomains from "./pages/client/ClientDomains";
import ClientSettings from "./pages/client/ClientSettings";
import ClientConnectors from "./pages/client/ClientConnectors";
import SuperPageBuilder from "./pages/client/SuperPageBuilder";
import ArticleAdvancedPreview from "./pages/client/ArticleAdvancedPreview";
import GenerationDashboard from "./pages/client/GenerationDashboard";
import GenerationNew from "./pages/client/GenerationNew";
import GenerationDetail from "./pages/client/GenerationDetail";
import WordPressCallback from "./pages/cms/WordPressCallback";
import DebugGenerate from "./pages/DebugGenerate";
import { WorkflowMonitor } from "./pages/admin/WorkflowMonitor";
import ArticleLinksDashboard from "./pages/client/ArticleLinksDashboard";
import AIOSCommandCenter from "./pages/admin/AIOSCommandCenter";
import ClientROIDashboard from "./pages/client/ClientROIDashboard";

const queryClient = new QueryClient();

const LandingRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicLanding />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/terms" element={<TermsOfUse />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/services" element={<Services />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="*" element={<PublicLanding />} />
  </Routes>
);

/**
 * Root "/" for platform host only. Never redirect while auth is loading.
 * Public routes (/, /login, /signup) on landing/vercel are handled by LandingRoutes.
 */
const PlatformRoot = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  return <Navigate to={user ? "/client/dashboard" : "/login"} replace />;
};

// Redirect component for dynamic article routes
const ArticleEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/client/articles/${id}/edit`} replace />;
};

// Legacy blog redirects (avoid 404s on public content)
const BlogLegacyLandingPageRedirect = () => {
  const { blogSlug, pageSlug } = useParams();
  return <Navigate to={`/blog/${blogSlug}/p/${pageSlug}`} replace />;
};

const BlogLegacyArticleRedirect = () => {
  const { blogSlug, articleSlug } = useParams();
  return <Navigate to={`/blog/${blogSlug}/${articleSlug}`} replace />;
};

// Global Error Fallback - prevents white screen crashes
function GlobalErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-foreground mb-2">Algo deu errado</h1>
        <p className="text-muted-foreground mb-4">
          Ocorreu um erro inesperado. Tente recarregar a página.
        </p>
        <pre className="text-xs text-destructive bg-destructive/10 p-3 rounded-md mb-4 overflow-auto max-h-32">
          {error.message}
        </pre>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Recarregar Página
          </button>
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente de fallback local para evitar desmontar o App inteiro
function PageErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-6 border-2 border-destructive/20 bg-destructive/5 rounded-xl text-center my-8 mx-4 shadow-sm animate-in fade-in duration-300">
      <h2 className="text-lg font-bold text-destructive mb-2">Erro de Renderização Local</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{error.message}</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={resetErrorBoundary} variant="outline" size="sm">Tentar Recuperar</Button>
        <Button onClick={() => window.location.reload()} variant="ghost" size="sm">Recarregar</Button>
      </div>
    </div>
  );
}

// User protected routes wrapper - uses TenantGuard
const UserRoutes = () => (
  <TenantGuard>
    <Routes>
      <Route index element={<Navigate to="/client/dashboard" replace />} />
      <Route path="dashboard" element={<Navigate to="/client/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
    </Routes>
  </TenantGuard>
);

// Admin protected routes wrapper
const AdminRoutes = () => (
  <PlatformAdminGuard>
    <Routes>
      <Route index element={<Admin />} />
      <Route path="command-center" element={<AIOSCommandCenter />} />
      <Route path="validation" element={<ValidationDashboard />} />
      <Route path="workflows" element={<WorkflowMonitor />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </PlatformAdminGuard>
);

// Client (SubAccount) routes wrapper
const ClientRoutes = () => (
  <SubAccountGuard>
    <SubAccountLayout>
      <ErrorBoundary
        FallbackComponent={PageErrorFallback}
        onReset={() => {
          // Limpa estados que podem estar causando o conflito de DOM
          window.location.hash = '';
        }}
      >
        <Routes>
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="roi" element={<ClientROIDashboard />} />

          {/* Resultados & ROI */}
          <Route path="results" element={<ClientConsultantMetrics />} />
          <Route path="leads" element={<ClientLeads />} />

          {/* Inteligência */}
          <Route path="radar" element={<RadarV3Page />} />
          <Route path="strategy" element={<ClientStrategy />} />
          <Route path="seo" element={<ClientSEO />} />

          {/* Conteúdo */}
          <Route path="articles" element={<ClientArticles />} />
          <Route path="articles/generate" element={<SuperPageBuilder />} />
          <Route path="articles/engine" element={<GenerationDashboard />} />
          <Route path="articles/engine/new" element={<GenerationNew />} />
          <Route path="articles/engine/:jobId" element={<GenerationDetail />} />
          <Route path="articles/:id/preview" element={<ArticleAdvancedPreview />} />
          <Route path="portal" element={<ClientSite />} />
          <Route path="landing-pages" element={<ClientLandingPages />} />
          <Route
            path="landing-pages/new"
            element={<ClientLandingPageEditor key="lp-new" />}
          />
          <Route
            path="landing-pages/:id"
            element={<ClientLandingPageEditor key="lp-edit" />}
          />
          <Route path="create" element={<Navigate to="/client/articles/engine/new" replace />} />
          <Route path="articles/:id/edit" element={<ClientArticleEditor />} />
          <Route path="review/:id" element={<ClientReviewCenter />} />
          <Route path="ebooks" element={<ClientEbooks />} />
          <Route path="ebooks/:id" element={<ClientEbookEditor />} />
          <Route path="links" element={<ArticleLinksDashboard />} />

          {/* Operação */}
          <Route path="automation" element={<ClientAutomation />} />
          <Route path="profile" element={<ClientProfile />} />
          <Route path="company" element={<ClientCompany />} />
          <Route path="account" element={<ClientAccount />} />
          <Route path="territories" element={<ClientTerritoryAnalytics />} />
          <Route path="domains" element={<ClientDomains />} />
          <Route path="settings" element={<ClientSettings />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="connectors" element={<ClientConnectors />} />

          {/* Ajuda */}
          <Route path="help" element={<ClientHelp />} />
          <Route path="help/category/:category" element={<ClientHelpCategory />} />
          <Route path="help/search" element={<ClientHelpSearch />} />
          <Route path="help/:slug" element={<ClientHelpArticle />} />

          {/* Legacy redirects para compatibilidade */}
          <Route path="posts" element={<Navigate to="/client/articles" replace />} />
          <Route path="site" element={<Navigate to="/client/portal" replace />} />
          <Route path="consultant" element={<Navigate to="/client/results" replace />} />
          <Route path="performance" element={<Navigate to="/client/results?tab=performance" replace />} />
          <Route path="notifications" element={<Navigate to="/client/profile?tab=account" replace />} />
          <Route path="queue" element={<Navigate to="/client/automation?tab=queue" replace />} />
          <Route path="integrations/gsc" element={<Navigate to="/client/profile?tab=account" replace />} />

          <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </SubAccountLayout>
  </SubAccountGuard>
);

// Platform routes - for app.omniseen.app only
const PlatformRoutes = () => (
  <Routes>
    {/* Root: dashboard when authed, otherwise login */}
    <Route path="/" element={<PlatformRoot />} />
    <Route path="/debug-generate" element={<DebugGenerate />} />

    {/* New Auth routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/blocked" element={<Blocked />} />
    <Route path="/access-denied" element={<AccessDenied />} />
    <Route path="/cms/wordpress-callback" element={<WordPressCallback />} />
    <Route path="/invite/accept" element={<AcceptInvite />} />
    <Route path="/oauth/callback" element={<OAuthCallback />} />
    <Route path="/app/social/callback" element={<SocialCallback />} />

    {/* Legacy auth redirects */}
    <Route path="/auth" element={<Navigate to="/login" replace />} />
    <Route path="/forgot-password" element={<Navigate to="/reset-password" replace />} />
    <Route path="/oauth/google/callback" element={<Navigate to="/oauth/callback" replace />} />

    {/* Public content */}
    <Route path="/help" element={<Help />} />
    <Route path="/help/:slug" element={<HelpArticle />} />
    <Route path="/terms" element={<TermsOfUse />} />
    <Route path="/privacy" element={<PrivacyPolicy />} />
    <Route path="/services" element={<Services />} />
    <Route path="/servicos" element={<Navigate to="/services" replace />} />
    <Route path="/en/terms" element={<TermsOfUseEN />} />
    <Route path="/en/privacy" element={<PrivacyPolicyEN />} />
    <Route path="/en/services" element={<ServicesEN />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/ebook/:slug" element={<PublicEbook />} />
    <Route path="/a/:slug" element={<PublicSmartLink />} />
    <Route path="/review/:token" element={<ClientReview />} />

    {/*
      Public Super Pages (short URL)
      - Required for shared links like /p/:slug on app.omniseen.app
      - PublicLandingPage was updated to resolve blog via landing_pages.slug when blogSlug is absent
    */}
    <Route path="/p/:pageSlug/*" element={<PublicLandingPage />} />

    {/* Public blog + legacy redirects (never 404 for published URLs) */}
    <Route path="/blog/:blogSlug/page/:pageSlug" element={<BlogLegacyLandingPageRedirect />} />
    <Route path="/blog/:blogSlug/landing/:pageSlug" element={<BlogLegacyLandingPageRedirect />} />
    <Route path="/blog/:blogSlug/landing-pages/:pageSlug" element={<BlogLegacyLandingPageRedirect />} />
    <Route path="/blog/:blogSlug/post/:articleSlug" element={<BlogLegacyArticleRedirect />} />
    <Route path="/blog/:blogSlug/articles/:articleSlug" element={<BlogLegacyArticleRedirect />} />

    <Route path="/blog/:blogSlug/*" element={<PublicBlog />} />
    <Route path="/blog/:blogSlug/p/:pageSlug/*" element={<PublicLandingPage />} />
    <Route path="/blog/:blogSlug/:articleSlug/*" element={<PublicArticle />} />

    {/* Protected user routes - redirects to /client */}
    <Route path="/app/*" element={<UserRoutes />} />

    {/* Protected admin routes */}
    <Route path="/admin/*" element={<AdminRoutes />} />

    {/* SubAccount (Client) routes - main app experience */}
    <Route path="/client/*" element={<ClientRoutes />} />

    {/* Legacy redirects */}
    <Route path="/dashboard" element={<Navigate to="/client/dashboard" replace />} />
    <Route path="/articles" element={<Navigate to="/client/articles" replace />} />

    {/* Catch-all */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

/**
 * SubaccountRouteDecider: Para subdomínios {slug}.app.omniseen.app
 *
 * ROTAS PRÓPRIAS DO SUBDOMÍNIO:
 * - Paths públicos (/, /:slug, /p/:slug) → BlogRoutes (sem auth)
 * - Paths /client/* → ClientRoutes diretamente (com SubAccountGuard)
 * - Paths de auth (/login, /signup) → Redireciona para app.omniseen.app
 * - Paths de admin (/admin) → Redireciona para app.omniseen.app/admin
 */
/**
 * SubaccountRouteDecider: Para subdomínios {slug}.app.omniseen.app
 */
const SubaccountRouteDecider = () => {
  console.log('[SubaccountRouteDecider] Rendering routes');

  return (
    <Routes>
      <Route path="/client/*" element={<ClientRoutes />} />
      {/* Blog público */}
      <Route path="*" element={<BlogRoutes />} />
    </Routes>
  );
};

/**
 * CustomDomainRouteDecider: Para domínios customizados (blog.cliente.com.br)
 * Sempre mostra o blog público
 */
const CustomDomainRouteDecider = () => {
  return <BlogRoutes />;
};

/**
 * Public hosts: "/" "/login" "/signup" ALWAYS public. No auth redirect.
 * Única lógica de detecção para landing.
 */
function isPublicLandingHost(host: string): boolean {
  return (
    host === 'omniseen.app' ||
    host === 'www.omniseen.app' ||
    host.endsWith('.vercel.app')
  );
}

/**
 * App (plataforma) host: rotas /client/* e /app/* com guards.
 */
function isAppHost(host: string): boolean {
  return host === 'app.omniseen.app' || host === 'localhost' || host === '127.0.0.1';
}

/**
 * AppRoutes: decisão por hostname e estabilidade de SPA.
 */
const AppRoutes = () => {
  const host = window.location.hostname;
  const path = window.location.pathname;

  console.log('[AppRoutes] Host detected:', host, 'Path:', path);

  // PLATFORM HUB HOST (app.omniseen.app / localhost)
  if (isAppHost(host)) {
    return <PlatformRoutes />;
  }

  // Se o caminho for interno (ex: /client/*, /login), forçamos PlatformRoutes
  // Mesmo em hosts como omniseen.app (Vercel)
  const isInternal =
    path.startsWith('/client') ||
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/app') ||
    path.startsWith('/admin') ||
    path.startsWith('/oauth') ||
    path.startsWith('/invite') ||
    path.startsWith('/cms');

  if (isInternal) {
    return <PlatformRoutes />;
  }

  // Hosts específicos
  if (isSubaccountHost()) {
    return <SubaccountRouteDecider />;
  }

  if (isCustomDomainHost()) {
    return <CustomDomainRouteDecider />;
  }

  // Landing page como padrão para outros hosts
  if (isPublicLandingHost(host)) {
    return <LandingRoutes />;
  }

  return <PlatformRoutes />;
};

/**
 * Handler de reset do ErrorBoundary
 * REGRA: Subdomínios públicos NUNCA redirecionam para /login
 * - *.app.omniseen.app (blogs públicos) → reload
 * - Domínios customizados → reload
 * - app.omniseen.app (plataforma) → /login
 */
const handleErrorReset = () => {
  if (isSubaccountHost() || isCustomDomainHost()) {
    console.log('[ErrorBoundary] Public host detected, reloading instead of redirecting to login');
    window.location.reload();
    return;
  }
  window.location.href = '/login';
};

// Main App - with global ErrorBoundary for crash protection
const App = () => (
  <ErrorBoundary
    FallbackComponent={GlobalErrorFallback}
    onReset={handleErrorReset}
    onError={(error) => console.error('[App] Global error caught:', error)}
  >
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        disableTransitionOnChange
      >
        <AuthProvider>
          <TenantProvider>
            <TooltipProvider>
              {/* UNIFICADO: Usando apenas Sonner para evitar conflitos de DOM */}
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;