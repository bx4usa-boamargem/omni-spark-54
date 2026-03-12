import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { StatusCardsRow } from "@/components/dashboard/StatusCardsRow";
import { ValueProofSection } from "@/components/dashboard/ValueProofSection";
import { DashboardRadarWidget } from "@/components/dashboard/DashboardRadarWidget";
import { DashboardTerritoryPerformance } from "@/components/dashboard/DashboardTerritoryPerformance";


export default function ClientDashboardMvp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blog, loading } = useBlog(); // Assuming useBlog returns a loading state

  // Extrair primeiro nome do usuário
  const firstName = user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Usuário';

  // Subdomínio ou slug do blog
  const subdomain = blog?.platform_subdomain || blog?.slug || 'minha-conta';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-lg text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Bem-vindo, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Tudo pronto para começar. Crie seu primeiro artigo e veja a mágica acontecer.
          </p>
        </div>
        <Button
          onClick={() => navigate("/client/articles/engine/new")}
          className="bg-[#FF6B00] hover:bg-[#E56000] text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#FF6B00]/25 px-8 py-6 rounded-xl transition-all hover:-translate-y-0.5 text-base"
        >
          <Sparkles className="h-5 w-5" />
          Gerar meu primeiro artigo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      {/* BLOCO 1: BOAS-VINDAS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-transparent border-none shadow-none pb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Bem-vindo, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">{subdomain}.omniseen.com</p>
        </div>
        <Button
          onClick={() => navigate("/client/articles/engine/new")}
          className="bg-[#FF6B00] hover:bg-[#E56000] text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#FF6B00]/25 px-6 py-6 rounded-xl transition-all hover:-translate-y-0.5"
        >
          <Sparkles className="h-5 w-5" />
          Gerar Artigo
        </Button>
      </div>

      {/* BLOCO 2: STATUS RÁPIDO */}
      <StatusCardsRow blogId={blog?.id} />

      {/* BLOCO 3: PROVA DE VALOR */}
      <ValueProofSection blogId={blog?.id} />

      {/* BLOCO 4: RADAR DE OPORTUNIDADES (Real Backend Integration) */}
      <DashboardRadarWidget blogId={blog?.id} />

      {/* BLOCO 5: PERFORMANCE POR TERRITÓRIO */}
      <DashboardTerritoryPerformance />
    </div>
  );
}
