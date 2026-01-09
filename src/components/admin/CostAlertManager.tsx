import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Clock, Save, Plus, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CostAlert {
  id: string;
  alert_type: string;
  threshold_usd: number;
  notification_email: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

interface AlertHistory {
  id: string;
  alert_id: string;
  triggered_at: string;
  actual_cost: number;
  threshold_cost: number;
  message: string | null;
}

const ALERT_TYPES = [
  { value: "daily", label: "Diário", icon: "📅" },
  { value: "weekly", label: "Semanal", icon: "📊" },
  { value: "monthly", label: "Mensal", icon: "🗓️" },
  { value: "per_user", label: "Por Usuário", icon: "👤" },
];

export function CostAlertManager() {
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({
    alert_type: "monthly",
    threshold_usd: 50,
    notification_email: "",
  });

  useEffect(() => {
    fetchAlerts();
    fetchHistory();
  }, []);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from("admin_cost_alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching alerts:", error);
      return;
    }

    setAlerts(data || []);
    setLoading(false);
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("admin_alert_history")
      .select("*")
      .order("triggered_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching history:", error);
      return;
    }

    setHistory(data || []);
  };

  const addAlert = async () => {
    if (newAlert.threshold_usd <= 0) {
      toast.error("O limite deve ser maior que zero");
      return;
    }

    const { error } = await supabase.from("admin_cost_alerts").insert({
      alert_type: newAlert.alert_type,
      threshold_usd: newAlert.threshold_usd,
      notification_email: newAlert.notification_email || null,
      is_active: true,
    });

    if (error) {
      toast.error("Erro ao criar alerta");
      console.error("Error adding alert:", error);
      return;
    }

    toast.success("Alerta criado com sucesso");
    setShowNewAlert(false);
    setNewAlert({ alert_type: "monthly", threshold_usd: 50, notification_email: "" });
    fetchAlerts();
  };

  const toggleAlert = async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from("admin_cost_alerts")
      .update({ is_active })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar alerta");
      return;
    }

    fetchAlerts();
  };

  const updateThreshold = async (id: string, threshold_usd: number) => {
    const { error } = await supabase
      .from("admin_cost_alerts")
      .update({ threshold_usd })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar limite");
      return;
    }

    toast.success("Limite atualizado");
    fetchAlerts();
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase
      .from("admin_cost_alerts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover alerta");
      return;
    }

    toast.success("Alerta removido");
    fetchAlerts();
  };

  const getAlertTypeInfo = (type: string) => {
    return ALERT_TYPES.find(t => t.value === type) || { value: type, label: type, icon: "📊" };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas de Custo
            </CardTitle>
            <CardDescription>
              Configure limites de gastos e receba alertas automáticos
            </CardDescription>
          </div>
          <Button onClick={() => setShowNewAlert(!showNewAlert)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Alerta
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNewAlert && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Tipo de Alerta</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={newAlert.alert_type}
                      onChange={(e) => setNewAlert({ ...newAlert, alert_type: e.target.value })}
                    >
                      {ALERT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Limite (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAlert.threshold_usd}
                      onChange={(e) => setNewAlert({ ...newAlert, threshold_usd: parseFloat(e.target.value) || 0 })}
                      placeholder="50.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (opcional)</Label>
                    <Input
                      type="email"
                      value={newAlert.notification_email}
                      onChange={(e) => setNewAlert({ ...newAlert, notification_email: e.target.value })}
                      placeholder="admin@empresa.com"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addAlert} size="sm">
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                    <Button onClick={() => setShowNewAlert(false)} variant="ghost" size="sm">
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum alerta configurado. Clique em "Novo Alerta" para criar.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const typeInfo = getAlertTypeInfo(alert.alert_type);
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      alert.is_active 
                        ? "bg-card border-border" 
                        : "bg-muted/30 border-border/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={alert.is_active}
                        onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{typeInfo.icon}</span>
                          <span className="font-medium">{typeInfo.label}</span>
                          <Badge variant="outline" className="ml-2">
                            ${alert.threshold_usd.toFixed(2)}
                          </Badge>
                        </div>
                        {alert.last_triggered_at && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            Último disparo: {format(new Date(alert.last_triggered_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-24 h-8 text-right"
                        defaultValue={alert.threshold_usd}
                        onBlur={(e) => {
                          const newValue = parseFloat(e.target.value);
                          if (newValue !== alert.threshold_usd && newValue > 0) {
                            updateThreshold(alert.id, newValue);
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Alertas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                    item.actual_cost >= item.threshold_cost 
                      ? "text-destructive" 
                      : "text-yellow-500"
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm">
                      {item.message || `Custo atingiu $${item.actual_cost.toFixed(2)} de $${item.threshold_cost.toFixed(2)}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.triggered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <Badge 
                    variant={item.actual_cost >= item.threshold_cost ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {((item.actual_cost / item.threshold_cost) * 100).toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
