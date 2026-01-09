import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeamInvite } from "@/hooks/useTeam";
import { TeamRoleBadge } from "./TeamRoleBadge";
import { Mail, X, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PendingInvitesProps {
  invites: TeamInvite[];
  onCancel: (inviteId: string) => Promise<{ error?: string }>;
  canManage: boolean;
}

export function PendingInvites({ invites, onCancel, canManage }: PendingInvitesProps) {
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const handleCancel = async (inviteId: string) => {
    setCancelingId(inviteId);
    const result = await onCancel(inviteId);
    setCancelingId(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Convite cancelado");
    }
  };

  if (invites.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Convites pendentes
        </CardTitle>
        <CardDescription>
          {invites.length} {invites.length === 1 ? "convite aguardando" : "convites aguardando"} resposta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TeamRoleBadge role={invite.role} size="sm" />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expira {formatDistanceToNow(new Date(invite.expires_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleCancel(invite.id)}
                  disabled={cancelingId === invite.id}
                >
                  {cancelingId === invite.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
