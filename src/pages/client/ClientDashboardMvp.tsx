import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
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
  const { blog } = useBlog();

  // Extrair primeiro nome do usuário
  const firstName = user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Usuário';

  // Subdomínio ou slug do blog
  const subdomain = blog?.platform_subdomain || blog?.slug || 'minha-conta';

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
