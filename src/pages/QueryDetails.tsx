import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Lightbulb, FileText, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QueryData {
  query: string;
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  keywords: string[] | null;
}

export default function QueryDetails() {
  const { queryId } = useParams<{ queryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blog, loading: blogLoading } = useBlog();
  const [loading, setLoading] = useState(true);
  const [queryHistory, setQueryHistory] = useState<QueryData[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const queryText = queryId ? decodeURIComponent(queryId) : "";

  const fetchQueryData = useCallback(async () => {
    if (!blog || !queryText) return;

    try {
      setLoading(true);

      // Fetch historical data for this query
      const { data: history, error: historyError } = await supabase
        .from("gsc_queries_history")
        .select("query, date, clicks, impressions, ctr, position")
        .eq("blog_id", blog.id)
        .eq("query", queryText)
        .order("date", { ascending: true });

      if (historyError) throw historyError;
      setQueryHistory(history || []);

      // Fetch related articles (articles that might rank for this query)
      const { data: articles, error: articlesError } = await supabase
        .from("articles")
        .select("id, title, slug, keywords")
        .eq("blog_id", blog.id)
        .eq("status", "published")
        .limit(10);

      if (articlesError) throw articlesError;

      // Filter articles that might be related to this query
      const queryWords = queryText.toLowerCase().split(" ");
      const related = (articles || []).filter((article) => {
        const titleWords = article.title.toLowerCase();
        const keywordMatch = article.keywords?.some((k) =>
          queryWords.some((qw) => k.toLowerCase().includes(qw))
        );
        const titleMatch = queryWords.some((qw) => titleWords.includes(qw));
        return keywordMatch || titleMatch;
      });

      setRelatedArticles(related.slice(0, 5));

      // Generate content suggestions
      const baseSuggestions = [
        `Guia Completo: ${queryText.charAt(0).toUpperCase() + queryText.slice(1)}`,
        `Como ${queryText}: Passo a Passo para Iniciantes`,
        `${queryText.charAt(0).toUpperCase() + queryText.slice(1)}: Tudo o Que Você Precisa Saber`,
        `7 Dicas de ${queryText.charAt(0).toUpperCase() + queryText.slice(1)} para 2025`,
        `${queryText.charAt(0).toUpperCase() + queryText.slice(1)} vs Alternativas: Comparativo`,
      ];
      setSuggestions(baseSuggestions);
    } catch (error) {
      console.error("Error fetching query data:", error);
    } finally {
      setLoading(false);
    }
  }, [blog, queryText]);

  useEffect(() => {
    if (blog && queryText) {
      fetchQueryData();
    } else if (!blogLoading && !blog) {
      setLoading(false);
    }
  }, [blog, blogLoading, queryText, fetchQueryData]);

  if (loading || blogLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const latestData = queryHistory[queryHistory.length - 1];
  const firstData = queryHistory[0];
  const positionChange = firstData && latestData ? firstData.position - latestData.position : 0;

  const chartData = queryHistory.map((d) => ({
    date: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    position: Number(d.position),
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  return (
    <DashboardLayout>
      <div className="container py-8">
        <Button variant="ghost" onClick={() => navigate("/app/performance")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold">"{queryText}"</h1>
            {latestData && (
              <Badge variant="outline" className="text-lg px-3 py-1">
                #{latestData.position.toFixed(0)}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Análise detalhada desta query de pesquisa
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cliques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestData?.clicks?.toLocaleString("pt-BR") || "--"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Impressões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestData?.impressions?.toLocaleString("pt-BR") || "--"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">CTR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestData?.ctr ? `${Number(latestData.ctr).toFixed(2)}%` : "--"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Evolução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {positionChange > 0 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      +{positionChange.toFixed(1)}
                    </span>
                  </>
                ) : positionChange < 0 ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <span className="text-2xl font-bold text-red-500">
                      {positionChange.toFixed(1)}
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold text-muted-foreground">0</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">posições</p>
            </CardContent>
          </Card>
        </div>

        {/* Position Evolution Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Evolução da Posição</CardTitle>
            <CardDescription>
              Histórico de posição no Google para esta query
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis reversed domain={[1, "auto"]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`Posição ${value.toFixed(1)}`, ""]}
                    />
                    <Line
                      type="monotone"
                      dataKey="position"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Dados históricos não disponíveis. Sincronize o GSC diariamente para coletar histórico.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clicks and Impressions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cliques e Impressões</CardTitle>
            <CardDescription>Performance ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorClicksDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      name="Cliques"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorClicksDetail)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Content Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Sugestões de Conteúdo
              </CardTitle>
              <CardDescription>
                Ideias de artigos baseadas nesta query
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium">{suggestion}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigate(`/app/articles/new?title=${encodeURIComponent(suggestion)}&keywords=${encodeURIComponent(queryText)}`)
                      }
                    >
                      Criar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Related Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Artigos Relacionados
              </CardTitle>
              <CardDescription>
                Artigos existentes que podem ser otimizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {relatedArticles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum artigo relacionado encontrado</p>
                  <p className="text-sm">Crie conteúdo para esta query</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedArticles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/app/articles/${article.id}/edit`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{article.title}</p>
                        {article.keywords && article.keywords.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {article.keywords.slice(0, 3).map((kw) => (
                              <Badge key={kw} variant="secondary" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="ghost">
                        Editar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
