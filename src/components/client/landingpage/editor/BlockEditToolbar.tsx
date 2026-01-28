import { Sparkles, ArrowUp, ArrowDown, Copy, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BlockEditToolbarProps {
  visible: boolean;
  blockType: string;
  onAskAI?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

export function BlockEditToolbar({
  visible,
  blockType,
  onAskAI,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className,
}: BlockEditToolbarProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute -top-12 left-1/2 -translate-x-1/2 z-50",
        "bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700",
        "p-1.5 flex items-center gap-1",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
    >
      {/* Drag handle */}
      <div className="px-1 cursor-grab text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Ask AI button */}
      {onAskAI && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onAskAI}
          className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Ask AI</span>
        </Button>
      )}

      <Separator orientation="vertical" className="h-6" />

      {/* Move buttons */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onMoveUp}
        disabled={!canMoveUp}
        className="h-7 w-7"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onMoveDown}
        disabled={!canMoveDown}
        className="h-7 w-7"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Duplicate */}
      {onDuplicate && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDuplicate}
          className="h-7 w-7"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Delete */}
      {onDelete && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDelete}
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Block type label */}
      <div className="px-2 text-[10px] text-muted-foreground uppercase tracking-wider">
        {blockType}
      </div>
    </div>
  );
}
