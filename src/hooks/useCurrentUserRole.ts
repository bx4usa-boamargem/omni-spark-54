import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeamRole } from "./useTeam";
import { Permission } from "./useTeamPermissions";

interface CurrentUserRoleResult {
  role: TeamRole | null;
  blogId: string | null;
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  hasPermission: (permission: Permission) => boolean;
}

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

export function useCurrentUserRole(): CurrentUserRoleResult {
  const [role, setRole] = useState<TeamRole | null>(null);
  const [blogId, setBlogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // First check if user owns a blog
      const { data: ownedBlog } = await supabase
        .from("blogs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedBlog) {
        setBlogId(ownedBlog.id);
        setRole("owner");
        setLoading(false);
        return;
      }

      // Check team membership
      const { data: membership } = await supabase
        .from("team_members")
        .select("blog_id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membership) {
        setBlogId(membership.blog_id);
        setRole(membership.role as TeamRole);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
  };

  return {
    role,
    blogId,
    loading,
    isOwner: role === "owner",
    isAdmin: role === "admin",
    isEditor: role === "editor",
    isViewer: role === "viewer",
    hasPermission,
  };
}
