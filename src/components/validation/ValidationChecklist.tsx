import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Check,
  X
} from "lucide-react";
import { ValidationIssue } from "@/utils/articleValidator";
import { EbookValidationIssue } from "@/utils/ebookValidator";

interface ValidationChecklistProps {
  issues: (ValidationIssue | EbookValidationIssue)[];
  suggestions?: string[];
  onAutoFix?: (code: string) => void;
  onAutoFixAll?: () => void;
  isFixing?: boolean;
  type?: 'article' | 'ebook';
}

// Criterion definitions for display
const CRITERIA_LABELS: Record<string, { label: string; maxPoints: number }> = {
  H2_COUNT_LOW: { label: 'Mínimo 7 seções H2', maxPoints: 15 },
  H2_COUNT_HIGH: { label: 'Máximo 12 seções H2', maxPoints: 5 },
  MISSING_SUMMARY: { label: 'Seção "Resumo" com checklist', maxPoints: 10 },
  MISSING_CTA: { label: 'Seção "Direto ao ponto" com CTA', maxPoints: 10 },
  LONG_PARAGRAPHS: { label: 'Parágrafos curtos (< 150 palavras)', maxPoints: 15 },
  LOW_VISUAL_BLOCKS: { label: 'Mínimo 2 blocos visuais (💡⚠️📌)', maxPoints: 10 },
  NO_BLOCKQUOTE: { label: 'Mínimo 1 blockquote', maxPoints: 5 },
  LOW_BULLETS: { label: 'Mínimo 3 listas em bullet', maxPoints: 5 },
  LOW_WORD_COUNT: { label: 'Mínimo 1000 palavras', maxPoints: 10 },
  NO_KEYWORD_IN_TITLE: { label: 'Palavra-chave no título', maxPoints: 5 },
  INVALID_META_DESCRIPTION: { label: 'Meta description 140-160 chars', maxPoints: 5 },
  NO_FEATURED_IMAGE: { label: 'Imagem destacada', maxPoints: 5 },
  // Ebook specific
  CHAPTER_COUNT_LOW: { label: 'Mínimo 5 capítulos', maxPoints: 15 },
  CHAPTER_COUNT_HIGH: { label: 'Máximo 10 capítulos', maxPoints: 5 },
  NO_COVER_IMAGE: { label: 'Imagem de capa', maxPoints: 10 },
  NO_TABLE_OF_CONTENTS: { label: 'Sumário com links', maxPoints: 10 },
  LOW_INTERNAL_IMAGES: { label: '3-6 imagens internas', maxPoints: 10 },
  HIGH_INTERNAL_IMAGES: { label: 'Máximo 6 imagens internas', maxPoints: 0 },
  NO_TIPS_SECTION: { label: 'Seção de "Dicas" ou "Bônus"', maxPoints: 5 },
  NO_CTA_PAGE: { label: 'Página de CTA configurada', maxPoints: 10 },
  LOW_BULLET_LISTS: { label: 'Mínimo 3 listas em bullet', maxPoints: 5 },
};

export function ValidationChecklist({
  issues,
  suggestions = [],
  onAutoFix,
  onAutoFixAll,
  isFixing = false,
  type = 'article',
}: ValidationChecklistProps) {
  const [isOpen, setIsOpen] = useState(true);

  const criticalIssues = issues.filter(i => i.type === 'critical');
  const warningIssues = issues.filter(i => i.type === 'warning');
  const suggestionIssues = issues.filter(i => i.type === 'suggestion');

  const fixableIssues = issues.filter(i => i.canAutoFix);
  const totalPoints = issues.reduce((acc, i) => acc + i.weight, 0);

  const getIcon = (issueType: 'critical' | 'warning' | 'suggestion') => {
    switch (issueType) {
      case 'critical':
        return <X className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const renderIssue = (issue: ValidationIssue | EbookValidationIssue) => {
    const criteria = CRITERIA_LABELS[issue.code] || { label: issue.field, maxPoints: issue.weight };
    
    return (
      <div key={issue.code} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-2 flex-1">
          {getIcon(issue.type)}
          <div className="flex-1">
            <p className="text-sm font-medium">{criteria.label}</p>
            <p className="text-xs text-muted-foreground">{issue.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            0/{criteria.maxPoints} pts
          </span>
          {issue.canAutoFix && onAutoFix && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAutoFix(issue.code)}
              disabled={isFixing}
              className="h-7 text-xs gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Corrigir
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Calculate passed criteria
  const allCriteria = Object.keys(CRITERIA_LABELS).filter(k => 
    type === 'article' 
      ? !['CHAPTER_COUNT_LOW', 'CHAPTER_COUNT_HIGH', 'NO_COVER_IMAGE', 'NO_TABLE_OF_CONTENTS', 'LOW_INTERNAL_IMAGES', 'HIGH_INTERNAL_IMAGES', 'NO_TIPS_SECTION', 'NO_CTA_PAGE', 'LOW_BULLET_LISTS'].includes(k)
      : ['CHAPTER_COUNT_LOW', 'CHAPTER_COUNT_HIGH', 'LOW_WORD_COUNT', 'NO_COVER_IMAGE', 'NO_TABLE_OF_CONTENTS', 'LOW_INTERNAL_IMAGES', 'HIGH_INTERNAL_IMAGES', 'NO_TIPS_SECTION', 'NO_CTA_PAGE', 'LONG_PARAGRAPHS', 'LOW_BULLET_LISTS'].includes(k)
  );

  const failedCodes = issues.map(i => i.code);
  const passedCriteria = allCriteria.filter(c => !failedCodes.includes(c));

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                📋 Checklist de Validação
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardTitle>
              <div className="flex items-center gap-2">
                {criticalIssues.length > 0 && (
                  <Badge variant="destructive">{criticalIssues.length}</Badge>
                )}
                {warningIssues.length > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {warningIssues.length}
                  </Badge>
                )}
                {passedCriteria.length > 0 && (
                  <Badge className="bg-green-100 text-green-800">
                    {passedCriteria.length} ✓
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Critical Issues */}
            {criticalIssues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Críticos ({criticalIssues.length})
                </h4>
                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3">
                  {criticalIssues.map(renderIssue)}
                </div>
              </div>
            )}

            {/* Warning Issues */}
            {warningIssues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-yellow-600 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Avisos ({warningIssues.length})
                </h4>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-3">
                  {warningIssues.map(renderIssue)}
                </div>
              </div>
            )}

            {/* Suggestion Issues */}
            {suggestionIssues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4" />
                  Sugestões ({suggestionIssues.length})
                </h4>
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3">
                  {suggestionIssues.map(renderIssue)}
                </div>
              </div>
            )}

            {/* Passed Criteria */}
            {passedCriteria.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Aprovados ({passedCriteria.length})
                </h4>
                <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3">
                  {passedCriteria.map(code => {
                    const criteria = CRITERIA_LABELS[code];
                    if (!criteria) return null;
                    return (
                      <div key={code} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{criteria.label}</span>
                        </div>
                        <span className="text-xs text-green-600 font-medium">
                          {criteria.maxPoints}/{criteria.maxPoints} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional Suggestions */}
            {suggestions.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium">💡 Sugestões adicionais:</p>
                <ul className="list-disc list-inside space-y-1">
                  {suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary and Auto-fix All */}
            <div className="pt-3 border-t flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Pontos perdidos: <span className="text-red-600">-{totalPoints}</span>
                </p>
              </div>
              {fixableIssues.length > 0 && onAutoFixAll && (
                <Button
                  onClick={onAutoFixAll}
                  disabled={isFixing}
                  size="sm"
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isFixing ? 'Corrigindo...' : `Corrigir ${fixableIssues.length} Problemas`}
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
