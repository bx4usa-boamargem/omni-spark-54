import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type IntegrationStatus = "active" | "inactive" | "coming_soon";

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor?: string;
  status: IntegrationStatus;
  onAction?: () => void;
  actionLabel?: string;
}

export function IntegrationCard({
  name,
  description,
  icon: Icon,
  iconBgColor,
  iconColor = "text-white",
  status,
  onAction,
  actionLabel,
}: IntegrationCardProps) {
  const { t } = useTranslation();

  const statusConfig = {
    active: {
      label: t("integrations.status.active"),
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    inactive: {
      label: t("integrations.status.inactive"),
      className: "bg-muted text-muted-foreground",
    },
    coming_soon: {
      label: t("integrations.status.comingSoon"),
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    },
  };

  const currentStatus = statusConfig[status];
  const isDisabled = status === "coming_soon";

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
              iconBgColor
            )}
          >
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              <Badge variant="secondary" className={cn("shrink-0", currentStatus.className)}>
                {currentStatus.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          </div>
        </div>
        {!isDisabled && onAction && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onAction}
              disabled={isDisabled}
            >
              {actionLabel || (status === "active" ? t("integrations.actions.edit") : t("integrations.actions.activate"))}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
