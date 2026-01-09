import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Check, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

interface OpportunityCardProps {
  id: string;
  title: string;
  keywords?: string[];
  selected: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onArchive: () => void;
  disabled?: boolean;
}

export function OpportunityCard({
  id,
  title,
  keywords,
  selected,
  onToggle,
  onApprove,
  onArchive,
  disabled,
}: OpportunityCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 rounded-lg border transition-colors",
        selected && "border-primary bg-primary/5"
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
      <div className="p-2 rounded-lg bg-primary/10">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">
          Artigo sugerido por nossa{" "}
          <span className="text-primary cursor-pointer hover:underline">
            inteligência artificial
          </span>
        </p>
        {keywords && keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {keywords.slice(0, 3).map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onArchive}
          disabled={disabled}
        >
          <Archive className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          disabled={disabled}
        >
          <Check className="h-4 w-4 mr-1" />
          Aprovar
        </Button>
      </div>
    </div>
  );
}
