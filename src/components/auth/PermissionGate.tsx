import { ReactNode } from "react";
import { useCurrentUserRole } from "@/hooks/useCurrentUserRole";
import { Permission } from "@/hooks/useTeamPermissions";
import { Loader2 } from "lucide-react";

interface PermissionGateProps {
  permission: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, requires all permissions; if false, requires any
  showLoader?: boolean;
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
  requireAll = false,
  showLoader = false,
}: PermissionGateProps) {
  const { hasPermission, loading } = useCurrentUserRole();

  if (loading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loading) {
    return null;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasAccess = requireAll
    ? permissions.every(p => hasPermission(p))
    : permissions.some(p => hasPermission(p));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
