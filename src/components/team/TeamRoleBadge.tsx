import { Badge } from "@/components/ui/badge";
import { TeamRole } from "@/hooks/useTeam";
import { ROLE_LABELS } from "@/hooks/useTeamPermissions";
import { Crown, Shield, Edit3, Eye } from "lucide-react";

interface TeamRoleBadgeProps {
  role: TeamRole;
  showIcon?: boolean;
  size?: "sm" | "default";
}

const ROLE_STYLES: Record<TeamRole, { variant: "default" | "secondary" | "outline"; className: string }> = {
  owner: { variant: "default", className: "bg-amber-500/20 text-amber-600 border-amber-500/30 hover:bg-amber-500/30" },
  admin: { variant: "default", className: "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30" },
  editor: { variant: "secondary", className: "bg-blue-500/20 text-blue-600 border-blue-500/30 hover:bg-blue-500/30" },
  viewer: { variant: "outline", className: "bg-muted text-muted-foreground" },
};

const ROLE_ICONS: Record<TeamRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  editor: Edit3,
  viewer: Eye,
};

export function TeamRoleBadge({ role, showIcon = true, size = "default" }: TeamRoleBadgeProps) {
  const style = ROLE_STYLES[role];
  const Icon = ROLE_ICONS[role];

  return (
    <Badge
      variant={style.variant}
      className={`${style.className} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      {showIcon && <Icon className={`${size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} mr-1`} />}
      {ROLE_LABELS[role]}
    </Badge>
  );
}
