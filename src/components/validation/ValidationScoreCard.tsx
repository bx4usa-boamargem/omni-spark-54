import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { getScoreThreshold } from "@/lib/scoreThresholds";

interface ValidationScoreCardProps {
  score: number;
  criticalCount: number;
  warningCount: number;
  suggestionCount: number;
  onAutoFix?: () => void;
  isFixing?: boolean;
  canAutoFix?: boolean;
}

export function ValidationScoreCard({
  score,
  criticalCount,
  warningCount,
  suggestionCount,
  onAutoFix,
  isFixing = false,
  canAutoFix = false,
}: ValidationScoreCardProps) {
  const threshold = getScoreThreshold(score);

  // Calculate SVG circle properties
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className={`${threshold.bgLightClass} border-0`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {/* Circular Score */}
          <div className="flex items-center gap-4">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted-foreground/20"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  stroke={threshold.color}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${threshold.textClass}`}>{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className={`text-lg font-semibold ${threshold.textClass}`}>
                {threshold.label}
              </p>
              <p className="text-sm text-muted-foreground">
                Score de qualidade
              </p>
            </div>
          </div>

          {/* Issue Counts */}
          <div className="flex flex-col gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                <AlertTriangle className="h-3 w-3" />
                {warningCount} aviso{warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {suggestionCount > 0 && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                {suggestionCount} sugestão{suggestionCount !== 1 ? 'ões' : ''}
              </Badge>
            )}
            {criticalCount === 0 && warningCount === 0 && suggestionCount === 0 && (
              <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle className="h-3 w-3" />
                Tudo OK!
              </Badge>
            )}
          </div>
        </div>

        {/* Auto-fix button */}
        {canAutoFix && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Button
              onClick={onAutoFix}
              disabled={isFixing}
              className="w-full gap-2"
              variant="outline"
            >
              <Sparkles className="h-4 w-4" />
              {isFixing ? 'Corrigindo...' : 'Auto-corrigir Problemas'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
