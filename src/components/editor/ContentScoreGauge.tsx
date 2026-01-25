import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCORE_THRESHOLDS, getScoreThreshold } from '@/lib/scoreThresholds';

interface ContentScoreGaugeProps {
  score: number | null;
  loading?: boolean;
  goalMarker?: number;
  className?: string;
}

/**
 * Velocímetro profissional com escala 0-100
 * - Marcações numéricas a cada 10 pontos
 * - Tracinhos intermediários
 * - Ponteiro animado com transição suave
 * - Faixas de cor FIXAS: 0-49 (vermelho), 50-79 (amarelo), 80-100 (verde)
 * 
 * CRITICAL: Score comes from database (article_content_scores.total_score)
 * Never use hardcoded values.
 */
export function ContentScoreGauge({ 
  score, 
  loading = false, 
  goalMarker = 50,
  className 
}: ContentScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const hasScore = score !== null;
  const targetScore = score ?? 0;
  
  // Animate score changes
  useEffect(() => {
    if (loading || !hasScore) return;
    
    const duration = 800;
    const steps = 40;
    const increment = (targetScore - displayScore) / steps;
    let current = displayScore;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayScore(targetScore);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [targetScore, loading, hasScore]);

  // Gauge dimensions
  const width = 240;
  const height = 140;
  const strokeWidth = 16;
  const radius = 90;
  const centerX = 120;
  const centerY = 110;
  
  // Pointer position (angle in degrees, 0 = left, 180 = right)
  const pointerAngle = (displayScore / 100) * 180;
  const pointerRad = (180 - pointerAngle) * (Math.PI / 180);
  const pointerX = centerX + (radius - strokeWidth / 2) * Math.cos(pointerRad);
  const pointerY = centerY - (radius - strokeWidth / 2) * Math.sin(pointerRad);
  
  // Goal marker position
  const goalAngle = (goalMarker / 100) * 180;
  const goalRad = (180 - goalAngle) * (Math.PI / 180);
  const goalX = centerX + (radius + 20) * Math.cos(goalRad);
  const goalY = centerY - (radius + 20) * Math.sin(goalRad);
  
  // Get score color based on threshold
  const getScoreColor = () => {
    if (!hasScore) return 'hsl(var(--muted-foreground))';
    return getScoreThreshold(displayScore).color;
  };
  
  // Arc paths for each threshold zone
  const createArc = (startAngle: number, endAngle: number) => {
    const startRad = (180 - startAngle) * (Math.PI / 180);
    const endRad = (180 - endAngle) * (Math.PI / 180);
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY - radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY - radius * Math.sin(endRad);
    const largeArc = endAngle - startAngle > 90 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Create tick marks
  const ticks = [];
  for (let i = 0; i <= 100; i += 5) {
    const angle = (i / 100) * 180;
    const rad = (180 - angle) * (Math.PI / 180);
    const isMajor = i % 10 === 0;
    const innerRadius = radius - strokeWidth / 2 - (isMajor ? 10 : 5);
    const outerRadius = radius - strokeWidth / 2;
    
    const x1 = centerX + innerRadius * Math.cos(rad);
    const y1 = centerY - innerRadius * Math.sin(rad);
    const x2 = centerX + outerRadius * Math.cos(rad);
    const y2 = centerY - outerRadius * Math.sin(rad);
    
    ticks.push({
      x1, y1, x2, y2,
      isMajor,
      value: i,
      labelX: centerX + (innerRadius - 12) * Math.cos(rad),
      labelY: centerY - (innerRadius - 12) * Math.sin(rad),
    });
  }

  return (
    <div className={cn("relative flex flex-col items-center py-4", className)}>
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Background track */}
        <path
          d={createArc(0, 180)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />
        
        {/* FAIXA 1: Vermelho (0-49) = 0° a 88.2° */}
        <path
          d={createArc(0, 88.2)}
          fill="none"
          stroke={SCORE_THRESHOLDS.POOR.color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />
        
        {/* FAIXA 2: Amarelo (50-79) = 90° a 142.2° */}
        <path
          d={createArc(90, 142.2)}
          fill="none"
          stroke={SCORE_THRESHOLDS.GOOD.color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />
        
        {/* FAIXA 3: Verde (80-100) = 144° a 180° */}
        <path
          d={createArc(144, 180)}
          fill="none"
          stroke={SCORE_THRESHOLDS.EXCELLENT.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="hsl(var(--foreground))"
              strokeWidth={tick.isMajor ? 2 : 1}
              opacity={tick.isMajor ? 0.7 : 0.4}
            />
            {tick.isMajor && (
              <text
                x={tick.labelX}
                y={tick.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                className="fill-muted-foreground font-medium"
              >
                {tick.value}
              </text>
            )}
          </g>
        ))}
        
        {/* Goal marker 🔥 */}
        <g transform={`translate(${goalX}, ${goalY})`}>
          <circle r="11" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <text 
            x="0" 
            y="4" 
            textAnchor="middle" 
            fontSize="11"
            className="select-none"
          >
            🔥
          </text>
        </g>
        
        {/* Moving pointer (needle) - only show when has score and not loading */}
        {hasScore && !loading && (
          <g className="transition-all duration-500 ease-out">
            {/* Pointer needle */}
            <line
              x1={centerX}
              y1={centerY}
              x2={pointerX}
              y2={pointerY}
              stroke={getScoreColor()}
              strokeWidth={4}
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              }}
            />
            {/* Center cap */}
            <circle
              cx={centerX}
              cy={centerY}
              r={10}
              fill={getScoreColor()}
              stroke="hsl(var(--background))"
              strokeWidth={3}
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              }}
            />
            {/* Pointer tip */}
            <circle
              cx={pointerX}
              cy={pointerY}
              r={6}
              fill={getScoreColor()}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          </g>
        )}
        
        {/* Min/Max labels */}
        <text 
          x={centerX - radius - 5} 
          y={centerY + 20} 
          textAnchor="middle" 
          fontSize="11"
          className="fill-muted-foreground font-semibold"
        >
          0
        </text>
        <text 
          x={centerX + radius + 5} 
          y={centerY + 20} 
          textAnchor="middle" 
          fontSize="11"
          className="fill-muted-foreground font-semibold"
        >
          100
        </text>
      </svg>
      
      {/* Score display - centered below gauge */}
      <div className="flex flex-col items-center mt-2">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              {hasScore ? (
                <>
                  <span 
                    className="text-4xl font-bold tabular-nums"
                    style={{ color: getScoreColor() }}
                  >
                    {displayScore}
                  </span>
                  <span 
                    className="text-lg font-medium text-muted-foreground"
                  >
                    /100
                  </span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold tabular-nums text-muted-foreground">
                    --
                  </span>
                  <span className="text-lg font-medium text-muted-foreground">
                    /100
                  </span>
                </>
              )}
            </div>
            {hasScore && (
              <span 
                className="text-sm font-medium mt-1"
                style={{ color: getScoreColor() }}
              >
                {getScoreThreshold(displayScore).label}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Status text when no score */}
      {!hasScore && !loading && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Calcule o score para ver a pontuação
        </p>
      )}
    </div>
  );
}
