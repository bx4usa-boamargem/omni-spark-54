import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  History, 
  Eye, 
  Undo2, 
  CheckCircle2, 
  Clock,
  FileText,
  Hash,
  Loader2,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SEOEvolutionChart } from "./SEOEvolutionChart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface ArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  title: string;
  content: string | null;
  excerpt: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  faq: any;
  change_type: string;
  change_description: string | null;
  created_at: string;
}

interface ArticleVersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ArticleVersion[];
  currentVersion?: number;
  onRestore: (version: ArticleVersion) => void;
  isRestoring?: boolean;
  // Current article state for chart
  currentTitle?: string;
  currentMeta?: string;
  currentContent?: string | null;
  currentKeywords?: string[];
  currentFeaturedImage?: string | null;
}

const CHANGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  seo_title: { label: 'SEO: Título', color: 'bg-blue-500/20 text-blue-700 border-blue-500/30' },
  seo_meta: { label: 'SEO: Meta Description', color: 'bg-purple-500/20 text-purple-700 border-purple-500/30' },
  seo_content: { label: 'SEO: Conteúdo', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
  seo_density: { label: 'SEO: Densidade', color: 'bg-orange-500/20 text-orange-700 border-orange-500/30' },
  manual: { label: 'Edição Manual', color: 'bg-gray-500/20 text-gray-700 border-gray-500/30' },
  regeneration: { label: 'Regeneração', color: 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30' },
  rollback: { label: 'Restauração', color: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
  creation: { label: 'Criação', color: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30' },
};

export function ArticleVersionHistory({
  isOpen,
  onClose,
  versions,
  currentVersion,
  onRestore,
  isRestoring = false,
  currentTitle = '',
  currentMeta = '',
  currentContent = null,
  currentKeywords = [],
  currentFeaturedImage = null,
}: ArticleVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<ArticleVersion | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showChart, setShowChart] = useState(true);

  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleViewVersion = (version: ArticleVersion) => {
    setSelectedVersion(version);
    setShowPreview(true);
  };

  const handleRestore = (version: ArticleVersion) => {
    onRestore(version);
    setShowPreview(false);
  };

  const getChangeTypeInfo = (type: string) => {
    return CHANGE_TYPE_LABELS[type] || { label: type, color: 'bg-gray-500/20 text-gray-700' };
  };

  const wordCount = (text: string | null) => {
    if (!text) return 0;
    return text.split(/\s+/).filter(w => w.length > 0).length;
  };

  return (
    <>
      <Dialog open={isOpen && !showPreview} onOpenChange={() => !isRestoring && onClose()}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Versões
            </DialogTitle>
          </DialogHeader>

          {/* SEO Evolution Chart */}
          {versions.length > 0 && (
            <Collapsible open={showChart} onOpenChange={setShowChart}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between mb-2">
                  <span className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Evolução do SEO Score
                  </span>
                  {showChart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border rounded-lg p-3 mb-4 bg-muted/30">
                  <SEOEvolutionChart
                    versions={versions}
                    currentTitle={currentTitle}
                    currentMeta={currentMeta}
                    currentContent={currentContent}
                    currentKeywords={currentKeywords}
                    currentFeaturedImage={currentFeaturedImage}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-2">
              {sortedVersions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma versão salva ainda
                </p>
              ) : (
                sortedVersions.map((version, index) => {
                  const isCurrentVersion = index === 0;
                  const changeInfo = getChangeTypeInfo(version.change_type);

                  return (
                    <div
                      key={version.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        isCurrentVersion && "border-primary/50 bg-primary/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isCurrentVersion ? (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="font-medium text-sm">
                              {isCurrentVersion ? 'Versão Atual' : `Versão ${version.version_number}`}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", changeInfo.color)}
                            >
                              {changeInfo.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(version.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>

                          {version.change_description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {version.change_description}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewVersion(version)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isCurrentVersion && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(version)}
                              disabled={isRestoring}
                            >
                              {isRestoring ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Undo2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Version Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={() => setShowPreview(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Versão {selectedVersion?.version_number} - {format(
                new Date(selectedVersion?.created_at || new Date()), 
                "dd/MM/yyyy HH:mm", 
                { locale: ptBR }
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedVersion && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", getChangeTypeInfo(selectedVersion.change_type).color)}
                  >
                    {getChangeTypeInfo(selectedVersion.change_type).label}
                  </Badge>
                  {selectedVersion.change_description && (
                    <span className="text-sm text-muted-foreground">
                      {selectedVersion.change_description}
                    </span>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Título</p>
                    <p className="text-sm font-medium">{selectedVersion.title}</p>
                  </div>

                  {selectedVersion.meta_description && (
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Meta Description</p>
                      <p className="text-sm">{selectedVersion.meta_description}</p>
                    </div>
                  )}

                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {wordCount(selectedVersion.content)} palavras
                    </span>
                    {selectedVersion.keywords && selectedVersion.keywords.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-4 w-4" />
                        {selectedVersion.keywords.length} keywords
                      </span>
                    )}
                  </div>

                  {selectedVersion.keywords && selectedVersion.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedVersion.keywords.map(kw => (
                        <Badge key={kw} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Fechar
                  </Button>
                  {sortedVersions.indexOf(selectedVersion) !== 0 && (
                    <Button 
                      onClick={() => handleRestore(selectedVersion)}
                      disabled={isRestoring}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {isRestoring ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Undo2 className="mr-2 h-4 w-4" />
                      )}
                      Restaurar esta versão
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
