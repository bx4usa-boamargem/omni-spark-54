import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Plus, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Alert {
  id: string;
  alert_type: string;
  threshold_percent: number;
  is_active: boolean;
  notification_email: string | null;
  last_triggered_at: string | null;
}

interface GSCAlertManagerProps {
  blogId: string;
}

const ALERT_TYPES = {
  clicks_drop: { label: "Queda de Cliques", description: "Alerta quando cliques caírem", unit: "%" },
  impressions_drop: { label: "Queda de Impressões", description: "Alerta quando impressões caírem", unit: "%" },
  position_drop: { label: "Queda de Posição", description: "Alerta quando posição média piorar", unit: " posições" },
};

export function GSCAlertManager({ blogId }: GSCAlertManagerProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    alert_type: "clicks_drop",
    threshold_percent: 20,
    notification_email: "",
  });

  useEffect(() => {
    fetchAlerts();
  }, [blogId]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("gsc_ranking_alerts")
        .select("*")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createAlert = async () => {
    try {
      const { error } = await supabase.from("gsc_ranking_alerts").insert({
        blog_id: blogId,
        alert_type: newAlert.alert_type,
        threshold_percent: newAlert.threshold_percent,
        notification_email: newAlert.notification_email || null,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Alerta criado com sucesso");
      setIsOpen(false);
      setNewAlert({ alert_type: "clicks_drop", threshold_percent: 20, notification_email: "" });
      fetchAlerts();
    } catch (error) {
      console.error("Error creating alert:", error);
      toast.error("Erro ao criar alerta");
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("gsc_ranking_alerts")
        .update({ is_active: isActive })
        .eq("id", alertId);

      if (error) throw error;
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, is_active: isActive } : a)));
    } catch (error) {
      console.error("Error toggling alert:", error);
      toast.error("Erro ao atualizar alerta");
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase.from("gsc_ranking_alerts").delete().eq("id", alertId);

      if (error) throw error;
      setAlerts(alerts.filter((a) => a.id !== alertId));
      toast.success("Alerta removido");
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast.error("Erro ao remover alerta");
    }
  };

  const activeAlerts = alerts.filter((a) => a.is_active);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas de Ranking
            </CardTitle>
            <CardDescription>
              Receba notificações quando houver quedas significativas
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Alerta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Alerta</DialogTitle>
                <DialogDescription>
                  Configure um alerta para monitorar quedas de performance
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Alerta</Label>
                  <Select
                    value={newAlert.alert_type}
                    onValueChange={(value) => setNewAlert({ ...newAlert, alert_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ALERT_TYPES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Threshold ({ALERT_TYPES[newAlert.alert_type as keyof typeof ALERT_TYPES].unit})
                  </Label>
                  <Input
                    type="number"
                    value={newAlert.threshold_percent}
                    onChange={(e) =>
                      setNewAlert({ ...newAlert, threshold_percent: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {newAlert.alert_type === "position_drop"
                      ? `Alerta quando a posição piorar ${newAlert.threshold_percent} ou mais posições`
                      : `Alerta quando houver queda de ${newAlert.threshold_percent}% ou mais`}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Email para Notificação (opcional)</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={newAlert.notification_email}
                    onChange={(e) => setNewAlert({ ...newAlert, notification_email: e.target.value })}
                  />
                </div>

                <Button onClick={createAlert} className="w-full">
                  Criar Alerta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando alertas...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum alerta configurado</p>
            <p className="text-sm">Crie alertas para monitorar quedas de ranking</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">
                {activeAlerts.length} alerta{activeAlerts.length !== 1 ? "s" : ""} ativo
                {activeAlerts.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {alerts.map((alert) => {
              const typeInfo = ALERT_TYPES[alert.alert_type as keyof typeof ALERT_TYPES];
              return (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.is_active ? "bg-card" : "bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={alert.is_active}
                      onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                    />
                    <div>
                      <p className="font-medium">{typeInfo?.label || alert.alert_type}</p>
                      <p className="text-sm text-muted-foreground">
                        Threshold: {alert.threshold_percent}
                        {typeInfo?.unit || "%"}
                        {alert.notification_email && ` • ${alert.notification_email}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAlert(alert.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
