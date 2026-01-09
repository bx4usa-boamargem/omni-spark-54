import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Target, Lightbulb, Heart, Plus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface KeywordSuggestion {
  keyword: string;
  type: "principal" | "long-tail" | "dor";
  reason: string;
  selected?: boolean;
}

interface AISuggestKeywordsModalProps {
  blogId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddKeywords: (keywords: string[]) => void;
}

const typeConfig = {
  principal: { 
    label: "Principal", 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: Target 
  },
  "long-tail": { 
    label: "Long-tail", 
    color: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: Lightbulb 
  },
  dor: { 
    label: "Dor/Desejo", 
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    icon: Heart 
  },
};

export function AISuggestKeywordsModal({ blogId, open, onOpenChange, onAddKeywords }: AISuggestKeywordsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("suggest-niche-keywords", {
        body: { blogId },
      });

      if (error) throw error;

      if (data.needsSetup) {
        toast.error(data.error);
        onOpenChange(false);
        return;
      }

      if (data.keywords) {
        setSuggestions(data.keywords.map((k: KeywordSuggestion) => ({ ...k, selected: true })));
        setHasLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching keyword suggestions:", error);
      toast.error("Erro ao gerar sugestões de palavras-chave");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (keyword: string) => {
    setSuggestions(prev =>
      prev.map(s => s.keyword === keyword ? { ...s, selected: !s.selected } : s)
    );
  };

  const selectAll = (selected: boolean) => {
    setSuggestions(prev => prev.map(s => ({ ...s, selected })));
  };

  const handleAddSelected = () => {
    const selectedKeywords = suggestions.filter(s => s.selected).map(s => s.keyword);
    if (selectedKeywords.length === 0) {
      toast.error("Selecione pelo menos uma palavra-chave");
      return;
    }
    onAddKeywords(selectedKeywords);
    toast.success(`${selectedKeywords.length} palavras-chave adicionadas!`);
    onOpenChange(false);
  };

  // Fetch suggestions when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !hasLoaded && !isLoading) {
      fetchSuggestions();
    }
    onOpenChange(newOpen);
  };

  const selectedCount = suggestions.filter(s => s.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestões de Palavras-chave por IA
          </DialogTitle>
          <DialogDescription>
            Palavras-chave geradas com base no seu nicho, público-alvo e estratégia de conteúdo
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analisando seu nicho e gerando sugestões...</p>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-4">
            {/* Selection controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedCount} de {suggestions.length} selecionadas
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAll(true)}>
                  Selecionar todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAll(false)}>
                  Desmarcar todas
                </Button>
              </div>
            </div>

            {/* Type legend */}
            <div className="flex gap-4 flex-wrap">
              {Object.entries(typeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <div key={type} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    <span>{config.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Suggestions list */}
            <ScrollArea className="h-[350px] border rounded-lg">
              <div className="p-4 space-y-2">
                {suggestions.map((suggestion) => {
                  const config = typeConfig[suggestion.type] || typeConfig.principal;
                  const Icon = config.icon;
                  return (
                    <div
                      key={suggestion.keyword}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        suggestion.selected ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleSelection(suggestion.keyword)}
                    >
                      <Checkbox
                        checked={suggestion.selected}
                        onCheckedChange={() => toggleSelection(suggestion.keyword)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{suggestion.keyword}</span>
                          <Badge variant="outline" className={config.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.reason}
                        </p>
                      </div>
                      {suggestion.selected && (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => fetchSuggestions()} disabled={isLoading}>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Novas
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddSelected} disabled={selectedCount === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar {selectedCount} Selecionadas
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">Clique para gerar sugestões baseadas no seu nicho</p>
            <Button onClick={fetchSuggestions} className="mt-4">
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Sugestões
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
