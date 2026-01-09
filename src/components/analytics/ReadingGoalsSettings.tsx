import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Target, Trash2, Bell, Mail, Pencil } from "lucide-react";

interface ReadingGoal {
  id: string;
  metric_type: string;
  target_value: number;
  alert_threshold: number;
  notify_in_app: boolean;
  notify_email: boolean;
  is_active: boolean;
}

const METRIC_LABELS: Record<string, string> = {
  scroll_depth: "Profundidade de Scroll",
  read_rate: "Taxa de Leitura Completa",
  time_on_page: "Tempo na Página (segundos)",
  cta_rate: "Taxa de Cliques em CTA",
};

interface ReadingGoalsSettingsProps {
  blogId: string;
}

export function ReadingGoalsSettings({ blogId }: ReadingGoalsSettingsProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ReadingGoal | null>(null);
  
  const [newGoal, setNewGoal] = useState({
    metric_type: "scroll_depth",
    target_value: 50,
    alert_threshold: 30,
    notify_in_app: true,
    notify_email: false,
  });

  useEffect(() => {
    fetchGoals();
  }, [blogId]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("reading_goals")
        .select("*")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("reading_goals")
        .insert({
          blog_id: blogId,
          user_id: user.id,
          ...newGoal,
        })
        .select()
        .single();

      if (error) throw error;

      setGoals((prev) => [data, ...prev]);
      setShowDialog(false);
      setNewGoal({
        metric_type: "scroll_depth",
        target_value: 50,
        alert_threshold: 30,
        notify_in_app: true,
        notify_email: false,
      });
      toast.success("Meta criada com sucesso!");
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Erro ao criar meta");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGoal = async (goal: ReadingGoal) => {
    try {
      const { error } = await supabase
        .from("reading_goals")
        .update({
          target_value: goal.target_value,
          alert_threshold: goal.alert_threshold,
          notify_in_app: goal.notify_in_app,
          notify_email: goal.notify_email,
          is_active: goal.is_active,
        })
        .eq("id", goal.id);

      if (error) throw error;

      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? goal : g))
      );
      setEditingGoal(null);
      toast.success("Meta atualizada!");
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error("Erro ao atualizar meta");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("reading_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;

      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      toast.success("Meta removida!");
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Erro ao remover meta");
    }
  };

  const toggleGoalActive = async (goal: ReadingGoal) => {
    handleUpdateGoal({ ...goal, is_active: !goal.is_active });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Metas de Leitura</CardTitle>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Meta</DialogTitle>
                <DialogDescription>
                  Defina uma meta e receba alertas quando ela não for atingida
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Métrica</Label>
                  <Select
                    value={newGoal.metric_type}
                    onValueChange={(v) => setNewGoal((prev) => ({ ...prev, metric_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(METRIC_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meta (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newGoal.target_value}
                      onChange={(e) =>
                        setNewGoal((prev) => ({ ...prev, target_value: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alertar abaixo de (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newGoal.alert_threshold}
                      onChange={(e) =>
                        setNewGoal((prev) => ({ ...prev, alert_threshold: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notificar no app
                    </Label>
                    <Switch
                      checked={newGoal.notify_in_app}
                      onCheckedChange={(v) => setNewGoal((prev) => ({ ...prev, notify_in_app: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Notificar por email
                    </Label>
                    <Switch
                      checked={newGoal.notify_email}
                      onCheckedChange={(v) => setNewGoal((prev) => ({ ...prev, notify_email: v }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateGoal} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar Meta
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Receba alertas quando as métricas caírem abaixo do threshold definido
        </CardDescription>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma meta configurada</p>
            <p className="text-sm">Crie metas para acompanhar a performance do seu conteúdo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className={`p-4 rounded-lg border transition-colors ${
                  goal.is_active ? "border-border" : "border-dashed opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{METRIC_LABELS[goal.metric_type]}</h4>
                      {goal.is_active ? (
                        <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Meta: {goal.target_value}% | Alerta abaixo de: {goal.alert_threshold}%
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {goal.notify_in_app && (
                        <span className="flex items-center gap-1">
                          <Bell className="h-3 w-3" /> App
                        </span>
                      )}
                      {goal.notify_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={goal.is_active}
                      onCheckedChange={() => toggleGoalActive(goal)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setEditingGoal(goal)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(goal.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Meta</DialogTitle>
            </DialogHeader>
            {editingGoal && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meta (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editingGoal.target_value}
                      onChange={(e) =>
                        setEditingGoal((prev) =>
                          prev ? { ...prev, target_value: parseInt(e.target.value) || 0 } : null
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alertar abaixo de (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editingGoal.alert_threshold}
                      onChange={(e) =>
                        setEditingGoal((prev) =>
                          prev ? { ...prev, alert_threshold: parseInt(e.target.value) || 0 } : null
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notificar no app
                    </Label>
                    <Switch
                      checked={editingGoal.notify_in_app}
                      onCheckedChange={(v) =>
                        setEditingGoal((prev) => (prev ? { ...prev, notify_in_app: v } : null))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Notificar por email
                    </Label>
                    <Switch
                      checked={editingGoal.notify_email}
                      onCheckedChange={(v) =>
                        setEditingGoal((prev) => (prev ? { ...prev, notify_email: v } : null))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingGoal(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => editingGoal && handleUpdateGoal(editingGoal)}>
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
