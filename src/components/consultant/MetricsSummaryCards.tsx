import { Card, CardContent } from '@/components/ui/card';
import { Target, FileCheck, Crosshair, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MetricsSummaryCardsProps {
  highScoreOpportunities: number;
  convertedArticles: number;
  radarUtilizationRate: number;
  estimatedROI: number;
  previousHighScore?: number;
  previousConverted?: number;
  currency?: string;
}

export function MetricsSummaryCards({
  highScoreOpportunities,
  convertedArticles,
  radarUtilizationRate,
  estimatedROI,
  previousHighScore = 0,
  previousConverted = 0,
  currency = 'BRL'
}: MetricsSummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getDelta = (current: number, previous: number) => {
    if (previous === 0) return null;
    const delta = ((current - previous) / previous) * 100;
    return delta;
  };

  const highScoreDelta = getDelta(highScoreOpportunities, previousHighScore);
  const convertedDelta = getDelta(convertedArticles, previousConverted);

  const cards = [
    {
      icon: Target,
      label: 'Alto Score (90%+)',
      value: highScoreOpportunities,
      delta: highScoreDelta,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      icon: FileCheck,
      label: 'Convertidas em Artigos',
      value: convertedArticles,
      delta: convertedDelta,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      icon: Crosshair,
      label: 'Aproveitamento do Radar',
      value: `${radarUtilizationRate.toFixed(0)}%`,
      delta: null,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      tooltip: 'Este indicador mostra o percentual das oportunidades detectadas pelo sistema que já foram transformadas em artigos reais.\n\nEle mede o quanto você está executando o plano editorial sugerido pela IA — não o resultado no mercado.'
    },
    {
      icon: DollarSign,
      label: 'ROI Estimado',
      value: formatCurrency(estimatedROI),
      delta: null,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const cardContent = (
            <Card key={card.label} className="bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 cursor-default">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={cn('p-2 rounded-lg', card.bgColor)}>
                    <card.icon className={cn('h-5 w-5', card.color)} />
                  </div>
                  {card.delta !== null && (
                    <div className={cn(
                      'flex items-center gap-1 text-xs font-medium',
                      card.delta >= 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {card.delta >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(card.delta).toFixed(0)}%
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {card.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          );

          if (card.tooltip) {
            return (
              <Tooltip key={card.label}>
                <TooltipTrigger asChild>
                  {cardContent}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs whitespace-pre-line text-sm">
                  {card.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          }

          return cardContent;
        })}
      </div>
    </TooltipProvider>
  );
}
