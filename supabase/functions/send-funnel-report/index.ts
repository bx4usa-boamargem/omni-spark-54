import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StageMetrics {
  articles: number;
  views: number;
  avgReadRate: number;
  avgScroll50: number;
  avgCtaRate: number;
}

interface ReportData {
  blogName: string;
  period: { start: string; end: string };
  totalArticles: number;
  totalViews: number;
  avgReadRate: number;
  avgCtaRate: number;
  stageMetrics: {
    top: StageMetrics;
    middle: StageMetrics;
    bottom: StageMetrics;
  };
  topArticles: Array<{
    title: string;
    views: number;
    readRate: number;
  }>;
  bottlenecks: string[];
  recommendations: string[];
}

interface SendReportRequest {
  email: string;
  reportData: ReportData;
  blogId?: string;
}

serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const { email, reportData, blogId }: SendReportRequest = await req.json();

    console.log(`Sending funnel report to ${email}`);

    const html = generateReportHtml(reportData);

    // Send email via centralized send-email function
    const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        template: 'funnel_report',
        language: 'pt-BR',
        subject: `Relatório do Funil de Vendas - ${reportData.blogName}`,
        htmlContent: html,
        blogId,
        variables: {
          blogName: reportData.blogName,
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Error sending email:", errorText);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, id: result.messageId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error sending funnel report:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateReportHtml(data: ReportData): string {
  const stageRow = (name: string, metrics: StageMetrics) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${metrics.articles}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${metrics.views.toLocaleString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${metrics.avgScroll50}%</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${metrics.avgReadRate}%</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${metrics.avgCtaRate}%</td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; margin-bottom: 24px; }
        .header h1 { margin: 0 0 8px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .card h2 { margin-top: 0; font-size: 18px; color: #374151; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .metric { background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 28px; font-weight: bold; color: #111827; }
        .metric-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
        .bottleneck { background: #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #f59e0b; }
        .recommendation { background: #d1fae5; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #10b981; }
        .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Relatório do Funil de Vendas</h1>
        <p>${data.blogName} • ${data.period.start} a ${data.period.end}</p>
      </div>

      <div class="card">
        <h2>Resumo Executivo</h2>
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-value">${data.totalArticles}</div>
            <div class="metric-label">Artigos no Funil</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.totalViews.toLocaleString()}</div>
            <div class="metric-label">Views Totais</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.avgReadRate}%</div>
            <div class="metric-label">Leitura Completa</div>
          </div>
          <div class="metric">
            <div class="metric-value">${data.avgCtaRate}%</div>
            <div class="metric-label">Taxa de CTA</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Performance por Etapa</h2>
        <table>
          <thead>
            <tr>
              <th>Etapa</th>
              <th style="text-align: center;">Artigos</th>
              <th style="text-align: center;">Views</th>
              <th style="text-align: center;">Scroll 50%</th>
              <th style="text-align: center;">Leitura</th>
              <th style="text-align: center;">CTA</th>
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
      <div class="card">
        <h2>🏆 Top 5 Artigos</h2>
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th style="text-align: center;">Views</th>
              <th style="text-align: center;">Leitura</th>
            </tr>
          </thead>
          <tbody>
            ${data.topArticles.map(article => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${article.title}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${article.views.toLocaleString()}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${article.readRate}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${data.bottlenecks.length > 0 ? `
      <div class="card">
        <h2>⚠️ Gargalos Identificados</h2>
        ${data.bottlenecks.map(b => `<div class="bottleneck">${b}</div>`).join('')}
      </div>
      ` : ''}

      ${data.recommendations.length > 0 ? `
      <div class="card">
        <h2>💡 Recomendações</h2>
        ${data.recommendations.map(r => `<div class="recommendation">${r}</div>`).join('')}
      </div>
      ` : ''}

      <div class="footer">
        <p>Relatório gerado automaticamente • Powered by Omniseen</p>
      </div>
    </body>
    </html>
  `;
}
