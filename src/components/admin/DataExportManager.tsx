import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Users, Cpu, DollarSign, Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { id: "clients", label: "Clientes", description: "Perfis, assinaturas e blogs", icon: Users },
  { id: "consumption", label: "Consumo de IA", description: "Logs de consumo e custos", icon: Cpu },
  { id: "articles", label: "Artigos", description: "Todos os artigos e métricas", icon: FileText },
  { id: "financial", label: "Financeiro", description: "Relatório de receitas e custos", icon: DollarSign },
];

export function DataExportManager() {
  const [selectedExports, setSelectedExports] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exportFormat, setExportFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);

  const toggleExport = (id: string) => {
    setSelectedExports(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const downloadCSV = (data: unknown[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0] as object);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = (row as Record<string, unknown>)[header];
          if (typeof value === "string" && value.includes(",")) {
            return `"${value}"`;
          }
          return value ?? "";
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportData = async () => {
    if (selectedExports.length === 0) {
      toast.error("Selecione pelo menos uma opção para exportar");
      return;
    }

    setExporting(true);

    try {
      for (const exportId of selectedExports) {
        switch (exportId) {
          case "clients": {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name, created_at");
            
            const { data: subscriptions } = await supabase
              .from("subscriptions")
              .select("user_id, plan, status, created_at");

            const { data: blogs } = await supabase
              .from("blogs")
              .select("user_id, name, slug, created_at");

            const subsMap = new Map(subscriptions?.map(s => [s.user_id, s]) || []);
            const blogsMap = new Map(blogs?.map(b => [b.user_id, b]) || []);

            const clientsData = profiles?.map(p => ({
              user_id: p.user_id,
              name: p.full_name || "N/A",
              plan: subsMap.get(p.user_id)?.plan || "free",
              status: subsMap.get(p.user_id)?.status || "active",
              blog_name: blogsMap.get(p.user_id)?.name || "N/A",
              blog_slug: blogsMap.get(p.user_id)?.slug || "N/A",
              registered_at: p.created_at,
            })) || [];

            downloadCSV(clientsData, "clients");
            break;
          }

          case "consumption": {
            const { data: logs } = await supabase
              .from("consumption_logs")
              .select("*")
              .gte("created_at", `${startDate}T00:00:00`)
              .lte("created_at", `${endDate}T23:59:59`)
              .order("created_at", { ascending: false });

            const consumptionData = logs?.map(l => ({
              date: format(new Date(l.created_at || ""), "yyyy-MM-dd HH:mm"),
              user_id: l.user_id,
              action: l.action_type,
              model: l.model_used || "N/A",
              input_tokens: l.input_tokens || 0,
              output_tokens: l.output_tokens || 0,
              images: l.images_generated || 0,
              cost_usd: l.estimated_cost_usd,
            })) || [];

            downloadCSV(consumptionData, "consumption");
            break;
          }

          case "articles": {
            const { data: articles } = await supabase
              .from("articles")
              .select("id, blog_id, title, slug, status, view_count, created_at, published_at")
              .gte("created_at", `${startDate}T00:00:00`)
              .lte("created_at", `${endDate}T23:59:59`);

            const articlesData = articles?.map(a => ({
              id: a.id,
              blog_id: a.blog_id,
              title: a.title,
              slug: a.slug,
              status: a.status,
              views: a.view_count || 0,
              created_at: a.created_at,
              published_at: a.published_at || "N/A",
            })) || [];

            downloadCSV(articlesData, "articles");
            break;
          }

          case "financial": {
            const { data: subscriptions } = await supabase
              .from("subscriptions")
              .select("plan, status, created_at, canceled_at");

            const { data: costs } = await supabase
              .from("consumption_logs")
              .select("estimated_cost_usd, created_at")
              .gte("created_at", `${startDate}T00:00:00`)
              .lte("created_at", `${endDate}T23:59:59`);

            const PLAN_PRICES: Record<string, number> = {
              free: 0,
              essential: 29,
              plus: 79,
              scale: 199,
            };

            const activeSubs = subscriptions?.filter(s => s.status === "active") || [];
            const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);
            const totalCost = costs?.reduce((sum, c) => sum + (c.estimated_cost_usd || 0), 0) || 0;

            const financialData = [{
              period: `${startDate} to ${endDate}`,
              total_subscriptions: subscriptions?.length || 0,
              active_subscriptions: activeSubs.length,
              free_users: activeSubs.filter(s => s.plan === "free").length,
              essential_users: activeSubs.filter(s => s.plan === "essential").length,
              plus_users: activeSubs.filter(s => s.plan === "plus").length,
              scale_users: activeSubs.filter(s => s.plan === "scale").length,
              mrr_usd: mrr,
              arr_usd: mrr * 12,
              total_cost_usd: totalCost.toFixed(4),
              margin_percent: mrr > 0 ? (((mrr - totalCost) / mrr) * 100).toFixed(2) : 0,
            }];

            downloadCSV(financialData, "financial_report");
            break;
          }
        }
      }

      toast.success(`${selectedExports.length} arquivo(s) exportado(s) com sucesso!`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erro ao exportar dados");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportação de Dados
        </CardTitle>
        <CardDescription>
          Exporte dados da plataforma em formato CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EXPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedExports.includes(option.id);

            return (
              <div
                key={option.id}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => toggleExport(option.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleExport(option.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium cursor-pointer">{option.label}</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Data inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Export Button */}
        <Button 
          onClick={exportData} 
          disabled={selectedExports.length === 0 || exporting}
          className="w-full"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportar {selectedExports.length > 0 ? `(${selectedExports.length} selecionado${selectedExports.length > 1 ? "s" : ""})` : ""}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
