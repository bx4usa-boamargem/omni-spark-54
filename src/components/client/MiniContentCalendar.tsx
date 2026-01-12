import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ScheduledItem {
  id: string;
  status: string;
  scheduled_for: string | null;
  suggested_theme: string;
  type: 'queue';
}

interface ArticleItem {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
  scheduled_at: string | null;
  type: 'article';
}

type CalendarItem = ScheduledItem | ArticleItem;

interface MiniContentCalendarProps {
  blogId: string;
  onDayClick?: (date: Date, items: CalendarItem[]) => void;
}

const STATUS_CONFIG = {
  pending: { color: 'bg-warning/60', label: 'Pendente' },
  generating: { color: 'bg-primary/60', label: 'Gerando' },
  scheduled: { color: 'bg-blue-500/60', label: 'Agendado' },
  published: { color: 'bg-success/60', label: 'Publicado' },
  completed: { color: 'bg-success/60', label: 'Publicado' },
  failed: { color: 'bg-destructive/60', label: 'Erro' },
  draft: { color: 'bg-muted-foreground/40', label: 'Rascunho' },
};

export function MiniContentCalendar({ blogId, onDayClick }: MiniContentCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [queueItems, setQueueItems] = useState<ScheduledItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!blogId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch queue items (pending, generating, failed)
        const { data: queueData } = await supabase
          .from('article_queue')
          .select('id, status, scheduled_for, suggested_theme')
          .eq('blog_id', blogId)
          .not('scheduled_for', 'is', null);

        if (queueData) {
          setQueueItems(queueData.map(q => ({ ...q, type: 'queue' as const })));
        }

        // Fetch articles (scheduled, published)
        const { data: articlesData } = await supabase
          .from('articles')
          .select('id, title, status, published_at, scheduled_at')
          .eq('blog_id', blogId)
          .in('status', ['scheduled', 'published']);

        if (articlesData) {
          setArticles(articlesData.map(a => ({ ...a, type: 'article' as const })));
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime updates
    const queueChannel = supabase
      .channel('mini-calendar-queue')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'article_queue',
        filter: `blog_id=eq.${blogId}`,
      }, () => {
        fetchData();
      })
      .subscribe();

    const articlesChannel = supabase
      .channel('mini-calendar-articles')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'articles',
        filter: `blog_id=eq.${blogId}`,
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(articlesChannel);
    };
  }, [blogId]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const emptyDays = Array(startDayOfWeek).fill(null);

  const getItemsForDay = (day: Date): CalendarItem[] => {
    const items: CalendarItem[] = [];

    // Queue items
    queueItems.forEach(item => {
      if (item.scheduled_for && isSameDay(new Date(item.scheduled_for), day)) {
        items.push(item);
      }
    });

    // Articles
    articles.forEach(article => {
      if (article.status === 'published' && article.published_at) {
        if (isSameDay(new Date(article.published_at), day)) {
          items.push(article);
        }
      } else if (article.status === 'scheduled' && article.scheduled_at) {
        if (isSameDay(new Date(article.scheduled_at), day)) {
          items.push(article);
        }
      }
    });

    return items;
  };

  const getStatusColor = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || 'bg-muted';
  };

  const handleDayClick = (day: Date) => {
    const items = getItemsForDay(day);
    if (onDayClick) {
      onDayClick(day, items);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Calendário de Conteúdo
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center capitalize">
              {format(currentMonth, 'MMM yyyy', { locale: ptBR })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs ml-1"
              onClick={() => setCurrentMonth(new Date())}
            >
              Hoje
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const items = getItemsForDay(day);
            const hasItems = items.length > 0;
            const dayIsToday = isToday(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(day)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-colors relative",
                  dayIsToday && "bg-primary/10 font-bold text-primary ring-1 ring-primary/30",
                  !dayIsToday && "hover:bg-muted/50",
                  hasItems && "cursor-pointer"
                )}
              >
                <span>{format(day, 'd')}</span>
                {hasItems && (
                  <div className="flex gap-0.5 mt-0.5">
                    {items.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          getStatusColor(item.status)
                        )}
                      />
                    ))}
                    {items.length > 3 && (
                      <span className="text-[8px] text-muted-foreground">+</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-3 border-t text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning/60" />
            <span className="text-muted-foreground">Pendente</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary/60" />
            <span className="text-muted-foreground">Gerando</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500/60" />
            <span className="text-muted-foreground">Agendado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success/60" />
            <span className="text-muted-foreground">Publicado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive/60" />
            <span className="text-muted-foreground">Erro</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
