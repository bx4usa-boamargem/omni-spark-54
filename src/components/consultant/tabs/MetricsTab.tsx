import { MetricsSummaryCards } from '@/components/consultant/MetricsSummaryCards';
import { ConversionFunnel } from '@/components/consultant/ConversionFunnel';
import { ROICalculator } from '@/components/consultant/ROICalculator';
import { TopOpportunitiesTable } from '@/components/consultant/TopOpportunitiesTable';
import { OpportunityEvolutionChart } from '@/components/consultant/OpportunityEvolutionChart';

interface MetricsTabProps {
  metrics: {
    totalOpportunities: number;
    highScoreOpportunities: number;
    mediumScoreOpportunities: number;
    lowScoreOpportunities: number;
    convertedToArticles: number;
    publishedArticles: number;
    radarUtilizationRate: number;
    totalViews: number;
    totalShares: number;
    estimatedROI: number;
  };
  evolutionData: { date: string; highScore: number; converted: number }[];
  opportunities: any[];
  blogId?: string;
}

export function MetricsTab({ metrics, evolutionData, opportunities, blogId }: MetricsTabProps) {
  return (
    <div className="space-y-6">
      {/* Narrativa Visual: 4 Camadas do Painel */}
      <div className="grid grid-cols-4 gap-2 p-3 bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-white/5 dark:to-indigo-900/10 rounded-xl border border-slate-200 dark:border-white/10">
        <div className="text-center p-2">
          <span className="text-lg">📡</span>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">RADAR</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Oportunidades</p>
        </div>
        <div className="text-center p-2 border-l border-slate-200 dark:border-white/10">
          <span className="text-lg">🛠️</span>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">EXECUÇÃO</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Virou conteúdo</p>
        </div>
        <div className="text-center p-2 border-l border-slate-200 dark:border-white/10">
          <span className="text-lg">🎯</span>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">IMPACTO</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Ação do mercado</p>
        </div>
        <div className="text-center p-2 border-l border-slate-200 dark:border-white/10">
          <span className="text-lg">💰</span>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">ROI</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Valor gerado</p>
        </div>
      </div>

      {/* Summary Cards */}
      <MetricsSummaryCards
        highScoreOpportunities={metrics.highScoreOpportunities}
        convertedArticles={metrics.convertedToArticles}
        radarUtilizationRate={metrics.radarUtilizationRate}
        estimatedROI={metrics.estimatedROI}
      />

      {/* Evolution Chart */}
      <OpportunityEvolutionChart data={evolutionData} />

      {/* Funnel and ROI */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ConversionFunnel
          totalOpportunities={metrics.totalOpportunities}
          highScoreOpportunities={metrics.highScoreOpportunities}
          convertedToArticles={metrics.convertedToArticles}
          publishedArticles={metrics.publishedArticles}
        />
        
        <ROICalculator
          totalViews={metrics.totalViews}
          totalShares={metrics.totalShares}
          publishedArticles={metrics.publishedArticles}
          highScoreOpportunities={metrics.highScoreOpportunities}
        />
      </div>

      {/* Top Opportunities */}
      <TopOpportunitiesTable opportunities={opportunities} blogId={blogId} />
    </div>
  );
}
