import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText, Loader2, Plus, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ScheduledArticle {
  id: string;
  status: string;
  scheduled_for: string | null;
  suggested_theme: string;
}

interface PublishedArticle {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
}

export default function Calendar() {
  const { user } = useAuth();
  const { blog, loading: blogLoading } = useBlog();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [queueItems, setQueueItems] = useState<ScheduledArticle[]>([]);
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [unscheduledItems, setUnscheduledItems] = useState<ScheduledArticle[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !blog) return;

      try {
        // Fetch queue items (scheduled)
        const { data: queueData } = await supabase
          .from("article_queue")
          .select("*")
          .eq("blog_id", blog.id)
          .order("scheduled_for", { ascending: true });

        if (queueData) {
          const scheduled = queueData.filter((item) => item.scheduled_for);
          const unscheduled = queueData.filter((item) => !item.scheduled_for);
          setQueueItems(scheduled as ScheduledArticle[]);
          setUnscheduledItems(unscheduled as ScheduledArticle[]);
        }

        // Fetch published and scheduled articles
        const { data: articlesData } = await supabase
          .from("articles")
          .select("id, title, status, published_at, scheduled_at, created_at")
          .eq("blog_id", blog.id)
          .in("status", ["published", "scheduled"])
          .order("published_at", { ascending: false });

        if (articlesData) {
          setArticles(articlesData as PublishedArticle[]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (blog) {
      fetchData();
    } else if (!blogLoading) {
      setLoading(false);
    }
  }, [user, blog, blogLoading]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week offset
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const getItemsForDay = (day: Date) => {
    const scheduled = queueItems.filter((item) => {
      if (!item.scheduled_for) return false;
      return isSameDay(new Date(item.scheduled_for), day);
    });

    const published = articles.filter((article) => {
      if (article.status === "published" && article.published_at) {
        return isSameDay(new Date(article.published_at), day);
      }
      if (article.status === "scheduled" && article.scheduled_at) {
        return isSameDay(new Date(article.scheduled_at), day);
      }
      return false;
    });

    return { scheduled, published };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/20 text-warning border-warning/30";
      case "generating":
        return "bg-primary/20 text-primary border-primary/30";
      case "scheduled":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "completed":
      case "published":
        return "bg-success/20 text-success border-success/30";
      case "failed":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading || blogLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Calendário de Conteúdo</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie a programação dos seus artigos.
            </p>
          </div>
          <Button onClick={() => navigate("/articles/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Artigo
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <CardTitle className="text-xl capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  Hoje
                </Button>
              </CardHeader>
              <CardContent>
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {emptyDays.map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square p-1" />
                  ))}
                  {days.map((day) => {
                    const { scheduled, published } = getItemsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const hasItems = scheduled.length > 0 || published.length > 0;

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "aspect-square p-1 border rounded-lg transition-colors",
                          isToday && "border-primary bg-primary/5",
                          !isToday && "border-border/50 hover:border-border",
                          hasItems && "cursor-pointer"
                        )}
                      >
                        <div className="h-full flex flex-col">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isToday && "text-primary",
                              !isSameMonth(day, currentMonth) && "text-muted-foreground/50"
                            )}
                          >
                            {format(day, "d")}
                          </span>
                          <div className="flex-1 space-y-0.5 overflow-hidden">
                            {scheduled.slice(0, 2).map((item) => (
                              <div
                                key={item.id}
                                className={cn(
                                  "text-[10px] px-1 py-0.5 rounded truncate border",
                                  getStatusColor(item.status)
                                )}
                                title={item.suggested_theme}
                              >
                                {item.suggested_theme}
                              </div>
                            ))}
                            {published.slice(0, 2).map((article) => (
                              <div
                                key={article.id}
                                className="text-[10px] px-1 py-0.5 rounded truncate bg-success/20 text-success border border-success/30"
                                title={article.title}
                              >
                                {article.title}
                              </div>
                            ))}
                            {(scheduled.length + published.length) > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{scheduled.length + published.length - 2} mais
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Unscheduled Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Sem data
                </CardTitle>
                <CardDescription className="text-sm">
                  Conteúdos aguardando agendamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unscheduledItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum conteúdo pendente
                  </p>
                ) : (
                  <div className="space-y-2">
                    {unscheduledItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <p className="text-sm font-medium truncate">{item.suggested_theme}</p>
                        <Badge variant="outline" className={cn("text-xs mt-1", getStatusColor(item.status))}>
                          {item.status === "pending" ? "Pendente" : item.status === "generating" ? "Gerando" : item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Legenda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-warning/50" />
                  <span className="text-sm">Pendente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary/50" />
                  <span className="text-sm">Gerando</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500/50" />
                  <span className="text-sm">Agendado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-success/50" />
                  <span className="text-sm">Publicado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-destructive/50" />
                  <span className="text-sm">Erro</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
