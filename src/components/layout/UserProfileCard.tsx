import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamRole } from "@/hooks/useTeam";

interface UserProfileCardProps {
  collapsed: boolean;
  role: TeamRole | null;
}

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

const ROLE_COLORS: Record<TeamRole, string> = {
  owner: "bg-primary/20 text-primary",
  admin: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  editor: "bg-green-500/20 text-green-600 dark:text-green-400",
  viewer: "bg-muted text-muted-foreground",
};

export function UserProfileCard({ collapsed, role }: UserProfileCardProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile({
        full_name: profileData?.full_name || null,
        avatar_url: profileData?.avatar_url || null,
        email: user.email || null,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = profile?.full_name || profile?.email?.split("@")[0] || "Usuário";
  const roleLabel = role ? ROLE_LABELS[role] : "";
  const roleColor = role ? ROLE_COLORS[role] : "";

  if (loading) {
    return (
      <div className={cn("p-4 border-b border-sidebar-border", collapsed && "p-2")}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-sidebar-accent shrink-0" />
          {!collapsed && (
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-sidebar-accent rounded w-3/4" />
              <div className="h-3 bg-sidebar-accent rounded w-1/2" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className="p-2 border-b border-sidebar-border cursor-pointer hover:bg-sidebar-accent/50 transition-colors flex justify-center"
            onClick={() => navigate("/app/profile")}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-1">
          <span className="font-medium">{displayName}</span>
          {role && <span className="text-xs text-muted-foreground">{roleLabel}</span>}
          <span className="text-xs text-primary">Ver perfil</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className="p-4 border-b border-sidebar-border cursor-pointer hover:bg-sidebar-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              {role && (
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 mt-1", roleColor)}>
                  {roleLabel}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => navigate("/app/profile")}>
          <User className="mr-2 h-4 w-4" />
          Meu Perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
