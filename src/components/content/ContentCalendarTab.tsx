import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Check, 
  FileEdit, 
  Sparkles, 
  Target, 
  Youtube, 
  Instagram, 
  FileText, 
  PenLine,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";


interface ContentCalendarTabProps {
  blogId: string;
}

interface ScheduledArticle {
  id: string;
  status: string;
  scheduled_for: string | null;
  suggested_theme: string;
}

interface Article {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  generation_source: string | null;
}

export function ContentCalendarTab({ blogId }: ContentCalendarTabProps) {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [queueItems, setQueueItems] = useState<ScheduledArticle[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [unscheduledItems, setUnscheduledItems] = useState<ScheduledArticle[]>([]);
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [showDrafts, setShowDrafts] = useState(true);
  const [showPublished, setShowPublished] = useState(true);

  // Filter states
  const allFilters = ["published", "scheduled", "draft", "pending"];
  const [activeFilters, setActiveFilters] = useState<string[]>(allFilters);
  const hasInactiveFilters = activeFilters.length < allFilters.length;

  const toggleFilter = (status: string) => {
    setActiveFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => setActiveFilters(allFilters);

  // Filter draft articles
  const draftArticles = articles.filter(a => a.status === "draft");

  // Filter recently published articles (last 7 days)
  const recentlyPublished = articles.filter(a => {
    if (a.status !== "published" || !a.published_at) return false;
    const publishDate = new Date(a.published_at);
    const sevenDaysAgo = subDays(new Date(), 7);
    return publishDate >= sevenDaysAgo;
  });

  // Filter articles and queue items without date
  const unscheduledArticles = articles.filter(a => 
    !a.published_at && !a.scheduled_at && a.status !== "draft"
  );
  const allUnscheduledContent = [
    ...unscheduledItems.map(item => ({ type: "queue" as const, ...item })),
    ...unscheduledArticles.map(article => ({ type: "article" as const, ...article }))
  ];

  useEffect(() => {
    async function fetchData() {
      if (!blogId) return;

      // Fetch queue items (scheduled)
      const { data: queueData } = await supabase
        .from("article_queue")
        .select("*")
        .eq("blog_id", blogId)
        .order("scheduled_for", { ascending: true });

      if (queueData) {
        const scheduled = queueData.filter((item) => item.scheduled_for);
        const unscheduled = queueData.filter((item) => !item.scheduled_for);
        setQueueItems(scheduled as ScheduledArticle[]);
        setUnscheduledItems(unscheduled as ScheduledArticle[]);
      }

      // Fetch all articles with generation_source
      const { data: articlesData } = await supabase
        .from("articles")
        .select("id, title, status, published_at, scheduled_at, created_at, generation_source")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      if (articlesData) {
        setArticles(articlesData as Article[]);
      }
    }

    fetchData();
  }, [blogId]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const getItemsForDay = (day: Date) => {
    const scheduled = queueItems.filter((item) => {
      if (!item.scheduled_for) return false;
      // Check if pending filter is active
      if (!activeFilters.includes("pending") && (item.status === "pending" || item.status === "generating")) return false;
      return isSameDay(new Date(item.scheduled_for), day);
    });

    const dayArticles = articles.filter((article) => {
      // Check if status filter is active
      if (!activeFilters.includes(article.status)) return false;
      
      if (article.status === "published" && article.published_at) {
        return isSameDay(new Date(article.published_at), day);
      }
      if (article.status === "scheduled" && article.scheduled_at) {
        return isSameDay(new Date(article.scheduled_at), day);
      }
      // Show drafts by creation date
      if (article.status === "draft") {
        return isSameDay(new Date(article.created_at), day);
      }
      return false;
    });

    return { scheduled, articles: dayArticles };
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/20 text-warning-foreground border-warning/30";
      case "generating":
        return "bg-primary/20 text-primary border-primary/30";
      case "scheduled":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "published":
        return "bg-success/20 text-success border-success/30";
      case "draft":
        return "bg-muted text-muted-foreground border-border";
      case "failed":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSourceIcon = (source: string | null) => {
    switch (source) {
      case "ai_suggestion":
        return <Sparkles className="h-3 w-3 text-primary" />;
      case "sales_funnel":
        return <Target className="h-3 w-3 text-orange-500" />;
      case "youtube":
        return <Youtube className="h-3 w-3 text-red-500" />;
      case "instagram":
        return <Instagram className="h-3 w-3 text-pink-500" />;
      case "pdf":
      case "csv":
        return <FileText className="h-3 w-3 text-blue-500" />;
      case "manual":
        return <PenLine className="h-3 w-3 text-muted-foreground" />;
      default:
        return <FileEdit className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getArticleTime = (article: Article) => {
    const dateStr = article.scheduled_at || article.published_at || article.created_at;
    if (!dateStr) return null;
    return format(new Date(dateStr), "HH:mm");
  };

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <Card>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-semibold capitalize min-w-[180px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Hoje
            </Button>
          </div>
          
          {/* Interactive Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {hasInactiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
            <button
              onClick={() => toggleFilter("published")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all",
                activeFilters.includes("published")
                  ? "bg-success/20 border-success/50 text-success"
                  : "bg-muted/30 border-dashed border-muted-foreground/30 text-muted-foreground opacity-50"
              )}
            >
              <div className="w-2 h-2 rounded-full bg-success" />
              Publicado
            </button>
            <button
              onClick={() => toggleFilter("scheduled")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all",
                activeFilters.includes("scheduled")
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-600"
                  : "bg-muted/30 border-dashed border-muted-foreground/30 text-muted-foreground opacity-50"
              )}
            >
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Agendado
            </button>
            <button
              onClick={() => toggleFilter("pending")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all",
                activeFilters.includes("pending")
                  ? "bg-warning/20 border-warning/50 text-warning"
                  : "bg-muted/30 border-dashed border-muted-foreground/30 text-muted-foreground opacity-50"
              )}
            >
              <div className="w-2 h-2 rounded-full bg-warning" />
              Pendente
            </button>
            <button
              onClick={() => toggleFilter("draft")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all",
                activeFilters.includes("draft")
                  ? "bg-muted border-muted-foreground/50 text-muted-foreground"
                  : "bg-muted/30 border-dashed border-muted-foreground/30 text-muted-foreground opacity-50"
              )}
            >
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              Rascunho
            </button>
          </div>
        </div>

        <CardContent className="p-4">
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
              <div key={`empty-${i}`} className="min-h-[120px] p-1" />
            ))}
            {days.map((day) => {
              const { scheduled, articles: dayArticles } = getItemsForDay(day);
              const isToday = isSameDay(day, new Date());
              const allItems = [...dayArticles, ...scheduled.map(s => ({ 
                id: s.id, 
                title: s.suggested_theme, 
                status: s.status,
                isQueue: true 
              }))];

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[120px] p-2 border rounded-lg transition-colors flex flex-col",
                    isToday && "border-primary border-2 bg-primary/5",
                    !isToday && "border-border/50 hover:border-border"
                  )}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                        isToday && "bg-primary text-primary-foreground",
                        !isSameMonth(day, currentMonth) && "text-muted-foreground/50"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Articles */}
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    {dayArticles.slice(0, 3).map((article) => (
                      <div
                        key={article.id}
                        onClick={() => navigate(`/app/articles/${article.id}/edit`)}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity",
                          getStatusStyles(article.status)
                        )}
                      >
                        {/* Time and Source Icon */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="flex items-center gap-1 text-[10px] opacity-70">
                            <Clock className="h-2.5 w-2.5" />
                            {getArticleTime(article)}
                          </span>
                          {getSourceIcon(article.generation_source)}
                          {article.status === "published" && <Check className="h-3 w-3 text-success ml-auto" />}
                        </div>
                        {/* Title */}
                        <p className="text-xs font-medium line-clamp-2 leading-tight">
                          {article.title}
                        </p>
                      </div>
                    ))}
                    
                    {/* Scheduled queue items */}
                    {scheduled.slice(0, Math.max(0, 3 - dayArticles.length)).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toast.info("Este tema ainda precisa ser gerado. Clique em 'Gerar' na fila.")}
                        className={cn(
                          "p-2 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity",
                          getStatusStyles(item.status)
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="flex items-center gap-1 text-[10px] opacity-70">
                            <Clock className="h-2.5 w-2.5" />
                            {item.scheduled_for ? format(new Date(item.scheduled_for), "HH:mm") : "--:--"}
                          </span>
                          <Sparkles className="h-3 w-3 text-primary" />
                        </div>
                        <p className="text-xs font-medium line-clamp-2 leading-tight">
                          {item.suggested_theme}
                        </p>
                      </div>
                    ))}

                    {/* More items indicator */}
                    {allItems.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">
                        +{allItems.length - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Rascunhos Recentes */}
      <Collapsible open={showDrafts} onOpenChange={setShowDrafts}>
        <Card>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Rascunhos Recentes</span>
                {draftArticles.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {draftArticles.length}
                  </Badge>
                )}
              </div>
              {showDrafts ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {draftArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum rascunho pendente
                </p>
              ) : (
                draftArticles.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => navigate(`/app/articles/${draft.id}/edit`)}
                    className="p-3 rounded-lg border bg-muted/30 hover:bg-muted cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{draft.title}</p>
                        <span className="text-xs text-muted-foreground">
                          Criado em {format(new Date(draft.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {getSourceIcon(draft.generation_source)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Publicados Recentemente */}
      <Collapsible open={showPublished} onOpenChange={setShowPublished}>
        <Card>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-success" />
                <span className="font-medium">Publicados Recentemente</span>
                {recentlyPublished.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-success/20 text-success">
                    {recentlyPublished.length}
                  </Badge>
                )}
              </div>
              {showPublished ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {recentlyPublished.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum artigo publicado nos últimos 7 dias
                </p>
              ) : (
                recentlyPublished.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => navigate(`/app/articles/${article.id}/edit`)}
                    className="p-3 rounded-lg border bg-success/10 border-success/30 hover:bg-success/20 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{article.title}</p>
                        <span className="text-xs text-muted-foreground">
                          Publicado em {format(new Date(article.published_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSourceIcon(article.generation_source)}
                        <Check className="h-4 w-4 text-success" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Unscheduled Items Footer */}
      <Collapsible open={showUnscheduled} onOpenChange={setShowUnscheduled}>
        <Card>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Conteúdos sem data</span>
                {allUnscheduledContent.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {allUnscheduledContent.length}
                  </Badge>
                )}
              </div>
              {showUnscheduled ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4">
              {allUnscheduledContent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum conteúdo pendente de agendamento
                </p>
              ) : (
                <div className="space-y-2">
                  {allUnscheduledContent.map((item) => (
                    item.type === "queue" ? (
                      <div
                        key={`queue-${item.id}`}
                        onClick={() => toast.info("Agende este conteúdo para gerar automaticamente.")}
                        className={cn(
                          "p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-2",
                          getStatusStyles(item.status)
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm flex-1">{item.suggested_theme}</span>
                        <Badge variant="outline" className="text-[10px]">Na fila</Badge>
                      </div>
                    ) : (
                      <div
                        key={`article-${item.id}`}
                        onClick={() => navigate(`/app/articles/${item.id}/edit`)}
                        className="p-3 rounded-lg border bg-muted/30 hover:bg-muted cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.title}</p>
                            <span className="text-xs text-muted-foreground">
                              Criado em {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSourceIcon(item.generation_source)}
                            <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
