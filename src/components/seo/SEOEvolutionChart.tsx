import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ArticleVersion } from "./ArticleVersionHistory";
import { calculateSEOScore } from "@/utils/seoScore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SEOEvolutionChartProps {
  versions: ArticleVersion[];
  currentTitle: string;
  currentMeta: string;
  currentContent: string | null;
  currentKeywords: string[];
  currentFeaturedImage?: string | null;
}

export function SEOEvolutionChart({
  versions,
  currentTitle,
  currentMeta,
  currentContent,
  currentKeywords,
  currentFeaturedImage,
}: SEOEvolutionChartProps) {
  const chartData = useMemo(() => {
    // Calculate score for each version (oldest first)
    const sortedVersions = [...versions].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const versionData = sortedVersions.map((version, index) => {
      const { totalScore } = calculateSEOScore({
        title: version.title,
        metaDescription: version.meta_description || '',
        content: version.content,
        keywords: version.keywords || [],
        featuredImage: null, // Versions don't store image
      });

      return {
        name: `V${version.version_number}`,
        score: totalScore,
        date: format(new Date(version.created_at), "dd/MM HH:mm", { locale: ptBR }),
        changeType: version.change_type,
        fullDate: version.created_at,
      };
    });

    // Add current state
    const { totalScore: currentScore } = calculateSEOScore({
      title: currentTitle,
      metaDescription: currentMeta,
      content: currentContent,
      keywords: currentKeywords,
      featuredImage: currentFeaturedImage,
    });

    versionData.push({
      name: 'Atual',
      score: currentScore,
      date: 'Agora',
      changeType: 'current',
      fullDate: new Date().toISOString(),
    });

    return versionData;
  }, [versions, currentTitle, currentMeta, currentContent, currentKeywords, currentFeaturedImage]);

  if (chartData.length < 2) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        Faça alterações para ver a evolução do SEO Score
      </div>
    );
  }

  const minScore = Math.max(0, Math.min(...chartData.map(d => d.score)) - 10);
  const maxScore = Math.min(100, Math.max(...chartData.map(d => d.score)) + 10);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--muted))" 
            opacity={0.5} 
          />
          <XAxis 
            dataKey="name" 
            fontSize={11} 
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--muted))' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            domain={[minScore, maxScore]} 
            fontSize={11} 
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--muted))' }}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value} pontos`, 'SEO Score']}
            labelFormatter={(label) => {
              const point = chartData.find(d => d.name === label);
              return point?.date || label;
            }}
          />
          <ReferenceLine 
            y={80} 
            stroke="hsl(var(--primary))" 
            strokeDasharray="3 3" 
            opacity={0.5}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ 
              fill: 'hsl(var(--primary))', 
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{ 
              r: 6, 
              fill: 'hsl(var(--primary))',
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
