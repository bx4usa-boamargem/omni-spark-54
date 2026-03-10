import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Search,
  FileText,
  Hash,
  Type,
  AlignLeft,
  Image,
  Sparkles,
  Loader2,
  HelpCircle,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedKeyword {
  keyword: string;
  reason: string;
}

interface SEOScoreAnalyzerProps {
  title: string;
  content: string | null;
  metaDescription: string;
  keywords: string[];
  excerpt: string;
  featuredImage?: string | null;
  // Advanced SEO props (E-E-A-T)
  authorName?: string | null;
  publishedAt?: string | null;
  // SEO fix callbacks
  onFixTitle?: () => void;
  onFixMeta?: () => void;
  onFixContent?: () => void;
  onFixDensity?: () => void;
  onFixAll?: () => void;
  // Loading states
  isFixingTitle?: boolean;
  isFixingMeta?: boolean;
  isFixingContent?: boolean;
  isFixingDensity?: boolean;
  isFixingAll?: boolean;
  fixAllStep?: number;
  fixAllTotal?: number;
  // Keyword suggestions
  onSuggestKeywords?: () => void;
  suggestedKeywords?: SuggestedKeyword[];
  onAddSuggestedKeyword?: (keyword: string) => void;
  isLoadingSuggestions?: boolean;
}

interface SEOCheck {
  id: string;
  label: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  suggestion?: string;
  canAutoFix?: boolean;
  fixLabel?: string;
  icon: React.ReactNode;
  points: number;
  maxPoints: number;
}

export function SEOScoreAnalyzer({ 
  title, 
  content, 
  metaDescription, 
  keywords, 
  excerpt,
  featuredImage,
  authorName,
  publishedAt,
  onFixTitle,
  onFixMeta,
  onFixContent,
  onFixDensity,
  onFixAll,
  isFixingTitle = false,
  isFixingMeta = false,
  isFixingContent = false,
  isFixingDensity = false,
  isFixingAll = false,
  fixAllStep = 0,
  fixAllTotal = 0,
  onSuggestKeywords,
  suggestedKeywords = [],
  onAddSuggestedKeyword,
  isLoadingSuggestions = false,
}: SEOScoreAnalyzerProps) {
  
  const seoChecks = useMemo((): SEOCheck[] => {
    const checks: SEOCheck[] = [];
    const contentText = content || '';
    const wordCount = contentText.split(/\s+/).filter(w => w.length > 0).length;
    const mainKeyword = keywords[0] || '';
    
    // 1. Title Check (15 points max)
    const titleLength = title.length;
    const keywordInTitle = keywords.some(kw => 
      title.toLowerCase().includes(kw.toLowerCase())
    );
    
    if (titleLength >= 50 && titleLength <= 60 && keywordInTitle) {
      checks.push({
        id: 'title',
        label: 'Título',
        status: 'success',
        message: `Perfeito! ${titleLength} caracteres com palavra-chave`,
        icon: <Type className="h-4 w-4" />,
        points: 15,
        maxPoints: 15
      });
    } else if (titleLength >= 30 && titleLength <= 70) {
      checks.push({
        id: 'title',
        label: 'Título',
        status: 'warning',
        message: keywordInTitle 
          ? `${titleLength} caracteres (ideal: 50-60)` 
          : `Adicione a palavra-chave no título`,
        suggestion: !keywordInTitle && mainKeyword
          ? `Inclua "${mainKeyword}" no início do título para melhor SEO`
          : `Ajuste para 50-60 caracteres mantendo a palavra-chave`,
        canAutoFix: true,
        fixLabel: 'Otimizar título',
        icon: <Type className="h-4 w-4" />,
        points: keywordInTitle ? 10 : 8,
        maxPoints: 15
      });
    } else {
      checks.push({
        id: 'title',
        label: 'Título',
        status: 'error',
        message: titleLength < 30 ? 'Título muito curto' : 'Título muito longo (máx 70)',
        suggestion: titleLength < 30 
          ? `Expanda o título para 50-60 caracteres incluindo "${mainKeyword || 'palavra-chave'}"`
          : `Reduza para 50-60 caracteres mantendo "${mainKeyword || 'palavra-chave'}"`,
        canAutoFix: true,
        fixLabel: 'Corrigir título',
        icon: <Type className="h-4 w-4" />,
        points: 5,
        maxPoints: 15
      });
    }

    // 2. Meta Description Check (15 points max)
    const metaLength = metaDescription.length;
    const keywordInMeta = keywords.some(kw => 
      metaDescription.toLowerCase().includes(kw.toLowerCase())
    );
    
    if (metaLength >= 140 && metaLength <= 160 && keywordInMeta) {
      checks.push({
        id: 'meta',
        label: 'Meta Description',
        status: 'success',
        message: `Perfeito! ${metaLength}/160 com palavra-chave`,
        icon: <FileText className="h-4 w-4" />,
        points: 15,
        maxPoints: 15
      });
    } else if (metaLength >= 100 && metaLength <= 160) {
      checks.push({
        id: 'meta',
        label: 'Meta Description',
        status: 'warning',
        message: keywordInMeta 
          ? `${metaLength}/160 (ideal: 140-160)` 
          : `Adicione palavra-chave na descrição`,
        suggestion: !keywordInMeta && mainKeyword
          ? `Adicione "${mainKeyword}" na primeira frase da descrição`
          : `Complete com chamada para ação e benefício principal`,
        canAutoFix: true,
        fixLabel: 'Otimizar meta',
        icon: <FileText className="h-4 w-4" />,
        points: keywordInMeta ? 10 : 8,
        maxPoints: 15
      });
    } else {
      checks.push({
        id: 'meta',
        label: 'Meta Description',
        status: 'error',
        message: metaLength === 0 ? 'Adicione uma meta description' : 
          metaLength < 100 ? 'Meta description muito curta' : 'Muito longa (máx 160)',
        suggestion: metaLength === 0 
          ? `Crie uma descrição de 140-160 caracteres incluindo "${mainKeyword || 'palavra-chave'}"`
          : metaLength < 100 
            ? `Complete a descrição até 140-160 caracteres`
            : `Reduza para no máximo 160 caracteres`,
        canAutoFix: true,
        fixLabel: 'Criar meta',
        icon: <FileText className="h-4 w-4" />,
        points: metaLength > 0 ? 5 : 0,
        maxPoints: 15
      });
    }

    // 3. Keywords Check (15 points max)
    if (keywords.length >= 3 && keywords.length <= 5) {
      checks.push({
        id: 'keywords',
        label: 'Palavras-chave',
        status: 'success',
        message: `${keywords.length} palavras-chave definidas`,
        icon: <Hash className="h-4 w-4" />,
        points: 15,
        maxPoints: 15
      });
    } else if (keywords.length >= 1 && keywords.length < 3) {
      checks.push({
        id: 'keywords',
        label: 'Palavras-chave',
        status: 'warning',
        message: `Adicione mais ${3 - keywords.length} palavras-chave`,
        suggestion: 'Defina 3-5 palavras-chave relevantes para melhor SEO',
        icon: <Hash className="h-4 w-4" />,
        points: 8,
        maxPoints: 15
      });
    } else {
      checks.push({
        id: 'keywords',
        label: 'Palavras-chave',
        status: 'error',
        message: keywords.length === 0 ? 'Nenhuma palavra-chave' : 'Muitas palavras-chave',
        suggestion: keywords.length === 0 
          ? 'Adicione 3-5 palavras-chave para guiar a otimização'
          : 'Reduza para no máximo 5 palavras-chave principais',
        icon: <Hash className="h-4 w-4" />,
        points: 0,
        maxPoints: 15
      });
    }

    // 4. Content Length Check (20 points max)
    if (wordCount >= 1500 && wordCount <= 2500) {
      checks.push({
        id: 'content',
        label: 'Tamanho do conteúdo',
        status: 'success',
        message: `${wordCount} palavras (ideal para SEO)`,
        icon: <AlignLeft className="h-4 w-4" />,
        points: 20,
        maxPoints: 20
      });
    } else if (wordCount >= 800 && wordCount < 1500) {
      const wordsToIdeal = 1500 - wordCount;
      checks.push({
        id: 'content',
        label: 'Tamanho do conteúdo',
        status: 'warning',
        message: `${wordCount} palavras — faltam ${wordsToIdeal} para score máximo`,
        suggestion: `Clique em "Expandir conteúdo" para a IA adicionar ${wordsToIdeal} palavras com exemplos e casos de uso`,
        canAutoFix: true,
        fixLabel: 'Expandir conteúdo',
        icon: <AlignLeft className="h-4 w-4" />,
        points: 12,
        maxPoints: 20
      });
    } else if (wordCount > 2500) {
      checks.push({
        id: 'content',
        label: 'Tamanho do conteúdo',
        status: 'success',
        message: `${wordCount} palavras (excelente!)`,
        icon: <AlignLeft className="h-4 w-4" />,
        points: 18,
        maxPoints: 20
      });
    } else {
      const wordsToMinimum = 800 - wordCount;
      const wordsToIdeal = 1500 - wordCount;
      checks.push({
        id: 'content',
        label: 'Tamanho do conteúdo',
        status: 'error',
        message: `${wordCount} palavras — faltam ${wordsToMinimum} para mínimo (800) ou ${wordsToIdeal} para ideal (1500)`,
        suggestion: `Clique em "Expandir com IA" para adicionar ${wordsToIdeal} palavras automaticamente`,
        canAutoFix: wordCount > 200,
        fixLabel: 'Expandir com IA',
        icon: <AlignLeft className="h-4 w-4" />,
        points: Math.min(wordCount / 100, 5),
        maxPoints: 20
      });
    }

    // 5. Keyword Density Check (20 points max)
    const contentLower = contentText.toLowerCase();
    const keywordDensities = keywords.map(kw => {
      const regex = new RegExp(kw.toLowerCase(), 'gi');
      const matches = contentLower.match(regex);
      const count = matches ? matches.length : 0;
      const density = wordCount > 0 ? (count / wordCount) * 100 : 0;
      return { keyword: kw, count, density };
    });
    
    const avgDensity = keywordDensities.length > 0 
      ? keywordDensities.reduce((acc, kd) => acc + kd.density, 0) / keywordDensities.length 
      : 0;
    const mainKeywordFound = keywordDensities.some(kd => kd.count >= 3);

    if (avgDensity >= 0.5 && avgDensity <= 2.5 && mainKeywordFound) {
      checks.push({
        id: 'density',
        label: 'Densidade de palavras-chave',
        status: 'success',
        message: `Densidade: ${avgDensity.toFixed(1)}% (ideal)`,
        icon: <Search className="h-4 w-4" />,
        points: 20,
        maxPoints: 20
      });
    } else if (avgDensity > 0 && avgDensity < 0.5) {
      checks.push({
        id: 'density',
        label: 'Densidade de palavras-chave',
        status: 'warning',
        message: `Use mais as palavras-chave no texto`,
        suggestion: 'Distribua as keywords nos primeiros e últimos parágrafos naturalmente',
        canAutoFix: true,
        fixLabel: 'Otimizar densidade',
        icon: <Search className="h-4 w-4" />,
        points: 10,
        maxPoints: 20
      });
    } else if (avgDensity > 2.5) {
      checks.push({
        id: 'density',
        label: 'Densidade de palavras-chave',
        status: 'warning',
        message: `Densidade alta (${avgDensity.toFixed(1)}%) - pode parecer spam`,
        suggestion: 'Reduza repetições - use sinônimos e variações naturais',
        canAutoFix: true,
        fixLabel: 'Reduzir densidade',
        icon: <Search className="h-4 w-4" />,
        points: 8,
        maxPoints: 20
      });
    } else {
      checks.push({
        id: 'density',
        label: 'Densidade de palavras-chave',
        status: 'error',
        message: keywords.length > 0 ? 'Palavras-chave não encontradas no texto' : 'Defina palavras-chave',
        suggestion: keywords.length > 0 
          ? `Adicione "${keywords.join('", "')}" naturalmente no conteúdo (3-5x cada)`
          : 'Primeiro defina as palavras-chave para otimizar',
        canAutoFix: keywords.length > 0,
        fixLabel: 'Otimizar com IA',
        icon: <Search className="h-4 w-4" />,
        points: 0,
        maxPoints: 20
      });
    }

    // 6. Featured Image Check (15 points max)
    if (featuredImage) {
      checks.push({
        id: 'image',
        label: 'Imagem destacada',
        status: 'success',
        message: 'Imagem definida',
        icon: <Image className="h-4 w-4" />,
        points: 15,
        maxPoints: 15
      });
    } else {
      checks.push({
        id: 'image',
        label: 'Imagem destacada',
        status: 'warning',
        message: 'Adicione uma imagem destacada',
        suggestion: 'Imagens melhoram o engajamento e compartilhamento',
        icon: <Image className="h-4 w-4" />,
        points: 0,
        maxPoints: 15
      });
    }

    // ── 7. Schema.org / JSON-LD ─────────────────────────────────────────
    const hasSchemaLD = contentText.includes('"@type"') || contentText.includes('application/ld+json');
    checks.push({
      id: 'schema',
      label: 'Schema.org (JSON-LD)',
      status: hasSchemaLD ? 'success' : 'warning',
      message: hasSchemaLD
        ? 'Structured data detectado no conteúdo'
        : 'JSON-LD não encontrado',
      suggestion: !hasSchemaLD
        ? 'Adicione markup Article ou FAQPage para rich results e IA'
        : undefined,
      icon: <Search className="h-4 w-4" />,
      points: hasSchemaLD ? 10 : 3,
      maxPoints: 10,
    });

    // ── 8. E-E-A-T (Autor, Data, Fontes) ───────────────────────────────
    const hasAuthor = !!authorName && authorName.trim().length > 2;
    const hasDate   = !!publishedAt;
    const hasSources = /https?:\/\//.test(contentText) ||
      /fonte:|source:|according to|segundo|de acordo com/i.test(contentText);
    const eeaScore = (hasAuthor ? 1 : 0) + (hasDate ? 1 : 0) + (hasSources ? 1 : 0);
    checks.push({
      id: 'eeat',
      label: 'E-E-A-T (Autor, Data, Fontes)',
      status: eeaScore === 3 ? 'success' : eeaScore >= 2 ? 'warning' : 'error',
      message: eeaScore === 3
        ? 'Autor, data e fontes presentes'
        : `Faltam: ${[!hasAuthor && 'autor', !hasDate && 'data', !hasSources && 'fontes'].filter(Boolean).join(', ')}`,
      suggestion: eeaScore < 3
        ? 'Adicione nome do autor, data de publicação e links para fontes'
        : undefined,
      icon: <Sparkles className="h-4 w-4" />,
      points: eeaScore === 3 ? 10 : eeaScore * 3,
      maxPoints: 10,
    });

    // ── 9. Heading Hierarchy (H1/H2/H3) ────────────────────────────────
    const h1Count = (contentText.match(/<h1[\s>]/gi) || []).length + (contentText.match(/^# /gm) || []).length;
    const h2Count = (contentText.match(/<h2[\s>]/gi) || []).length + (contentText.match(/^## /gm) || []).length;
    const h3Count = (contentText.match(/<h3[\s>]/gi) || []).length + (contentText.match(/^### /gm) || []).length;
    const headingStatus = h1Count === 1 && h2Count >= 2 ? 'success' : h1Count <= 1 && h2Count >= 1 ? 'warning' : 'error';
    checks.push({
      id: 'headings',
      label: 'Hierarquia de Títulos',
      status: headingStatus,
      message: `H1: ${h1Count} · H2: ${h2Count} · H3: ${h3Count}`,
      suggestion: headingStatus !== 'success'
        ? 'Use exatamente 1 H1, mínimo 2 H2 e H3 para subtópicos'
        : undefined,
      icon: <Hash className="h-4 w-4" />,
      points: headingStatus === 'success' ? 10 : headingStatus === 'warning' ? 5 : 0,
      maxPoints: 10,
    });

    // ── 10. Internal Links ────────────────────────────────────────────
    const internalLinks = (contentText.match(/href=["'][/][^"']+["']/gi) || []).length +
      (contentText.match(/\[.+?\]\(\/[^)]+\)/g) || []).length;
    checks.push({
      id: 'internal_links',
      label: 'Links Internos',
      status: internalLinks >= 2 ? 'success' : internalLinks === 1 ? 'warning' : 'error',
      message: `${internalLinks} link(s) interno(s)`,
      suggestion: internalLinks < 2
        ? 'Adicione pelo menos 2 links internos para outros artigos'
        : undefined,
      icon: <Hash className="h-4 w-4" />,
      points: internalLinks >= 2 ? 10 : internalLinks * 3,
      maxPoints: 10,
    });

    // ── 11. Reading Time ──────────────────────────────────────────────
    const readingMinutes = Math.round(wordCount / 200);
    const readingStatus = readingMinutes >= 5 && readingMinutes <= 15 ? 'success' : readingMinutes >= 3 ? 'warning' : 'error';
    checks.push({
      id: 'reading_time',
      label: 'Tempo de Leitura',
      status: readingStatus,
      message: `~${readingMinutes} min · ${wordCount} palavras`,
      suggestion: readingStatus !== 'success'
        ? readingMinutes < 5 ? 'Expanda o conteúdo para 5-15 min de leitura' : 'Artigo muito longo — considere dividir em partes'
        : undefined,
      icon: <AlignLeft className="h-4 w-4" />,
      points: readingStatus === 'success' ? 5 : readingStatus === 'warning' ? 3 : 0,
      maxPoints: 5,
    });

    // ── 12. AI-Friendly Format ────────────────────────────────────────
    const hasQA     = /\?(\r?\n|\s*<br)/i.test(contentText) || /\?\s*\n/i.test(contentText);
    const hasBullets = /<ul>|<li>/.test(contentText) || /^\s*[-*•]/m.test(contentText);
    const hasDirectAnswer = /^(é |são |o (que|como)|como |quando |por que |qual )/im.test(contentText.substring(0, 500));
    const aiScore = (hasQA ? 1 : 0) + (hasBullets ? 1 : 0) + (hasDirectAnswer ? 1 : 0);
    checks.push({
      id: 'ai_friendly',
      label: 'AI-Friendly (GPT/Gemini/Perplexity)',
      status: aiScore >= 2 ? 'success' : aiScore === 1 ? 'warning' : 'error',
      message: aiScore >= 2
        ? 'Conteúdo estruturado para extrações por IA'
        : 'Pouco amigável para buscas por IA',
      suggestion: aiScore < 2
        ? 'Inclua: resposta direta no 1º parágrafo, listas de tópicos, seção FAQ'
        : undefined,
      icon: <Sparkles className="h-4 w-4" />,
      points: aiScore >= 2 ? 10 : aiScore * 3,
      maxPoints: 10,
    });

    return checks;
  }, [title, content, metaDescription, keywords, excerpt, featuredImage, authorName, publishedAt]);

  const totalScore = useMemo(() => {
    const earned = seoChecks.reduce((acc, check) => acc + check.points, 0);
    const max = seoChecks.reduce((acc, check) => acc + check.maxPoints, 0);
    return Math.round((earned / max) * 100);
  }, [seoChecks]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excelente';
    if (score >= 80) return 'Muito bom';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Precisa melhorar';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const StatusIcon = ({ status }: { status: 'success' | 'warning' | 'error' }) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const handleFixClick = (checkId: string) => {
    switch (checkId) {
      case 'title':
        onFixTitle?.();
        break;
      case 'meta':
        onFixMeta?.();
        break;
      case 'content':
        onFixContent?.();
        break;
      case 'density':
        onFixDensity?.();
        break;
    }
  };

  const getIsFixing = (checkId: string) => {
    switch (checkId) {
      case 'title': return isFixingTitle;
      case 'meta': return isFixingMeta;
      case 'content': return isFixingContent;
      case 'density': return isFixingDensity;
      default: return false;
    }
  };

  const hasFixableIssues = seoChecks.some(c => c.canAutoFix && c.status !== 'success');

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            SEO Score
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-4">
                  <div className="space-y-3">
                    <p className="font-semibold text-sm">Faixas de SEO Score:</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-green-500 font-medium">90-100</span>
                        <span>Excelente</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-400 font-medium">80-89</span>
                        <span>Muito bom</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-500 font-medium">60-79</span>
                        <span>Bom</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-orange-500 font-medium">40-59</span>
                        <span>Regular</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-500 font-medium">0-39</span>
                        <span>Precisa melhorar</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                      <p className="font-medium">Dicas para Excelente:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Título: 50-60 chars + keyword</li>
                        <li>Meta: 140-160 chars + keyword</li>
                        <li>3-5 palavras-chave definidas</li>
                        <li>1500-2500 palavras no conteúdo</li>
                        <li>Imagem destacada definida</li>
                      </ul>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-3xl font-bold", getScoreColor(totalScore))}>
              {totalScore}
            </span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                totalScore >= 80 ? "border-green-500 text-green-500" :
                totalScore >= 60 ? "border-yellow-500 text-yellow-500" :
                "border-red-500 text-red-500"
              )}
            >
              {getScoreLabel(totalScore)}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fix All Button */}
        {hasFixableIssues && onFixAll && (
          <Button
            className="w-full gradient-primary"
            onClick={onFixAll}
            disabled={isFixingAll || isFixingTitle || isFixingMeta || isFixingContent || isFixingDensity}
          >
            {isFixingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Otimizando ({fixAllStep}/{fixAllTotal})...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Corrigir Todos os Problemas
              </>
            )}
          </Button>
        )}

        {/* Progress Bar */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <div 
            className={cn("h-full transition-all duration-500", getProgressColor(totalScore))}
            style={{ width: `${totalScore}%` }}
          />
        </div>

        {/* Checks List */}
        <div className="space-y-3">
          {seoChecks.map((check) => {
            const isFixing = getIsFixing(check.id);
            
            return (
              <div 
                key={check.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  check.status === 'success' && "bg-green-500/5 border-green-500/20",
                  check.status === 'warning' && "bg-yellow-500/5 border-yellow-500/20",
                  check.status === 'error' && "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-muted-foreground">
                    {check.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{check.label}</span>
                      <StatusIcon status={check.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {check.message}
                    </p>
                    
                    {/* Suggestion */}
                    {check.suggestion && check.status !== 'success' && (
                      <p className="text-xs text-primary/80 mt-1.5 flex items-start gap-1">
                        <span className="shrink-0">💡</span>
                        <span>{check.suggestion}</span>
                      </p>
                    )}
                    
                    {/* Fix Button */}
                    {check.canAutoFix && check.status !== 'success' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-xs"
                        onClick={() => handleFixClick(check.id)}
                        disabled={isFixing}
                      >
                        {isFixing ? (
                          <>
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            Otimizando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-1.5 h-3 w-3" />
                            {check.fixLabel || 'Corrigir com IA'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {Math.round(check.points)}/{check.maxPoints}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Keyword Suggestions Section */}
        {onSuggestKeywords && (
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Sugestões de palavras-chave:
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={onSuggestKeywords}
                disabled={isLoadingSuggestions || keywords.length >= 5}
              >
                {isLoadingSuggestions ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3 w-3" />
                    Sugerir com IA
                  </>
                )}
              </Button>
            </div>
            
            {suggestedKeywords.length > 0 && (
              <div className="space-y-2">
                {suggestedKeywords.map((sk, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => onAddSuggestedKeyword?.(sk.keyword)}
                      disabled={keywords.includes(sk.keyword) || keywords.length >= 5}
                    >
                      {keywords.includes(sk.keyword) ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{sk.keyword}</p>
                      <p className="text-xs text-muted-foreground">{sk.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Keyword Details */}
        {keywords.length > 0 && content && (
          <div className="pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Uso das palavras-chave no conteúdo:
            </p>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => {
                const regex = new RegExp(kw, 'gi');
                const matches = (content || '').match(regex);
                const count = matches ? matches.length : 0;
                return (
                  <Badge 
                    key={kw}
                    variant="outline"
                    className={cn(
                      "text-xs px-3 py-1",
                      count >= 3 && "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400",
                      count > 0 && count < 3 && "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
                      count === 0 && "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400"
                    )}
                  >
                    <span className="font-medium">{kw}</span>
                    <span className="ml-1.5 opacity-70">{count}x</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
