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
    conversionRate: number;
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
      {/* Summary Cards */}
      <MetricsSummaryCards
        highScoreOpportunities={metrics.highScoreOpportunities}
        convertedArticles={metrics.convertedToArticles}
        conversionRate={metrics.conversionRate}
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
