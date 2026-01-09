import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail, Calendar, Clock, BarChart3, Lightbulb, Target } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${String(i).padStart(2, "0")}:00`,
}));

interface WeeklyReportSettingsProps {
  blogId: string;
}

interface ReportSettings {
  id?: string;
  is_enabled: boolean;
  email_address: string;
  send_day: number;
  send_hour: number;
  include_performance: boolean;
  include_opportunities: boolean;
  include_recommendations: boolean;
}

export function WeeklyReportSettings({ blogId }: WeeklyReportSettingsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReportSettings>({
    is_enabled: true,
    email_address: "",
    send_day: 1,
    send_hour: 9,
    include_performance: true,
    include_opportunities: true,
    include_recommendations: true,
  });

  useEffect(() => {
    fetchSettings();
  }, [blogId, user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("weekly_report_settings")
        .select("*")
        .eq("blog_id", blogId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings(data);
      } else {
        // Set default email from user
        setSettings((prev) => ({
          ...prev,
          email_address: user.email || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching report settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!settings.email_address) {
      toast.error("Informe um email para receber os relatórios");
      return;
    }

    setSaving(true);
    try {
      if (settings.id) {
        // Update
        const { error } = await supabase
          .from("weekly_report_settings")
          .update({
            is_enabled: settings.is_enabled,
            email_address: settings.email_address,
            send_day: settings.send_day,
            send_hour: settings.send_hour,
            include_performance: settings.include_performance,
            include_opportunities: settings.include_opportunities,
            include_recommendations: settings.include_recommendations,
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Create
        const { data, error } = await supabase
          .from("weekly_report_settings")
          .insert({
            blog_id: blogId,
            user_id: user.id,
            is_enabled: settings.is_enabled,
            email_address: settings.email_address,
            send_day: settings.send_day,
            send_hour: settings.send_hour,
            include_performance: settings.include_performance,
            include_opportunities: settings.include_opportunities,
            include_recommendations: settings.include_recommendations,
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
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
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Relatórios Semanais</CardTitle>
          </div>
          <Switch
            checked={settings.is_enabled}
            onCheckedChange={(v) => setSettings((prev) => ({ ...prev, is_enabled: v }))}
          />
        </div>
        <CardDescription>
          Receba um resumo semanal por email com métricas, oportunidades e recomendações
        </CardDescription>
      </CardHeader>
      <CardContent className={settings.is_enabled ? "" : "opacity-50 pointer-events-none"}>
        <div className="space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <Label>Email para receber relatórios</Label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={settings.email_address}
              onChange={(e) => setSettings((prev) => ({ ...prev, email_address: e.target.value }))}
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dia da semana
              </Label>
              <Select
                value={String(settings.send_day)}
                onValueChange={(v) => setSettings((prev) => ({ ...prev, send_day: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário (UTC)
              </Label>
              <Select
                value={String(settings.send_hour)}
                onValueChange={(v) => setSettings((prev) => ({ ...prev, send_hour: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content sections */}
          <div className="space-y-3">
            <Label>Seções do relatório</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Performance da Semana</p>
                    <p className="text-xs text-muted-foreground">Métricas e evolução do tráfego</p>
                  </div>
                </div>
                <Switch
                  checked={settings.include_performance}
                  onCheckedChange={(v) =>
                    setSettings((prev) => ({ ...prev, include_performance: v }))
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="font-medium text-sm">Oportunidades Sugeridas</p>
                    <p className="text-xs text-muted-foreground">Temas e tendências identificadas</p>
                  </div>
                </div>
                <Switch
                  checked={settings.include_opportunities}
                  onCheckedChange={(v) =>
                    setSettings((prev) => ({ ...prev, include_opportunities: v }))
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">Próximos Passos Recomendados</p>
                    <p className="text-xs text-muted-foreground">Ações sugeridas para melhorar</p>
                  </div>
                </div>
                <Switch
                  checked={settings.include_recommendations}
                  onCheckedChange={(v) =>
                    setSettings((prev) => ({ ...prev, include_recommendations: v }))
                  }
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
