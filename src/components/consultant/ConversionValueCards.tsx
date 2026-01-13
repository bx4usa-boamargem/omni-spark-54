import { Card, CardContent } from '@/components/ui/card';
import { Eye, Target, DollarSign } from 'lucide-react';
import { EconomicsTooltip } from '@/components/roi/EconomicsTooltip';

interface ConversionValueCardsProps {
  exposureCount: number;
  intentCount: number;
  valuePerExposure: number;
  valuePerIntent: number;
  averageTicket: number;
  closingRate: number;
  opportunityValue: number;
  isConfigured: boolean;
  previousPeriodDelta?: number;
}

export function ConversionValueCards({
  exposureCount,
  intentCount,
  valuePerExposure,
  valuePerIntent,
  averageTicket,
  closingRate,
  opportunityValue,
  isConfigured,
  previousPeriodDelta
}: ConversionValueCardsProps) {
  const exposureValue = exposureCount * valuePerExposure;
  const intentValue = intentCount * valuePerIntent;
  const totalValue = exposureValue + intentValue;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('pt-BR');
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Exposure Card */}
      <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 border-violet-200 dark:border-violet-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-violet-500/10">
                <Eye className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                Exposição Comercial
              </span>
            </div>
            <EconomicsTooltip
              averageTicket={averageTicket}
              closingRate={closingRate}
              opportunityValue={opportunityValue}
              valuePerExposure={valuePerExposure}
              valuePerIntent={valuePerIntent}
              isConfigured={isConfigured}
            />
          </div>
          
          <p className="text-3xl font-bold text-foreground mb-1">
            {formatNumber(exposureCount)}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            exposições qualificadas (≥60% scroll)
          </p>
          
          <div className="pt-3 border-t border-violet-200 dark:border-violet-800">
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {formatCurrency(exposureValue)}
            </p>
            <p className="text-xs text-muted-foreground">
              ({formatCurrency(valuePerExposure)}/exposição)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Intent Card */}
      <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Target className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Intenção Comercial
              </span>
            </div>
            <EconomicsTooltip
              averageTicket={averageTicket}
              closingRate={closingRate}
              opportunityValue={opportunityValue}
              valuePerExposure={valuePerExposure}
              valuePerIntent={valuePerIntent}
              isConfigured={isConfigured}
            />
          </div>
          
          <p className="text-3xl font-bold text-foreground mb-1">
            {formatNumber(intentCount)}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            cliques no CTA
          </p>
          
          <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(intentValue)}
            </p>
            <p className="text-xs text-muted-foreground">
              ({formatCurrency(valuePerIntent)}/clique)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Value Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-500/20 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-primary uppercase tracking-wide">
              Valor Total
            </span>
          </div>
          
          <p className="text-4xl font-bold text-foreground mb-1">
            {formatCurrency(totalValue)}
          </p>
          
          {previousPeriodDelta !== undefined && (
            <p className={`text-sm ${previousPeriodDelta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {previousPeriodDelta >= 0 ? '+' : ''}{previousPeriodDelta.toFixed(1)}% vs período anterior
            </p>
          )}
          
          <div className="pt-3 mt-4 border-t border-primary/20">
            <p className="text-xs text-muted-foreground">
              Exposição + Intenção = Impacto Comercial Mensurável
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
