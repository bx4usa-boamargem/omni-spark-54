import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReferralSettings {
  id: string;
  commission_percentage: number;
  payment_deadline_days: number;
  is_program_active: boolean;
  minimum_payout_cents: number;
  updated_at: string;
}

export function ReferralSettingsCard() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [commissionPercentage, setCommissionPercentage] = useState(40);
  const [paymentDeadlineDays, setPaymentDeadlineDays] = useState(15);
  const [isProgramActive, setIsProgramActive] = useState(true);
  const [minimumPayoutCents, setMinimumPayoutCents] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setCommissionPercentage(data.commission_percentage);
        setPaymentDeadlineDays(data.payment_deadline_days);
        setIsProgramActive(data.is_program_active);
        setMinimumPayoutCents(data.minimum_payout_cents);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('referral_settings')
        .update({
          commission_percentage: commissionPercentage,
          payment_deadline_days: paymentDeadlineDays,
          is_program_active: isProgramActive,
          minimum_payout_cents: minimumPayoutCents,
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As configurações do programa foram atualizadas com sucesso.",
      });

      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Carregando configurações...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Configurações do Programa</CardTitle>
              <CardDescription>Ajuste os parâmetros do programa de indicações.</CardDescription>
            </div>
          </div>
          <Badge variant={isProgramActive ? "default" : "secondary"} className={isProgramActive ? "bg-green-600" : ""}>
            {isProgramActive ? "Programa Ativo" : "Programa Inativo"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Program Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div>
            <Label className="text-base font-medium">Status do Programa</Label>
            <p className="text-sm text-muted-foreground">
              {isProgramActive 
                ? "O programa está ativo e aceitando novas indicações." 
                : "O programa está pausado. Novas indicações não serão processadas."}
            </p>
          </div>
          <Switch
            checked={isProgramActive}
            onCheckedChange={setIsProgramActive}
          />
        </div>

        {/* Commission Percentage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Porcentagem de Comissão</Label>
            <span className="text-2xl font-bold text-primary">{commissionPercentage}%</span>
          </div>
          <Slider
            value={[commissionPercentage]}
            onValueChange={(value) => setCommissionPercentage(value[0])}
            min={1}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Percentual do valor da assinatura pago como comissão ao indicador.
          </p>
        </div>

        {/* Payment Deadline */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Prazo de Pagamento (dias úteis)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              value={paymentDeadlineDays}
              onChange={(e) => setPaymentDeadlineDays(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
              className="w-24"
              min={1}
              max={60}
            />
            <span className="text-muted-foreground">dias úteis após a conversão</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Prazo em dias úteis para pagamento da comissão após a conversão.
          </p>
        </div>

        {/* Minimum Payout */}
        <div className="space-y-2">
          <Label className="text-base font-medium">Valor Mínimo para Saque</Label>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">$</span>
            <Input
              type="number"
              value={minimumPayoutCents / 100}
              onChange={(e) => setMinimumPayoutCents(Math.max(0, parseFloat(e.target.value) * 100 || 0))}
              className="w-32"
              min={0}
              step={1}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Valor mínimo acumulado para que o indicador possa solicitar pagamento. 0 = sem mínimo.
          </p>
        </div>

        {/* Last Updated */}
        {settings?.updated_at && (
          <div className="pt-4 border-t text-sm text-muted-foreground">
            Última atualização: {format(new Date(settings.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        )}

        {/* Save Button */}
        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
