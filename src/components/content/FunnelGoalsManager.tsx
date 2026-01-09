import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Target, Save, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FunnelGoal {
  stage: string;
  target_value: number;
  alert_threshold: number;
}

interface FunnelGoalsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blogId: string;
  onSave?: () => void;
}

const defaultGoals: FunnelGoal[] = [
  { stage: 'top_to_middle', target_value: 40, alert_threshold: 10 },
  { stage: 'middle_to_bottom', target_value: 35, alert_threshold: 10 },
  { stage: 'overall', target_value: 15, alert_threshold: 5 },
  { stage: 'cta_rate', target_value: 10, alert_threshold: 5 },
];

const stageLabels: Record<string, { title: string; description: string }> = {
  top_to_middle: { 
    title: "Topo → Meio", 
    description: "Taxa de passagem da conscientização para consideração" 
  },
  middle_to_bottom: { 
    title: "Meio → Fundo", 
    description: "Taxa de passagem da consideração para decisão" 
  },
  overall: { 
    title: "Conversão Geral", 
    description: "Do Topo até o Fundo do funil" 
  },
  cta_rate: { 
    title: "Taxa de CTA", 
    description: "Cliques em CTAs nos artigos de Fundo" 
  },
};

export function FunnelGoalsManager({ open, onOpenChange, blogId, onSave }: FunnelGoalsManagerProps) {
  const [goals, setGoals] = useState<FunnelGoal[]>(defaultGoals);
  const [alertThreshold, setAlertThreshold] = useState(10);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchGoals();
    }
  }, [open, blogId]);

  async function fetchGoals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('funnel_goals')
      .select('*')
      .eq('blog_id', blogId);

    if (!error && data && data.length > 0) {
      const fetchedGoals = defaultGoals.map(defaultGoal => {
        const found = data.find(g => g.stage === defaultGoal.stage);
        return found 
          ? { stage: found.stage, target_value: found.target_value, alert_threshold: found.alert_threshold }
          : defaultGoal;
      });
      setGoals(fetchedGoals);
      // Use the first goal's threshold as the global threshold
      setAlertThreshold(data[0]?.alert_threshold || 10);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    
    try {
      // Upsert all goals
      for (const goal of goals) {
        const { error } = await supabase
          .from('funnel_goals')
          .upsert({
            blog_id: blogId,
            stage: goal.stage,
            target_value: goal.target_value,
            alert_threshold: alertThreshold,
          }, {
            onConflict: 'blog_id,stage'
          });

        if (error) throw error;
      }

      toast({
        title: "Metas salvas",
        description: "As metas de conversão foram atualizadas com sucesso.",
      });

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving goals:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as metas. Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  const updateGoalValue = (stage: string, value: number) => {
    setGoals(prev => prev.map(g => 
      g.stage === stage ? { ...g, target_value: value } : g
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Definir Metas do Funil
          </DialogTitle>
          <DialogDescription>
            Configure os objetivos de conversão para cada etapa. Você receberá alertas quando as métricas ficarem abaixo das metas.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {goals.map((goal) => {
              const label = stageLabels[goal.stage];
              return (
                <div key={goal.stage} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">{label.title}</Label>
                      <p className="text-xs text-muted-foreground">{label.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={goal.target_value}
                        onChange={(e) => updateGoalValue(goal.stage, parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-center"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Slider
                    value={[goal.target_value]}
                    onValueChange={(val) => updateGoalValue(goal.stage, val[0])}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              );
            })}

            {/* Alert Threshold */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <Label className="text-sm font-medium">Margem de Alerta</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Você receberá alertas quando as métricas ficarem abaixo da meta menos esta margem.
              </p>
              <div className="flex items-center gap-3">
                <Slider
                  value={[alertThreshold]}
                  onValueChange={(val) => setAlertThreshold(val[0])}
                  max={30}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12">{alertThreshold}%</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Metas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
