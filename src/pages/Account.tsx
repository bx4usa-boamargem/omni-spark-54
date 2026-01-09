import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBlog } from "@/hooks/useBlog";
import { useTeam } from "@/hooks/useTeam";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Users, Lock, Activity, Settings2 } from "lucide-react";
import { TeamMembersManager } from "@/components/team/TeamMembersManager";
import { CreateTeamMemberDialog } from "@/components/team/CreateTeamMemberDialog";
import { PendingInvites } from "@/components/team/PendingInvites";
import { TeamActivityLog } from "@/components/team/TeamActivityLog";
import { PermissionsMatrix } from "@/components/team/PermissionsMatrix";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Account() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blog, loading: blogLoading } = useBlog();
  const blogId = blog?.id || null;

  const {
    members,
    invites,
    activities,
    loading,
    teamLimit,
    currentUserRole,
    canAddMember,
    updateMemberRole,
    removeMember,
    cancelInvite,
    refresh,
  } = useTeam(blogId);

  if (blogLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!blogId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-muted-foreground mb-4">Nenhum blog encontrado</p>
        <Button onClick={() => navigate("/onboarding")}>Criar blog</Button>
      </div>
    );
  }

  const activeMembers = members.filter(m => m.status === "active").length;
  const pendingCount = invites.length + members.filter(m => m.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-xl font-display font-bold">Administração da Conta</h1>
              <p className="text-sm text-muted-foreground">
                {activeMembers}/{teamLimit} membros • {pendingCount > 0 && `${pendingCount} pendentes`}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <CreateTeamMemberDialog
              blogId={blogId}
              onMemberCreated={refresh}
              canCreate={canAddMember()}
              teamLimit={teamLimit}
              currentCount={activeMembers + invites.length}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipe</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Permissões</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Atividade</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Avançado</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-6">
            <TeamMembersManager
              members={members}
              currentUserId={user?.id || ""}
              currentUserRole={currentUserRole}
              onUpdateRole={updateMemberRole}
              onRemoveMember={removeMember}
              loading={loading}
            />
            <PendingInvites
              invites={invites}
              onCancel={cancelInvite}
              canManage={currentUserRole === "owner" || currentUserRole === "admin"}
            />
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsMatrix />
          </TabsContent>

          <TabsContent value="activity">
            <TeamActivityLog activities={activities} loading={loading} />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notificações</CardTitle>
                <CardDescription>Configure as notificações da equipe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email de novos artigos</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba um email quando um artigo for criado
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email de publicação</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba um email quando um artigo for publicado
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Resumo semanal</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba um resumo semanal de atividades
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preferências de conteúdo</CardTitle>
                <CardDescription>Configurações avançadas de geração</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Aprovação automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Aprovar artigos automaticamente após geração
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Publicação automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Publicar artigos aprovados automaticamente
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
