import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TeamRole = "owner" | "admin" | "editor" | "viewer";
export type TeamMemberStatus = "pending" | "active" | "revoked";

export interface TeamMember {
  id: string;
  blog_id: string;
  user_id: string;
  invited_by: string | null;
  role: TeamRole;
  status: TeamMemberStatus;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

export interface TeamInvite {
  id: string;
  blog_id: string;
  email: string;
  role: TeamRole;
  invited_by: string | null;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface TeamActivity {
  id: string;
  blog_id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  user_name?: string;
}

interface PlanLimits {
  team_members: number;
}

export function useTeam(blogId: string | null) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamLimit, setTeamLimit] = useState(1);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);

  useEffect(() => {
    if (blogId) {
      fetchTeamData();
      fetchPlanLimits();
    }
  }, [blogId]);

  const fetchTeamData = async () => {
    if (!blogId) return;
    setLoading(true);

    try {
      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;

      // Fetch profiles for members
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const enrichedMembers: TeamMember[] = (membersData || []).map(m => ({
        ...m,
        role: m.role as TeamRole,
        status: m.status as TeamMemberStatus,
        profile: profilesMap.get(m.user_id) || undefined,
      }));

      setMembers(enrichedMembers);

      // Check current user's role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // First check if user is blog owner
        const { data: blog } = await supabase
          .from("blogs")
          .select("user_id")
          .eq("id", blogId)
          .single();

        if (blog?.user_id === user.id) {
          setCurrentUserRole("owner");
        } else {
          const currentMember = enrichedMembers.find(m => m.user_id === user.id);
          setCurrentUserRole(currentMember?.role || null);
        }
      }

      // Fetch pending invites
      const { data: invitesData, error: invitesError } = await supabase
        .from("team_invites")
        .select("*")
        .eq("blog_id", blogId)
        .gte("expires_at", new Date().toISOString());

      if (invitesError) throw invitesError;
      setInvites((invitesData || []).map(i => ({
        ...i,
        role: i.role as TeamRole,
      })));

      // Fetch recent activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("team_activity_log")
        .select("*")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (activitiesError) throw activitiesError;

      // Enrich activities with user names
      const activityUserIds = [...new Set(activitiesData?.map(a => a.user_id).filter(Boolean) || [])];
      const { data: activityProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", activityUserIds);

      const activityProfilesMap = new Map(activityProfiles?.map(p => [p.user_id, p.full_name]) || []);

      setActivities((activitiesData || []).map(a => ({
        ...a,
        details: (a.details as Record<string, unknown>) || {},
        user_name: a.user_id ? activityProfilesMap.get(a.user_id) || "Usuário" : "Sistema",
      })));

    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlanLimits = async () => {
    if (!blogId) return;

    try {
      // Get blog owner
      const { data: blog } = await supabase
        .from("blogs")
        .select("user_id")
        .eq("id", blogId)
        .single();

      if (!blog) return;

      // Get subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("user_id", blog.user_id)
        .single();

      const plan = subscription?.plan || "free";

      // Get plan limits
      const { data: limits } = await supabase
        .from("plan_limits")
        .select("team_members")
        .eq("plan", plan)
        .single();

      setTeamLimit((limits as PlanLimits)?.team_members || 1);
    } catch (error) {
      console.error("Error fetching plan limits:", error);
    }
  };

  const canAddMember = () => {
    const activeMembers = members.filter(m => m.status === "active").length;
    const pendingInvites = invites.length;
    return (activeMembers + pendingInvites) < teamLimit;
  };

  const inviteMember = async (email: string, role: TeamRole) => {
    if (!blogId) return { error: "Blog não encontrado" };
    if (!canAddMember()) return { error: "Limite de membros atingido" };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Usuário não autenticado" };

    // Check if invite already exists
    const { data: existingInvite } = await supabase
      .from("team_invites")
      .select("id")
      .eq("blog_id", blogId)
      .eq("email", email)
      .maybeSingle();

    if (existingInvite) {
      return { error: "Já existe um convite pendente para este email" };
    }

    // Create invite token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { error } = await supabase.from("team_invites").insert({
      blog_id: blogId,
      email,
      role,
      invited_by: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    if (error) return { error: error.message };

    // Log activity
    await logActivity("member_invited", "team_member", null, { email, role });
    await fetchTeamData();

    // Generate invite link
    const inviteLink = `${window.location.origin}/invite/accept?token=${token}`;

    return { success: true, inviteLink };
  };

  const updateMemberRole = async (memberId: string, newRole: TeamRole) => {
    const { error } = await supabase
      .from("team_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) return { error: error.message };

    const member = members.find(m => m.id === memberId);
    await logActivity("role_changed", "team_member", memberId, { 
      old_role: member?.role, 
      new_role: newRole 
    });
    await fetchTeamData();

    return { success: true };
  };

  const removeMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId);

    if (error) return { error: error.message };

    await logActivity("member_removed", "team_member", memberId, { 
      email: member?.email,
      role: member?.role 
    });
    await fetchTeamData();

    return { success: true };
  };

  const cancelInvite = async (inviteId: string) => {
    const invite = invites.find(i => i.id === inviteId);
    
    const { error } = await supabase
      .from("team_invites")
      .delete()
      .eq("id", inviteId);

    if (error) return { error: error.message };

    await logActivity("invite_cancelled", "team_invite", inviteId, { 
      email: invite?.email 
    });
    await fetchTeamData();

    return { success: true };
  };

  const logActivity = async (
    action: string, 
    resourceType: string | null, 
    resourceId: string | null, 
    details: Record<string, unknown> = {}
  ) => {
    if (!blogId) return;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("team_activity_log").insert([{
      blog_id: blogId,
      user_id: user?.id || null,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: details as unknown as null,
    }]);
  };

  return {
    members,
    invites,
    activities,
    loading,
    teamLimit,
    currentUserRole,
    canAddMember,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvite,
    logActivity,
    refresh: fetchTeamData,
  };
}
