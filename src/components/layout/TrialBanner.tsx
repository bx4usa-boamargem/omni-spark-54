import { Button } from "@/components/ui/button";
import { Clock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrialBannerProps {
  daysRemaining: number;
  onSubscribeClick: () => void;
}

export function TrialBanner({ daysRemaining, onSubscribeClick }: TrialBannerProps) {
  // Determine banner color based on days remaining
  const getBannerStyles = () => {
    if (daysRemaining <= 1) {
      return {
        bg: "bg-destructive/10 border-destructive/30",
        text: "text-destructive",
        icon: "text-destructive",
        urgency: daysRemaining === 0 ? "Último dia!" : "1 dia restante",
      };
    }
    if (daysRemaining <= 3) {
      return {
        bg: "bg-amber-500/10 border-amber-500/30",
        text: "text-amber-600 dark:text-amber-400",
        icon: "text-amber-500",
        urgency: `${daysRemaining} dias restantes`,
      };
    }
    return {
      bg: "bg-primary/5 border-primary/20",
      text: "text-foreground",
      icon: "text-primary",
      urgency: `${daysRemaining} dias restantes`,
    };
  };

  const styles = getBannerStyles();

  return (
    <div className={cn(
      "relative flex items-center justify-between gap-4 px-4 py-3 border-b",
      styles.bg
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("p-1.5 rounded-full", styles.bg)}>
          <Clock className={cn("h-4 w-4", styles.icon)} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={styles.text}>
            Período de teste gratuito: <strong>{styles.urgency}</strong>
          </span>
          <span className="hidden sm:inline text-muted-foreground">
            — Assine agora para não perder acesso
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onSubscribeClick}
          className="gap-2"
        >
          <Sparkles className="h-3 w-3" />
          Assinar plano
        </Button>
      </div>
    </div>
  );
}