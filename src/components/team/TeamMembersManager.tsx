import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TeamMember, TeamRole } from "@/hooks/useTeam";
import { TeamRoleBadge } from "./TeamRoleBadge";
import { ROLE_LABELS } from "@/hooks/useTeamPermissions";
import { MoreHorizontal, Crown, Shield, Edit3, Eye, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TeamMembersManagerProps {
  members: TeamMember[];
  currentUserId: string;
  currentUserRole: TeamRole | null;
  onUpdateRole: (memberId: string, newRole: TeamRole) => Promise<{ error?: string }>;
  onRemoveMember: (memberId: string) => Promise<{ error?: string }>;
  loading?: boolean;
}

export function TeamMembersManager({
  members,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onRemoveMember,
  loading = false,
}: TeamMembersManagerProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);

  const canManage = currentUserRole === "owner" || currentUserRole === "admin";

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    const result = await onUpdateRole(memberId, newRole);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Permissão atualizada");
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;

    setRemovingId(confirmRemove.id);
    const result = await onRemoveMember(confirmRemove.id);
    setRemovingId(null);
    setConfirmRemove(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Membro removido da equipe");
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const availableRoles: { role: TeamRole; icon: React.ElementType }[] = [
    { role: "admin", icon: Shield },
    { role: "editor", icon: Edit3 },
    { role: "viewer", icon: Eye },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Membros da equipe</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "membro" : "membros"} na equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const isOwner = member.role === "owner";
              const canModify = canManage && !isOwner && !isCurrentUser;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(member.profile?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.profile?.full_name || "Usuário"}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground">(você)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <TeamRoleBadge role={member.role} size="sm" />
                        {member.status === "pending" && (
                          <span className="text-xs text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canModify && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {availableRoles.map(({ role, icon: Icon }) => (
                          <DropdownMenuItem
                            key={role}
                            onClick={() => handleRoleChange(member.id, role)}
                            disabled={member.role === role}
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            Alterar para {ROLE_LABELS[role]}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setConfirmRemove(member)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover da equipe
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {isOwner && (
                    <Crown className="h-5 w-5 text-amber-500" />
                  )}
                </div>
              );
            })}

            {members.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum membro na equipe ainda
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {confirmRemove?.profile?.full_name || "este membro"} da equipe? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removingId === confirmRemove?.id}
            >
              {removingId === confirmRemove?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
