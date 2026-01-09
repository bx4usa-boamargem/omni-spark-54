import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileDown, Mail } from "lucide-react";
import { subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ArticleWithMetrics {
  id: string;
  title: string;
  status: string;
  view_count: number;
  funnel_stage: string | null;
  published_at: string | null;
  metrics: {
    readRate: number;
    scroll50: number;
    ctaRate: number;
  };
}

interface FunnelReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blogId: string;
  blogName: string;
  articles: ArticleWithMetrics[];
}

interface StageMetrics {
  articles: number;
  views: number;
  avgReadRate: number;
  avgScroll50: number;
  avgCtaRate: number;
}

export function FunnelReportDialog({
  open,
  onOpenChange,
  blogId,
  blogName,
  articles,
}: FunnelReportDialogProps) {
  const [period, setPeriod] = useState("30");
  const [format_, setFormat] = useState<"pdf" | "email">("pdf");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const calculateStageMetrics = (stageArticles: ArticleWithMetrics[]): StageMetrics => {
    const articlesCount = stageArticles.length;
    const views = stageArticles.reduce((sum, a) => sum + a.view_count, 0);
    const avgReadRate = articlesCount > 0
      ? Math.round(stageArticles.reduce((sum, a) => sum + a.metrics.readRate, 0) / articlesCount)
      : 0;
    const avgScroll50 = articlesCount > 0
      ? Math.round(stageArticles.reduce((sum, a) => sum + a.metrics.scroll50, 0) / articlesCount)
      : 0;
    const avgCtaRate = articlesCount > 0
      ? Math.round(stageArticles.reduce((sum, a) => sum + a.metrics.ctaRate, 0) / articlesCount)
      : 0;

    return { articles: articlesCount, views, avgReadRate, avgScroll50, avgCtaRate };
  };

  const generateReportData = () => {
    const topArticles = articles.filter(a => a.funnel_stage === 'top');
    const middleArticles = articles.filter(a => a.funnel_stage === 'middle');
    const bottomArticles = articles.filter(a => a.funnel_stage === 'bottom');

    const totalViews = articles.reduce((sum, a) => sum + a.view_count, 0);
    const avgReadRate = articles.length > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.metrics.readRate, 0) / articles.length)
      : 0;
    const avgCtaRate = articles.length > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.metrics.ctaRate, 0) / articles.length)
      : 0;

    const topPerformers = [...articles]
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 5)
      .map(a => ({ title: a.title, views: a.view_count, readRate: a.metrics.readRate }));

    // Calculate bottlenecks
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    const topMetrics = calculateStageMetrics(topArticles);
    const middleMetrics = calculateStageMetrics(middleArticles);
    const bottomMetrics = calculateStageMetrics(bottomArticles);

    const overallAvgScroll50 = articles.length > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.metrics.scroll50, 0) / articles.length)
      : 0;

    if (topMetrics.avgScroll50 < overallAvgScroll50 - 15) {
      bottlenecks.push(`Topo de Funil com retenção ${overallAvgScroll50 - topMetrics.avgScroll50}% abaixo da média`);
    }
    if (middleMetrics.avgScroll50 < overallAvgScroll50 - 15) {
      bottlenecks.push(`Meio de Funil com retenção ${overallAvgScroll50 - middleMetrics.avgScroll50}% abaixo da média`);
    }
    if (bottomMetrics.avgScroll50 < overallAvgScroll50 - 15) {
      bottlenecks.push(`Fundo de Funil com retenção ${overallAvgScroll50 - bottomMetrics.avgScroll50}% abaixo da média`);
    }

    if (topArticles.length === 0) recommendations.push("Criar artigos para Topo de Funil");
    if (middleArticles.length === 0) recommendations.push("Criar artigos para Meio de Funil");
    if (bottomArticles.length === 0) recommendations.push("Criar artigos para Fundo de Funil");
    if (bottomMetrics.avgCtaRate > 20) {
      recommendations.push("Excelente taxa de CTA no Fundo de Funil - replique o estilo");
    }

    return {
      blogName,
      period: {
        start: format(subDays(new Date(), parseInt(period)), "dd/MM/yyyy", { locale: ptBR }),
        end: format(new Date(), "dd/MM/yyyy", { locale: ptBR }),
      },
      totalArticles: articles.length,
      totalViews,
      avgReadRate,
      avgCtaRate,
      stageMetrics: {
        top: topMetrics,
        middle: middleMetrics,
        bottom: bottomMetrics,
      },
      topArticles: topPerformers,
      bottlenecks,
      recommendations,
    };
  };

  const handleExportPdf = async () => {
    setLoading(true);

    try {
      const reportData = generateReportData();
      
      // Generate PDF using html2pdf
      const { default: html2pdf } = await import("html2pdf.js");

      const element = document.createElement("div");
      element.innerHTML = generatePdfHtml(reportData);
      element.style.width = "800px";
      element.style.padding = "40px";
      document.body.appendChild(element);

      await html2pdf()
        .from(element)
        .set({
          margin: 10,
          filename: `relatorio-funil-${format(new Date(), "yyyy-MM-dd")}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();

      document.body.removeChild(element);

      toast({ title: "PDF exportado com sucesso!" });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({ variant: "destructive", title: "Erro ao exportar PDF", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      toast({ variant: "destructive", title: "Digite um email" });
      return;
    }

    setLoading(true);

    try {
      const reportData = generateReportData();

      const { error } = await supabase.functions.invoke("send-funnel-report", {
        body: { email, reportData },
      });

      if (error) throw error;

      toast({ title: "Relatório enviado!", description: `Email enviado para ${email}` });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao enviar email", 
        description: error.message || "Verifique se o serviço de email está configurado" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (format_ === "pdf") {
      handleExportPdf();
    } else {
      handleSendEmail();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Relatório do Funil</DialogTitle>
          <DialogDescription>
            Exporte um relatório completo com métricas de performance do funil de vendas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Formato</Label>
            <RadioGroup value={format_} onValueChange={(v) => setFormat(v as "pdf" | "email")}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileDown className="h-4 w-4" />
                  Baixar PDF
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Mail className="h-4 w-4" />
                  Enviar por Email
                </Label>
              </div>
            </RadioGroup>
          </div>

          {format_ === "email" && (
            <div className="space-y-2">
              <Label htmlFor="email-input">Email</Label>
              <Input
                id="email-input"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {format_ === "pdf" ? "Baixar PDF" : "Enviar Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function generatePdfHtml(data: any): string {
  const stageRow = (name: string, metrics: any) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${name}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${metrics.articles}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${metrics.views.toLocaleString()}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${metrics.avgScroll50}%</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${metrics.avgReadRate}%</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${metrics.avgCtaRate}%</td>
    </tr>
  `;

  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
        <h1 style="margin: 0 0 8px 0; font-size: 24px;">📊 Relatório do Funil de Vendas</h1>
        <p style="margin: 0; opacity: 0.9;">${data.blogName} • ${data.period.start} a ${data.period.end}</p>
      </div>

      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Resumo Executivo</h2>
        <div style="display: flex; gap: 16px;">
          <div style="flex: 1; background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold;">${data.totalArticles}</div>
            <div style="font-size: 12px; color: #6b7280;">Artigos</div>
          </div>
          <div style="flex: 1; background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold;">${data.totalViews.toLocaleString()}</div>
            <div style="font-size: 12px; color: #6b7280;">Views</div>
          </div>
          <div style="flex: 1; background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold;">${data.avgReadRate}%</div>
            <div style="font-size: 12px; color: #6b7280;">Leitura</div>
          </div>
          <div style="flex: 1; background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold;">${data.avgCtaRate}%</div>
            <div style="font-size: 12px; color: #6b7280;">CTA</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">Performance por Etapa</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Etapa</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Artigos</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Views</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Scroll 50%</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Leitura</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">CTA</th>
            </tr>
          </thead>
          <tbody>
            ${stageRow('Topo de Funil', data.stageMetrics.top)}
            ${stageRow('Meio de Funil', data.stageMetrics.middle)}
            ${stageRow('Fundo de Funil', data.stageMetrics.bottom)}
          </tbody>
        </table>
      </div>

      ${data.topArticles.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">🏆 Top 5 Artigos</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Título</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Views</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Leitura</th>
            </tr>
          </thead>
          <tbody>
            ${data.topArticles.map((a: any) => `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${a.title}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${a.views.toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${a.readRate}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${data.bottlenecks.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">⚠️ Gargalos Identificados</h2>
        ${data.bottlenecks.map((b: string) => `
          <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #f59e0b;">
            ${b}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${data.recommendations.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 18px; margin-bottom: 16px;">💡 Recomendações</h2>
        ${data.recommendations.map((r: string) => `
          <div style="background: #d1fae5; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #10b981;">
            ${r}
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px;">
        Relatório gerado automaticamente
      </div>
    </div>
  `;
}
