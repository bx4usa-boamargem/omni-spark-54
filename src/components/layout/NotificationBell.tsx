import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  opportunity_id: string;
  title: string;
  message: string | null;
  sent_at: string;
  read_at: string | null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { blog } = useBlog();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  useEffect(() => {
    if (!user || !blog) return;

    async function fetchNotifications() {
      const { data } = await supabase
        .from("opportunity_notification_history")
        .select("*")
        .eq("user_id", user!.id)
        .eq("blog_id", blog!.id)
        .eq("notification_type", "in_app")
        .order("sent_at", { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
      }
    }

    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "opportunity_notification_history",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.notification_type === "in_app") {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, blog]);

  const markAsRead = async (id: string) => {
    await supabase
      .from("opportunity_notification_history")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from("opportunity_notification_history")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setOpen(false);
    navigate("/articles?tab=opportunities");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={markAllAsRead}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={cn(
                    "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                    !notification.read_at && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {!notification.read_at && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    )}
                    <div className={cn("flex-1 min-w-0", notification.read_at && "ml-5")}>
                      <p className="font-medium text-sm truncate">
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.sent_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
