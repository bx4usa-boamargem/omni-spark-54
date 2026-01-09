import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2, ArrowRight, Plus } from "lucide-react";

interface FunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blogId: string;
  onContinue: (data: FunnelData) => void;
}

interface FunnelData {
  personaId: string;
  topOfFunnel: number;
  middleOfFunnel: number;
  bottomOfFunnel: number;
}

interface Persona {
  id: string;
  name: string;
  problems: string[];
  solutions: string[];
  objections: string[];
}

export function FunnelModal({ open, onOpenChange, blogId, onContinue }: FunnelModalProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>("");
  const [topCount, setTopCount] = useState(1);
  const [middleCount, setMiddleCount] = useState(1);
  const [bottomCount, setBottomCount] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (open && blogId) {
      fetchPersonas();
    }
  }, [open, blogId]);

  async function fetchPersonas() {
    setLoading(true);
    const { data, error } = await supabase
      .from("personas")
      .select("id, name, problems, solutions, objections")
      .eq("blog_id", blogId);

    if (data) {
      setPersonas(data);
      if (data.length > 0) {
        setSelectedPersona(data[0].id);
      }
    }
    setLoading(false);
  }

  const selectedPersonaData = personas.find(p => p.id === selectedPersona);
  
  const hasProblems = selectedPersonaData?.problems && selectedPersonaData.problems.length > 0;
  const hasSolutions = selectedPersonaData?.solutions && selectedPersonaData.solutions.length > 0;
  const hasObjections = selectedPersonaData?.objections && selectedPersonaData.objections.length > 0;
  
  const canContinue = selectedPersona && (hasProblems || hasSolutions || hasObjections);
  const totalArticles = (hasProblems ? topCount : 0) + (hasSolutions ? middleCount : 0) + (hasObjections ? bottomCount : 0);

  const handleContinue = async () => {
    if (!canContinue || totalArticles === 0) return;
    
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-funnel-articles', {
        body: {
          blogId,
          personaId: selectedPersona,
          topOfFunnel: hasProblems ? topCount : 0,
          middleOfFunnel: hasSolutions ? middleCount : 0,
          bottomOfFunnel: hasObjections ? bottomCount : 0,
        }
      });

      if (error) throw error;

      toast({
        title: "Artigos na fila!",
        description: `${data.count} artigos foram adicionados à fila de automação.`,
      });

      onContinue({
        personaId: selectedPersona,
        topOfFunnel: topCount,
        middleOfFunnel: middleCount,
        bottomOfFunnel: bottomCount,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error generating funnel articles:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar artigos",
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Criar Artigos por Funil de Vendas
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : personas.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você ainda não tem personas cadastradas. Acesse a área de Estratégia para criar suas personas.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6 py-4">
            {/* Persona Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Persona</Label>
                <Link 
                  to="/strategy?tab=audience" 
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                  onClick={() => onOpenChange(false)}
                >
                  <Plus className="h-3 w-3" />
                  Criar nova persona
                </Link>
              </div>
              <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma persona" />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Funnel Stages */}
            <div className="grid gap-4">
              {/* Top of Funnel */}
              <Card className={!hasProblems ? "opacity-50" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Topo de Funil</span>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
                          Educar e criar consciência
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Aborda os problemas e desafios que a persona enfrenta, educando sobre as causas e consequências.
                      </p>
                      {!hasProblems && (
                        <p className="text-xs text-destructive">
                          Você precisa preencher os problemas desta persona na página de 'Estratégia' para criar conteúdo topo de funil.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs text-muted-foreground">Qtd.</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={topCount}
                        onChange={(e) => setTopCount(parseInt(e.target.value) || 0)}
                        className="w-16 h-8"
                        disabled={!hasProblems}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Middle of Funnel */}
              <Card className={!hasSolutions ? "opacity-50" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Meio de Funil</span>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">
                          Comparar soluções
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Apresenta e compara soluções disponíveis, mostrando como resolver os problemas identificados.
                      </p>
                      {!hasSolutions && (
                        <p className="text-xs text-destructive">
                          Você precisa preencher as soluções desta persona na página de 'Estratégia' para criar conteúdo meio de funil.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs text-muted-foreground">Qtd.</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={middleCount}
                        onChange={(e) => setMiddleCount(parseInt(e.target.value) || 0)}
                        className="w-16 h-8"
                        disabled={!hasSolutions}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bottom of Funnel */}
              <Card className={!hasObjections ? "opacity-50" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Fundo de Funil</span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                          Quebrar objeções
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Responde às objeções e dúvidas finais, ajudando na decisão de compra ou contratação.
                      </p>
                      {!hasObjections && (
                        <p className="text-xs text-destructive">
                          Você precisa preencher as objeções desta persona na página de 'Estratégia' para criar conteúdo fundo de funil.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs text-muted-foreground">Qtd.</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={bottomCount}
                        onChange={(e) => setBottomCount(parseInt(e.target.value) || 0)}
                        className="w-16 h-8"
                        disabled={!hasObjections}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {!canContinue && selectedPersona && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  A persona selecionada não tem problemas, soluções ou objeções cadastradas. 
                  Acesse a área de Estratégia para completar o perfil da persona.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Button 
          onClick={handleContinue} 
          disabled={!canContinue || loading || generating || totalArticles === 0}
          className="w-full"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              Gerar {totalArticles} artigo{totalArticles !== 1 ? 's' : ''}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
