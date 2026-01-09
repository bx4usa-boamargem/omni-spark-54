import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

interface CostAlert {
  id: string;
  alert_type: string;
  threshold_usd: number;
  is_active: boolean;
}

interface CostAlertBannerProps {
  totalCost: number;
  startDate: string;
  endDate: string;
}

interface ActiveAlert {
  alert: CostAlert;
  percentage: number;
  currentCost: number;
}

export function CostAlertBanner({ totalCost, startDate, endDate }: CostAlertBannerProps) {
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [dailyCost, setDailyCost] = useState(0);
  const [weeklyCost, setWeeklyCost] = useState(0);
  const [monthlyCost, setMonthlyCost] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    fetchAlerts();
    fetchPeriodCosts();
  }, [startDate, endDate]);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from("admin_cost_alerts")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching alerts:", error);
      return;
    }

    setAlerts(data || []);
  };

  const fetchPeriodCosts = async () => {
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();

    // Fetch daily cost
    const { data: dailyData } = await supabase
      .from("consumption_logs")
      .select("estimated_cost_usd")
      .gte("created_at", todayStart);

    if (dailyData) {
      setDailyCost(dailyData.reduce((sum, log) => sum + (log.estimated_cost_usd || 0), 0));
    }

    // Fetch weekly cost
    const { data: weeklyData } = await supabase
      .from("consumption_logs")
      .select("estimated_cost_usd")
      .gte("created_at", weekStart);

    if (weeklyData) {
      setWeeklyCost(weeklyData.reduce((sum, log) => sum + (log.estimated_cost_usd || 0), 0));
    }

    // Fetch monthly cost
    const { data: monthlyData } = await supabase
      .from("consumption_logs")
      .select("estimated_cost_usd")
      .gte("created_at", monthStart);

    if (monthlyData) {
      setMonthlyCost(monthlyData.reduce((sum, log) => sum + (log.estimated_cost_usd || 0), 0));
    }
  };

  const activeAlerts = useMemo(() => {
    const triggeredAlerts: ActiveAlert[] = [];

    alerts.forEach((alert) => {
      let currentCost = 0;
      
      switch (alert.alert_type) {
        case "daily":
          currentCost = dailyCost;
          break;
        case "weekly":
          currentCost = weeklyCost;
          break;
        case "monthly":
          currentCost = monthlyCost;
          break;
        default:
          currentCost = totalCost;
      }

      const percentage = (currentCost / alert.threshold_usd) * 100;
      
      // Show alert if at 80% or above
      if (percentage >= 80 && !dismissed.includes(alert.id)) {
        triggeredAlerts.push({
          alert,
          percentage,
          currentCost,
        });
      }
    });

    return triggeredAlerts.sort((a, b) => b.percentage - a.percentage);
  }, [alerts, dailyCost, weeklyCost, monthlyCost, totalCost, dismissed]);

  const logAlertTriggered = async (alert: CostAlert, currentCost: number) => {
    await supabase.from("admin_alert_history").insert({
      alert_id: alert.id,
      actual_cost: currentCost,
      threshold_cost: alert.threshold_usd,
      message: `Alerta ${getAlertTypeLabel(alert.alert_type)}: $${currentCost.toFixed(2)} de $${alert.threshold_usd.toFixed(2)}`,
    });

    await supabase
      .from("admin_cost_alerts")
      .update({ last_triggered_at: new Date().toISOString() })
      .eq("id", alert.id);
  };

  // Log alerts that reach 100% for the first time
  useEffect(() => {
    activeAlerts.forEach((item) => {
      if (item.percentage >= 100) {
        // Check if we already logged this alert today
        const alertKey = `alert_logged_${item.alert.id}_${new Date().toDateString()}`;
        if (!sessionStorage.getItem(alertKey)) {
          logAlertTriggered(item.alert, item.currentCost);
          sessionStorage.setItem(alertKey, "true");
        }
      }
    });
  }, [activeAlerts]);

  if (activeAlerts.length === 0) {
    return null;
  }

  const topAlert = activeAlerts[0];
  const isOverLimit = topAlert.percentage >= 100;

  return (
    <div
      className={`mb-4 px-4 py-3 rounded-lg flex items-center justify-between ${
        isOverLimit
          ? "bg-destructive/10 border border-destructive/30 text-destructive"
          : "bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400"
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className={`h-5 w-5 ${isOverLimit ? "animate-pulse" : ""}`} />
        <div>
          <span className="font-medium">
            {isOverLimit ? "⚠️ ATENÇÃO: " : "Aviso: "}
          </span>
          <span>
            Custo {getAlertTypeLabel(topAlert.alert.alert_type)} atingiu{" "}
            <strong>{topAlert.percentage.toFixed(0)}%</strong> do limite (
            ${topAlert.currentCost.toFixed(2)} de ${topAlert.alert.threshold_usd.toFixed(2)})
          </span>
          {activeAlerts.length > 1 && (
            <span className="text-sm ml-2 opacity-75">
              +{activeAlerts.length - 1} outros alertas
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setDismissed([...dismissed, topAlert.alert.id])}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function getAlertTypeLabel(type: string): string {
  switch (type) {
    case "daily":
      return "diário";
    case "weekly":
      return "semanal";
    case "monthly":
      return "mensal";
    case "per_user":
      return "por usuário";
    default:
      return type;
  }
}
