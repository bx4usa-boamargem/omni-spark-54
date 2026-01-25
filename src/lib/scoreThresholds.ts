/**
 * Score Thresholds - Configuração global de faixas de pontuação
 * 
 * REGRA IMUTÁVEL:
 * - 0-49: Ruim (vermelho) - Conteúdo fraco, não publicável
 * - 50-79: Bom (amarelo) - Publicável, mas pode melhorar
 * - 80-100: Excelente (verde) - Pronto para competir no SERP
 */

export const SCORE_THRESHOLDS = {
  POOR: {
    min: 0,
    max: 49,
    color: 'hsl(0, 84%, 60%)',      // Vermelho
    colorHex: '#EF4444',
    label: 'Ruim',
    labelEn: 'Poor',
    bgClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
    bgLightClass: 'bg-red-100 dark:bg-red-900/30',
  },
  GOOD: {
    min: 50,
    max: 79,
    color: 'hsl(38, 92%, 50%)',     // Amarelo/Laranja
    colorHex: '#EAB308',
    label: 'Bom',
    labelEn: 'Good',
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-600 dark:text-yellow-400',
    bgLightClass: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  EXCELLENT: {
    min: 80,
    max: 100,
    color: 'hsl(142, 76%, 36%)',    // Verde
    colorHex: '#22C55E',
    label: 'Excelente',
    labelEn: 'Excellent',
    bgClass: 'bg-green-500',
    textClass: 'text-green-600 dark:text-green-400',
    bgLightClass: 'bg-green-100 dark:bg-green-900/30',
  },
} as const;

export type ScoreThreshold = typeof SCORE_THRESHOLDS[keyof typeof SCORE_THRESHOLDS];

/**
 * Retorna a faixa de threshold para um determinado score
 */
export function getScoreThreshold(score: number): ScoreThreshold {
  if (score >= 80) return SCORE_THRESHOLDS.EXCELLENT;
  if (score >= 50) return SCORE_THRESHOLDS.GOOD;
  return SCORE_THRESHOLDS.POOR;
}

/**
 * Retorna a cor HSL para um score
 */
export function getScoreColor(score: number): string {
  return getScoreThreshold(score).color;
}

/**
 * Retorna o label localizado para um score
 */
export function getScoreLabel(score: number): string {
  return getScoreThreshold(score).label;
}

/**
 * Verifica se o score está na faixa de publicação (>= 50)
 */
export function isPublishable(score: number): boolean {
  return score >= SCORE_THRESHOLDS.GOOD.min;
}

/**
 * Verifica se o score é excelente (>= 80)
 */
export function isExcellent(score: number): boolean {
  return score >= SCORE_THRESHOLDS.EXCELLENT.min;
}

/**
 * Calcula a porcentagem de progresso dentro de uma faixa
 */
export function getThresholdProgress(score: number): number {
  const threshold = getScoreThreshold(score);
  const range = threshold.max - threshold.min;
  const position = score - threshold.min;
  return Math.min(100, Math.max(0, (position / range) * 100));
}

/**
 * Valida se um novo score é uma melhoria válida (não-regressão)
 */
export function validateScoreImprovement(
  previousScore: number,
  newScore: number
): { valid: boolean; message: string; improvement: number } {
  const improvement = newScore - previousScore;
  
  if (newScore < previousScore) {
    return {
      valid: false,
      message: `Score caiu de ${previousScore} para ${newScore}. Mudança revertida.`,
      improvement,
    };
  }
  
  if (newScore === previousScore) {
    return {
      valid: true,
      message: `Score mantido em ${newScore}. Nenhuma melhoria possível neste passo.`,
      improvement: 0,
    };
  }
  
  return {
    valid: true,
    message: `Score melhorou: ${previousScore} → ${newScore} (+${improvement})`,
    improvement,
  };
}
