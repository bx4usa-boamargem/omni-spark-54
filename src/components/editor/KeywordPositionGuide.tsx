import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, CheckCircle2, AlertTriangle, FileText, Heading2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeywordPositionGuideProps {
  content: string;
  keywords: string[];
}

interface PositionCheck {
  keyword: string;
  inFirstParagraph: boolean;
  inH2Titles: boolean;
  inConclusion: boolean;
}

function analyzeKeywordPositions(content: string, keywords: string[]): PositionCheck[] {
  if (!content || !keywords || keywords.length === 0) return [];
  
  const contentLower = content.toLowerCase();
  
  // Extract first paragraph (first 300 characters or until first \n\n)
  const firstParagraphEnd = Math.min(
    contentLower.indexOf('\n\n') > 0 ? contentLower.indexOf('\n\n') : 300,
    300
  );
  const firstParagraph = contentLower.substring(0, firstParagraphEnd);
  
  // Extract H2 titles (lines starting with ##)
  const h2Pattern = /^##\s+(.+)$/gm;
  const h2Matches = content.match(h2Pattern) || [];
  const h2Content = h2Matches.join(' ').toLowerCase();
  
  // Extract conclusion (last 500 characters)
  const conclusion = contentLower.substring(Math.max(0, contentLower.length - 500));
  
  return keywords.map(keyword => {
    const keywordLower = keyword.toLowerCase();
    const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKeyword, 'i');
    
    return {
      keyword,
      inFirstParagraph: regex.test(firstParagraph),
      inH2Titles: regex.test(h2Content),
      inConclusion: regex.test(conclusion),
    };
  });
}

export function KeywordPositionGuide({ content, keywords }: KeywordPositionGuideProps) {
  const positions = useMemo(() => {
    return analyzeKeywordPositions(content, keywords);
  }, [content, keywords]);
  
  if (!keywords || keywords.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-sm">Adicione keywords para ver sugestões de posição</span>
        </div>
      </div>
    );
  }
  
  const renderStatus = (isPresent: boolean) => {
    if (isPresent) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };
  
  // Count total issues (missing positions)
  const totalMissing = positions.reduce((acc, p) => {
    return acc + (p.inFirstParagraph ? 0 : 1) + (p.inH2Titles ? 0 : 1) + (p.inConclusion ? 0 : 1);
  }, 0);
  
  return (
    <div className="p-4 border rounded-lg bg-background/50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Posições Estratégicas</span>
        </div>
        {totalMissing > 0 && (
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
            {totalMissing} sugestões
          </Badge>
        )}
      </div>
      
      {/* Position Columns */}
      <div className="grid grid-cols-3 gap-3">
        {/* First Paragraph */}
        <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>1º Parágrafo</span>
          </div>
          <div className="space-y-1.5">
            {positions.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {renderStatus(p.inFirstParagraph)}
                <span className={cn(
                  "text-xs truncate",
                  p.inFirstParagraph ? "text-green-700" : "text-yellow-700"
                )}>
                  {p.keyword}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* H2 Titles */}
        <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Heading2 className="h-3.5 w-3.5" />
            <span>Títulos H2</span>
          </div>
          <div className="space-y-1.5">
            {positions.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {renderStatus(p.inH2Titles)}
                <span className={cn(
                  "text-xs truncate",
                  p.inH2Titles ? "text-green-700" : "text-yellow-700"
                )}>
                  {p.keyword}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Conclusion */}
        <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            <span>Conclusão</span>
          </div>
          <div className="space-y-1.5">
            {positions.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                {renderStatus(p.inConclusion)}
                <span className={cn(
                  "text-xs truncate",
                  p.inConclusion ? "text-green-700" : "text-yellow-700"
                )}>
                  {p.keyword}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        💡 Keywords em amarelo devem ser adicionadas nas posições indicadas
      </p>
    </div>
  );
}
