import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CollapsibleSectionProps {
  title: string;
  layer: 'essential' | 'guided' | 'advanced';
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  badge?: string;
  reassuringText?: string;
}

const LAYER_CONFIG = {
  essential: {
    defaultOpen: true,
    headerClass: "",
    label: "",
    badgeVariant: "default" as const,
  },
  guided: {
    defaultOpen: false,
    headerClass: "text-muted-foreground",
    label: "Opções adicionais",
    badgeVariant: "outline" as const,
  },
  advanced: {
    defaultOpen: false,
    headerClass: "text-muted-foreground",
    label: "Avançado (opcional)",
    badgeVariant: "secondary" as const,
  },
};

export function CollapsibleSection({
  title,
  layer,
  defaultOpen,
  children,
  className,
  badge,
  reassuringText,
}: CollapsibleSectionProps) {
  const config = LAYER_CONFIG[layer];
  const [isOpen, setIsOpen] = React.useState(defaultOpen ?? config.defaultOpen);

  // Essential layer is always visible, not collapsible
  if (layer === 'essential') {
    return (
      <div className={cn("space-y-4", className)}>
        {title && (
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{title}</h3>
            {badge && (
              <Badge variant="default" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
        )}
        {reassuringText && (
          <p className="text-xs text-muted-foreground">{reassuringText}</p>
        )}
        {children}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={cn("font-medium text-sm", config.headerClass)}>
            {title || config.label}
          </span>
          {badge && (
            <Badge variant={config.badgeVariant} className="text-xs">
              {badge}
            </Badge>
          )}
          {layer === 'advanced' && !badge && (
            <Badge variant="secondary" className="text-xs">
              Opcional
            </Badge>
          )}
        </div>
        {!isOpen && reassuringText && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {reassuringText}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 px-1">
        {isOpen && reassuringText && (
          <p className="text-xs text-muted-foreground mb-4 px-3">{reassuringText}</p>
        )}
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
