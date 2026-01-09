import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TeamActivity } from "@/hooks/useTeam";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, UserPlus, UserMinus, Shield, FileText, Settings, Eye } from "lucide-react";

interface TeamActivityLogProps {
  activities: TeamActivity[];
  loading?: boolean;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  member_invited: UserPlus,
  member_removed: UserMinus,
  role_changed: Shield,
  article_created: FileText,
  article_published: FileText,
  settings_updated: Settings,
  default: Activity,
};

const ACTION_LABELS: Record<string, string> = {
  member_invited: "convidou",
  member_removed: "removeu",
  role_changed: "alterou permissão de",
  invite_cancelled: "cancelou convite para",
  article_created: "criou artigo",
  article_published: "publicou artigo",
  article_updated: "editou artigo",
  settings_updated: "atualizou configurações",
};

function getActionDescription(activity: TeamActivity): string {
  const action = ACTION_LABELS[activity.action] || activity.action;
  const details = activity.details as Record<string, string>;
  
  if (activity.action === "member_invited" && details.email) {
    return `${action} ${details.email}`;
  }
  
  if (activity.action === "role_changed" && details.new_role) {
    return `${action} para ${details.new_role}`;
  }

  if (details.title) {
    return `${action} "${details.title}"`;
  }

  return action;
}

function groupActivitiesByDate(activities: TeamActivity[]) {
  const groups: { label: string; activities: TeamActivity[] }[] = [];
  let currentGroup: { label: string; activities: TeamActivity[] } | null = null;

  for (const activity of activities) {
    const date = new Date(activity.created_at);
    let label: string;

    if (isToday(date)) {
      label = "Hoje";
    } else if (isYesterday(date)) {
      label = "Ontem";
    } else {
      label = format(date, "dd 'de' MMMM", { locale: ptBR });
    }

    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, activities: [] };
      groups.push(currentGroup);
    }

    currentGroup.activities.push(activity);
  }

  return groups;
}

export function TeamActivityLog({ activities, loading }: TeamActivityLogProps) {
  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Atividade recente
        </CardTitle>
        <CardDescription>
          Histórico de ações da equipe
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma atividade registrada</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {groupedActivities.map((group) => (
                <div key={group.label}>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-card py-1">
                    {group.label}
                  </h4>
                  <div className="space-y-3">
                    {group.activities.map((activity) => {
                      const Icon = ACTION_ICONS[activity.action] || ACTION_ICONS.default;
                      
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 text-sm"
                        >
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground">
                              <span className="font-medium">{activity.user_name}</span>{" "}
                              {getActionDescription(activity)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(activity.created_at), "HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
