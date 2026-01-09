import { TeamRole } from "./useTeam";

export type Permission = 
  | "articles.create"
  | "articles.edit"
  | "articles.delete"
  | "articles.read"
  | "articles.publish"
  | "analytics.view"
  | "blog.settings"
  | "team.manage"
  | "billing.access";

const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [
    "articles.create",
    "articles.edit",
    "articles.delete",
    "articles.read",
    "articles.publish",
    "analytics.view",
    "blog.settings",
    "team.manage",
    "billing.access",
  ],
  admin: [
    "articles.create",
    "articles.edit",
    "articles.delete",
    "articles.read",
    "articles.publish",
    "analytics.view",
    "blog.settings",
    "team.manage",
  ],
  editor: [
    "articles.create",
    "articles.edit",
    "articles.delete",
    "articles.read",
    "articles.publish",
    "analytics.view",
  ],
  viewer: [
    "articles.read",
    "analytics.view",
  ],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  "articles.create": "Criar artigos",
  "articles.edit": "Editar artigos",
  "articles.delete": "Excluir artigos",
  "articles.read": "Ver artigos",
  "articles.publish": "Publicar artigos",
  "analytics.view": "Ver analytics",
  "blog.settings": "Configurar blog",
  "team.manage": "Gerenciar equipe",
  "billing.access": "Acessar faturamento",
};

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Acesso total, incluindo faturamento",
  admin: "Gerencia equipe e configurações",
  editor: "Cria e publica conteúdo",
  viewer: "Apenas visualização",
};

export function useTeamPermissions(role: TeamRole | null) {
  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  };

  const canManageTeam = (): boolean => hasPermission("team.manage");
  const canEditContent = (): boolean => hasPermission("articles.edit");
  const canPublish = (): boolean => hasPermission("articles.publish");
  const canAccessBilling = (): boolean => hasPermission("billing.access");
  const canConfigureBlog = (): boolean => hasPermission("blog.settings");

  const getPermissionsForRole = (targetRole: TeamRole): Permission[] => {
    return ROLE_PERMISSIONS[targetRole] || [];
  };

  const getAllPermissions = (): Permission[] => {
    return Object.keys(PERMISSION_LABELS) as Permission[];
  };

  return {
    hasPermission,
    canManageTeam,
    canEditContent,
    canPublish,
    canAccessBilling,
    canConfigureBlog,
    getPermissionsForRole,
    getAllPermissions,
    rolePermissions: ROLE_PERMISSIONS,
    permissionLabels: PERMISSION_LABELS,
    roleLabels: ROLE_LABELS,
    roleDescriptions: ROLE_DESCRIPTIONS,
  };
}
