import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, TrendingUp, TrendingDown, Lightbulb, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface Persona {
  id: string;
  name: string;
  description: string | null;
}

interface ArticleWithMetrics {
  id: string;
  title: string;
  status: string;
  view_count: number;
  funnel_stage: string | null;
  published_at: string | null;
  target_persona_id?: string | null;
  metrics: {
    readRate: number;
    scroll50: number;
    ctaRate: number;
  };
}

interface FunnelPersonaComparisonProps {
  blogId: string;
  articles: ArticleWithMetrics[];
}

interface PersonaMetrics {
  persona: Persona;
  topViews: number;
  middleViews: number;
  bottomViews: number;
  topToMiddle: number;
  middleToBottom: number;
  avgReadRate: number;
  avgCtaRate: number;
  totalArticles: number;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142.1 76.2% 36.3%)",
  "hsl(38 92% 50%)",
];

export function FunnelPersonaComparison({ blogId, articles }: FunnelPersonaComparisonProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [articlesWithPersona, setArticlesWithPersona] = useState<ArticleWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [blogId]);

  async function fetchData() {
    // Fetch personas
    const { data: personasData } = await supabase
      .from("personas")
      .select("id, name, description")
      .eq("blog_id", blogId);

    if (personasData) {
      setPersonas(personasData);
      // Auto-select first 3 personas
      setSelectedPersonas(personasData.slice(0, 3).map(p => p.id));
    }

    // Fetch articles with persona info
    const { data: articlesData } = await supabase
      .from("articles")
      .select("id, title, status, view_count, funnel_stage, published_at, target_persona_id")
      .eq("blog_id", blogId)
      .eq("generation_source", "sales_funnel")
      .not("target_persona_id", "is", null);

    if (articlesData) {
      // Merge with existing metrics from parent
      const merged = articlesData.map(a => {
        const existing = articles.find(e => e.id === a.id);
        return {
          ...a,
          metrics: existing?.metrics || { readRate: 0, scroll50: 0, ctaRate: 0 }
        };
      });
      setArticlesWithPersona(merged);
    }

    setLoading(false);
  }

  const togglePersona = (personaId: string) => {
    setSelectedPersonas(prev => {
      if (prev.includes(personaId)) {
        return prev.filter(id => id !== personaId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), personaId];
      }
      return [...prev, personaId];
    });
  };

  // Calculate metrics per persona
  const personaMetrics: PersonaMetrics[] = selectedPersonas.map(personaId => {
    const persona = personas.find(p => p.id === personaId);
    if (!persona) return null;

    const personaArticles = articlesWithPersona.filter(a => a.target_persona_id === personaId);
    const topArticles = personaArticles.filter(a => a.funnel_stage === "top");
    const middleArticles = personaArticles.filter(a => a.funnel_stage === "middle");
    const bottomArticles = personaArticles.filter(a => a.funnel_stage === "bottom");

    const topViews = topArticles.reduce((sum, a) => sum + a.view_count, 0);
    const middleViews = middleArticles.reduce((sum, a) => sum + a.view_count, 0);
    const bottomViews = bottomArticles.reduce((sum, a) => sum + a.view_count, 0);

    const topToMiddle = topViews > 0 ? Math.round((middleViews / topViews) * 100) : 0;
    const middleToBottom = middleViews > 0 ? Math.round((bottomViews / middleViews) * 100) : 0;

    const avgReadRate = personaArticles.length > 0
      ? Math.round(personaArticles.reduce((sum, a) => sum + a.metrics.readRate, 0) / personaArticles.length)
      : 0;
    const avgCtaRate = personaArticles.length > 0
      ? Math.round(personaArticles.reduce((sum, a) => sum + a.metrics.ctaRate, 0) / personaArticles.length)
      : 0;

    return {
      persona,
      topViews,
      middleViews,
      bottomViews,
      topToMiddle,
      middleToBottom,
      avgReadRate,
      avgCtaRate,
      totalArticles: personaArticles.length,
    };
  }).filter(Boolean) as PersonaMetrics[];

  // Prepare chart data
  const chartData = [
    {
      stage: "Topo",
      ...Object.fromEntries(personaMetrics.map((pm, i) => [pm.persona.name, pm.topViews])),
    },
    {
      stage: "Meio",
      ...Object.fromEntries(personaMetrics.map((pm, i) => [pm.persona.name, pm.middleViews])),
    },
    {
      stage: "Fundo",
      ...Object.fromEntries(personaMetrics.map((pm, i) => [pm.persona.name, pm.bottomViews])),
    },
  ];

  // Generate insights
  const insights: string[] = [];
  if (personaMetrics.length >= 2) {
    const bestConversion = personaMetrics.reduce((best, curr) => 
      (curr.topToMiddle + curr.middleToBottom) > (best.topToMiddle + best.middleToBottom) ? curr : best
    );
    const worstConversion = personaMetrics.reduce((worst, curr) => 
      (curr.topToMiddle + curr.middleToBottom) < (worst.topToMiddle + worst.middleToBottom) ? curr : worst
    );

    if (bestConversion.persona.id !== worstConversion.persona.id) {
      insights.push(`${bestConversion.persona.name} tem a melhor conversão geral (${bestConversion.topToMiddle + bestConversion.middleToBottom}% vs ${worstConversion.topToMiddle + worstConversion.middleToBottom}% de ${worstConversion.persona.name})`);
    }

    personaMetrics.forEach(pm => {
      if (pm.topToMiddle < 30 && pm.topViews > 0) {
        insights.push(`${pm.persona.name} apresenta queda significativa do Topo para o Meio (${pm.topToMiddle}%)`);
      }
      if (pm.middleToBottom < 20 && pm.middleViews > 0) {
        insights.push(`${pm.persona.name} tem baixa conversão do Meio para o Fundo (${pm.middleToBottom}%)`);
      }
    });
  }

  if (personas.length === 0 || articlesWithPersona.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Comparativo por Persona
          </CardTitle>
          <CardDescription>
            Para usar este recurso, associe artigos a personas ao criá-los pelo funil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum artigo associado a personas ainda. Ao criar novos artigos pelo funil, 
            selecione uma persona para habilitar comparativos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Comparativo por Persona
            </CardTitle>
            <CardDescription>
              Compare a performance do funil entre diferentes públicos-alvo
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Persona Selector */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground mr-2 self-center">Selecionar personas:</span>
          {personas.map((persona, idx) => (
            <button
              key={persona.id}
              onClick={() => togglePersona(persona.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all border ${
                selectedPersonas.includes(persona.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {persona.name}
              {selectedPersonas.includes(persona.id) && " ✓"}
            </button>
          ))}
        </div>

        {/* Bar Chart */}
        {personaMetrics.length > 0 && (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="stage" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                {personaMetrics.map((pm, idx) => (
                  <Bar
                    key={pm.persona.id}
                    dataKey={pm.persona.name}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Conversion Rates per Persona */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {personaMetrics.map((pm, idx) => (
            <Card key={pm.persona.id} className="border-2" style={{ borderColor: CHART_COLORS[idx % CHART_COLORS.length] + "40" }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  <span className="font-semibold">{pm.persona.name}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {pm.totalArticles} artigos
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Topo → Meio:</span>
                    <span className={`font-medium ${pm.topToMiddle > 40 ? "text-green-600" : pm.topToMiddle < 25 ? "text-red-500" : ""}`}>
                      {pm.topToMiddle}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meio → Fundo:</span>
                    <span className={`font-medium ${pm.middleToBottom > 30 ? "text-green-600" : pm.middleToBottom < 15 ? "text-red-500" : ""}`}>
                      {pm.middleToBottom}%
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leitura completa:</span>
                      <span className="font-medium">{pm.avgReadRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa de CTA:</span>
                      <span className="font-medium">{pm.avgCtaRate}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Insights</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {insights.map((insight, idx) => (
                  <li key={idx} className="text-sm">{insight}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
