import { useState, ReactNode } from "react";
import { BlockEditToolbar } from "./BlockEditToolbar";
import { cn } from "@/lib/utils";

interface EditableBlockWrapperProps {
  children: ReactNode;
  blockType: string;
  isEditing: boolean;
  onAskAI?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  className?: string;
}

export function EditableBlockWrapper({
  children,
  blockType,
  isEditing,
  onAskAI,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  className,
}: EditableBlockWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!isEditing) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "relative group",
        isHovered && "ring-2 ring-primary/20 ring-offset-2 rounded-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BlockEditToolbar
        visible={isHovered}
        blockType={blockType}
        onAskAI={onAskAI}
        onDelete={onDelete}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
      />
      
      {/* Visual indicator when editing */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none rounded-lg border-2 border-dashed border-primary/30" />
      )}
      
      {children}
    </div>
  );
}
