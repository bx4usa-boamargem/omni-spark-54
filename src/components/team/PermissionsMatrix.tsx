import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamRole } from "@/hooks/useTeam";
import { Permission, PERMISSION_LABELS, ROLE_LABELS, useTeamPermissions } from "@/hooks/useTeamPermissions";
import { Check, X, Lock } from "lucide-react";

export function PermissionsMatrix() {
  const { rolePermissions, getAllPermissions } = useTeamPermissions(null);

  const roles: TeamRole[] = ["owner", "admin", "editor", "viewer"];
  const permissions = getAllPermissions();

  const hasPermission = (role: TeamRole, permission: Permission): boolean => {
    return rolePermissions[role]?.includes(permission) || false;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Matriz de permissões
        </CardTitle>
        <CardDescription>
          Veja o que cada nível de acesso pode fazer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Permissão</TableHead>
                {roles.map((role) => (
                  <TableHead key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((permission) => (
                <TableRow key={permission}>
                  <TableCell className="font-medium">
                    {PERMISSION_LABELS[permission]}
                  </TableCell>
                  {roles.map((role) => (
                    <TableCell key={`${permission}-${role}`} className="text-center">
                      {hasPermission(role, permission) ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
